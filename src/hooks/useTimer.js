import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';

const TIMER_STATE_KEY = 'timerState';
const TELEMETRY_KEY = 'nudgeTelemetry';

// How long the "Are you still here?" modal waits for a click before it closes
const NUDGE_COUNTDOWN_SEC = 30;

// FRD Section 2 / Table 2.1
//   gracePeriodMs    = no idle detection during the first N ms of a focus block
//   idleThresholdMs  = consecutive ms with no mouse / keyboard = "idle"
//   cooldownMs       = spacing after a nudge is RENDERED
//   maxCap           = max nudges per focus block
const TECHNIQUE_CONFIGS = {
  POMODORO: {
    gracePeriodMs: 3 * 60 * 1000,
    idleThresholdMs: 120 * 1000,
    cooldownMs: 5 * 60 * 1000,
    maxCap: 2,
  },
  MEDIUM: {
    gracePeriodMs: 5 * 60 * 1000,
    idleThresholdMs: 120 * 1000,
    cooldownMs: 10 * 60 * 1000,
    maxCap: 3,
  },
  ULTRADIAN: {
    gracePeriodMs: 10 * 60 * 1000,
    idleThresholdMs: 120 * 1000,
    cooldownMs: 15 * 60 * 1000,
    maxCap: 4,
  },
};

// DEMO ONLY: short timings so the nudge shows within seconds while recording.
// Turn on from the browser console BEFORE pressing Start:
//   localStorage.setItem('nudgeDemo', '1')      (turn off: localStorage.removeItem('nudgeDemo'))
const DEMO_CONFIG = {
  gracePeriodMs: 10 * 1000,
  idleThresholdMs: 10 * 1000,
  cooldownMs: 20 * 1000,
  maxCap: 2,
};

// DEVIATION FROM FRD SECTION 3 (document this in the thesis):
// The FRD holds the nudge in an invisible "Waiting Queue" until the next
// mouse/keyboard event or 00:00. Here the modal is shown the moment the idle
// threshold is reached (after the grace period). The timer pauses while the
// modal is open, so time spent away is never credited as focus time.
//
// The 30s countdown runs for EVERYONE (solo players and shared-room members):
//   - solo player / host-free session: the clock is already paused when the modal
//     opens, so when the countdown hits 0 the modal just closes and the timer
//     stays paused until the player presses resume.
//   - shared-room member: the clock follows the host, so at 0 the member is
//     self-paused and must press RESUME to re-sync with the host.

const parseNum = (val, fallback) => {
  const num = parseInt(val, 10);
  return isNaN(num) || num <= 0 ? fallback : num;
};

// One id per session so a saved timer is never applied to a different session
const sessionIdOf = (s) => (s ? String(s.createdAt || s.startedAt || '') : '');

// Seconds remaining until a wall-clock timestamp (ms)
const secondsLeftUntil = (endMs) => Math.max(0, Math.ceil((endMs - Date.now()) / 1000));

const readSavedTimerState = (sid) => {
  try {
    const raw = localStorage.getItem(TIMER_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.sid === sid ? parsed : null;
  } catch (e) {
    return null;
  }
};

// ---------------------------------------------------------------------------
// FRD Table 2.2 telemetry (kept per session, survives a page refresh)
// ---------------------------------------------------------------------------
const emptyTelemetry = () => ({
  idleEvents: 0, // times the 120s inactivity threshold was reached
  nudgesTriggered: 0, // modal renders
  nudgesAccepted: 0, // YES clicks
  idleStartTimestamp: null, // epoch ms when inactivity was registered
  nudgeRenderTimestamp: null, // epoch ms when the modal mounted
  latencyTotalMs: 0, // sum of render -> YES click times
});

const readSavedTelemetry = (sid) => {
  try {
    const raw = localStorage.getItem(TELEMETRY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.sid === sid ? { ...emptyTelemetry(), ...parsed } : null;
  } catch (e) {
    return null;
  }
};

// Maps the technique name to the study_technique ENUM in FRD Table 2.2
// ('POMODORO', 'MEDIUM_75_33', 'ULTRADIAN_90'). 52-17 and 75-33 are both "Medium".
const techniqueEnum = (name) => {
  const t = String(name || '').toUpperCase();
  if (t.includes('52') || t.includes('75') || t.includes('MEDIUM')) return 'MEDIUM_75_33';
  if (t.includes('90') || t.includes('ULTRADIAN')) return 'ULTRADIAN_90';
  return 'POMODORO';
};

export function useTimer() {
  const { addFocusTime, incrementTotalSessions, addUserActivity } = usePlayer() || {};
  const [activeSession, setActiveSession] = useState(null);
  const [remainingTimeSec, setRemainingTimeSec] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isFocusPhase, setIsFocusPhase] = useState(true);
  const [currentSessionCount, setCurrentSessionCount] = useState(0);
  const [totalSessions, setTotalSessions] = useState(1);
  const [tasksList, setTasksList] = useState([]);
  const [isWidgetFloating, setIsWidgetFloating] = useState(false);
  const [isWidgetFullscreen, setIsWidgetFullscreen] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [dailyFocusFormatted, setDailyFocusFormatted] = useState('0h 0m');

  // Nudge States
  const [isIdle, setIsIdle] = useState(false);
  const [showNudgeModal, setShowNudgeModal] = useState(false);
  const [nudgeCountdown, setNudgeCountdown] = useState(NUDGE_COUNTDOWN_SEC);
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const [nudgeCount, setNudgeCount] = useState(0);
  const [pausedSeconds, setPausedSeconds] = useState(0);
  const [isSelfPaused, setIsSelfPaused] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  const sharedMemberRef = useRef(false); // true for non-host players in a private-shared room
  const selfPausedRef = useRef(false);
  const selfPauseStartRef = useRef(null);

  const pipWindowRef = useRef(null);
  const nudgeIntervalRef = useRef(null);
  const cooldownTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const [nudgePauseCount, setNudgePauseCount] = useState(0);

  // The timer is driven by a wall-clock end time, NOT by counting ticks.
  // That is what keeps it correct when the tab is in the background or the
  // page was unmounted while the user visited another route.
  const phaseEndsAtRef = useRef(0);

  // When true, the idle "Are you still here?" nudge never pauses this player
  // (used for hosts of a shared room)
  const nudgeDisabledRef = useRef(false);

  const telemetryRef = useRef(emptyTelemetry());

  // Always-fresh copy of the latest state, readable from stable callbacks
  const liveRef = useRef({});
  liveRef.current = {
    activeSession,
    remainingTimeSec,
    isTimerRunning,
    isFocusPhase,
    currentSessionCount,
    totalSessions,
    tasksList,
    isIdle,
    nudgePauseCount,
    pausedSeconds,
  };

  const showRetroToast = useCallback((msg) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage('');
    }, 4000);
  }, []);

  const getTechniqueConfig = useCallback(() => {
    if (!activeSession) return TECHNIQUE_CONFIGS.POMODORO;

    // demo shortcut (see DEMO_CONFIG at the top)
    if (localStorage.getItem('nudgeDemo') === '1') return DEMO_CONFIG;

    const techName = (activeSession.techniqueName || '').toUpperCase();

    if (techName.includes('52') || techName.includes('75') || techName.includes('MEDIUM')) {
      return TECHNIQUE_CONFIGS.MEDIUM;
    }
    if (techName.includes('90') || techName.includes('ULTRADIAN')) {
      return TECHNIQUE_CONFIGS.ULTRADIAN;
    }
    return TECHNIQUE_CONFIGS.POMODORO;
  }, [activeSession]);

  // ---------------------------------------------------------------------------
  // TELEMETRY HELPERS
  // ---------------------------------------------------------------------------
  const updateTelemetry = useCallback((mutate) => {
    mutate(telemetryRef.current);
    try {
      localStorage.setItem(
        TELEMETRY_KEY,
        JSON.stringify({ sid: sessionIdOf(liveRef.current.activeSession), ...telemetryRef.current })
      );
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  const resetTelemetry = useCallback(() => {
    telemetryRef.current = emptyTelemetry();
    localStorage.removeItem(TELEMETRY_KEY);
  }, []);

  // What the frontend sends to the server when the session is saved
  const getNudgeTelemetry = useCallback(() => {
    const t = telemetryRef.current;
    const avgLatency = t.nudgesAccepted ? Math.round(t.latencyTotalMs / t.nudgesAccepted) : null;
    return {
      idleEvents: t.idleEvents,
      nudgesTriggered: t.nudgesTriggered,
      nudgesAccepted: t.nudgesAccepted,
      idleStartTimestamp: t.idleStartTimestamp,
      nudgeRenderTimestamp: t.nudgeRenderTimestamp,
      resumptionLatencyMs: avgLatency,
      returnSpeedMs: avgLatency, // return_speed: legacy field in Table 2.2
      studyTechnique: techniqueEnum(liveRef.current.activeSession?.techniqueName),
    };
  }, []);

  const calculateDailyFocusText = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastSavedDate = localStorage.getItem('tracker_date');

    if (lastSavedDate !== today) {
      localStorage.setItem('tracker_date', today);
      localStorage.setItem('daily_focus_seconds', '0');
      localStorage.setItem('daily_break_seconds', '0');
    }

    const dailySecs = parseNum(localStorage.getItem('daily_focus_seconds'), 0);
    const hrs = Math.floor(dailySecs / 3600);
    const mins = Math.floor((dailySecs % 3600) / 60);
    setDailyFocusFormatted(`${hrs}h ${mins}m`);
  }, []);

  // ---------------------------------------------------------------------------
  // CLOCK HELPERS
  // ---------------------------------------------------------------------------

  // Start (or resume) the countdown from `seconds`
  const startTimerClock = useCallback((seconds) => {
    const secs = Math.max(0, Math.floor(seconds));
    if (secs <= 0) return;
    phaseEndsAtRef.current = Date.now() + secs * 1000;
    setRemainingTimeSec(secs);
    setIsTimerRunning(true);
  }, []);

  // ---------------------------------------------------------------------------
  // SHARED-ROOM SYNC: snapshot of the host's timer
  // ---------------------------------------------------------------------------

  // What the host sends to the server after every pause / resume / phase change
  const getTimerSnapshot = useCallback(() => {
    const l = liveRef.current;
    return {
      isRunning: l.isTimerRunning,
      isFocusPhase: l.isFocusPhase,
      remainingSec: l.isTimerRunning ? secondsLeftUntil(phaseEndsAtRef.current) : l.remainingTimeSec,
      currentSessionCount: l.currentSessionCount,
    };
  }, []);

  const applySnapshotCore = useCallback(
    (snap, serverNow) => {
      if (!snap) return;

      // time that passed on the SERVER between the host's update and now
      // (both timestamps come from the server clock, so this is skew-proof)
      const drift =
        snap.isRunning && serverNow && snap.updatedAt
          ? Math.max(0, (Date.parse(serverNow) - Date.parse(snap.updatedAt)) / 1000)
          : 0;

      const remaining = Math.max(0, Math.round((Number(snap.remainingSec) || 0) - drift));

      // "Phase just hit 0 and stopped" is handled by each player's own timer
      if (!snap.isRunning && remaining <= 0) return;

      setIsFocusPhase(snap.isFocusPhase !== false);
      setCurrentSessionCount(Number(snap.currentSessionCount) || 0);

      if (snap.isRunning && remaining > 0) {
        startTimerClock(remaining);
      } else {
        setRemainingTimeSec(remaining);
        setIsTimerRunning(false);
      }
    },
    [startTimerClock]
  );

  // Called when the host's timer changes while a session is already running
  const applyTimerSnapshot = useCallback(
    (snap, serverNow) => {
      if (!liveRef.current.activeSession) return;
      if (selfPausedRef.current) return;
      applySnapshotCore(snap, serverNow);
    },
    [applySnapshotCore]
  );

  // Called when the host starts a shared session (or when a player (re)joins one)
  const startSyncedSession = useCallback(
    (s, timerState, serverNow) => {
      if (!s) return;
      const focusMins = parseNum(s.focusTime || s.durationMinutes || s.duration, 25);
      const breakMins = parseNum(s.breakTime, 5);

      const synced = {
        ...s,
        workType: s.workType || s.activity || 'Focus Session',
        techniqueName: s.techniqueName || s.technique || 'Pomodoro',
        focusTime: focusMins,
        breakTime: breakMins,
      };

      const prev = liveRef.current.activeSession;
      const sameSession = prev && sessionIdOf(prev) === sessionIdOf(s);

      localStorage.setItem('activeSession', JSON.stringify(synced));
      setActiveSession(synced);
      setTotalSessions(parseNum(s.sessionCount, 1));
      setIsIdle(false);
      setShowNudgeModal(false);
      setIsCooldownActive(false);

      // keep already-ticked tasks / nudge count if we're just re-syncing the same session
      if (!sameSession) {
        setNudgeCount(0);
        resetTelemetry();
        setTasksList(
          (s.tasks || []).map((t) => (typeof t === 'string' ? { text: t, completed: false } : t))
        );
        setCurrentSessionCount(0);
        setIsFocusPhase(true);
        setNudgePauseCount(0);
        setPausedSeconds(0);
        selfPausedRef.current = false;
        selfPauseStartRef.current = null;
        setIsSelfPaused(false);
      }

      const snapshot = timerState || {
        isRunning: true,
        isFocusPhase: true,
        remainingSec: focusMins * 60,
        currentSessionCount: 0,
        updatedAt: s.startedAt,
      };
      applySnapshotCore(snapshot, serverNow);
    },
    [applySnapshotCore, resetTelemetry]
  );

  // ---------------------------------------------------------------------------
  // LOAD / RESTORE the active session
  // ---------------------------------------------------------------------------
  useEffect(() => {
    calculateDailyFocusText();

    const loadSession = () => {
      const savedSession = localStorage.getItem('activeSession');
      if (!savedSession) {
        setActiveSession(null);
        return;
      }

      try {
        const session = JSON.parse(savedSession);
        const sid = sessionIdOf(session);

        // This exact session is already running in memory: don't touch the timer
        const current = liveRef.current.activeSession;
        if (current && sessionIdOf(current) === sid) return;

        const focusMins = parseNum(session.focusTime || session.duration || session.durationMinutes, 25);
        const breakMins = parseNum(session.breakTime, 5);

        // Was this session's timer saved before we left the page / refreshed?
        const saved = readSavedTimerState(sid);

        setActiveSession({
          ...session,
          workType: session.workType || session.activity || 'Focus Session',
          techniqueName: session.techniqueName || session.technique || 'Pomodoro',
          focusTime: focusMins,
          breakTime: breakMins,
        });

        // restore telemetry for this exact session (or start fresh)
        telemetryRef.current = readSavedTelemetry(sid) || emptyTelemetry();

        // restore the nudge count so refreshing / leaving the page can't reset the cap
        setNudgeCount(saved ? Number(saved.nudgeCount) || 0 : 0);
        setIsIdle(false);
        setShowNudgeModal(false);
        setIsCooldownActive(false);

        const defaultTasks = (session.tasks || []).map((t) =>
          typeof t === 'string' ? { text: t, completed: false } : t
        );

        if (saved) {
          let remaining = Number(saved.remainingSec) || 0;
          let running = false;

          if (saved.isRunning) {
            // time kept passing while we were away
            remaining = secondsLeftUntil(saved.phaseEndsAt);
            running = remaining > 0;
          }

          setIsFocusPhase(saved.isFocusPhase !== false);
          setCurrentSessionCount(Number(saved.currentSessionCount) || 0);
          setTotalSessions(parseNum(saved.totalSessions ?? session.sessionCount, 1));
          setTasksList(Array.isArray(saved.tasks) ? saved.tasks : defaultTasks);

          if (running) {
            startTimerClock(remaining);
          } else {
            setRemainingTimeSec(remaining); // 0 => phase-switch effect finishes the phase
            setIsTimerRunning(false);
          }
        } else {
          setTotalSessions(parseNum(session.sessionCount, 1));
          setRemainingTimeSec(focusMins * 60);
          setIsFocusPhase(true);
          setCurrentSessionCount(0);
          setIsTimerRunning(false);
          setTasksList(defaultTasks);
        }
      } catch (e) {
        console.error('Failed to parse activeSession:', e);
      }
    };

    loadSession();

    const handleMessage = (e) => {
      if (e.data === 'CLOSE_CREATE_SESSION_MODAL' || e.data === 'SESSION_CREATED') {
        loadSession();
      }
    };

    // only react to the session key (our own timerState writes must not reload it)
    const handleStorage = (e) => {
      if (e.key === 'activeSession' || e.key === null) loadSession();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('message', handleMessage);
    };
  }, [calculateDailyFocusText, startTimerClock]);

  // ---------------------------------------------------------------------------
  // PERSIST the timer so leaving the page (or refreshing) never loses it
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeSession) return;
    const l = liveRef.current;
    try {
      localStorage.setItem(
        TIMER_STATE_KEY,
        JSON.stringify({
          sid: sessionIdOf(activeSession),
          isFocusPhase,
          currentSessionCount,
          totalSessions,
          isRunning: isTimerRunning,
          phaseEndsAt: phaseEndsAtRef.current,
          remainingSec: isTimerRunning ? secondsLeftUntil(phaseEndsAtRef.current) : l.remainingTimeSec,
          tasks: tasksList,
          nudgeCount,
          savedAt: Date.now(),
        })
      );
    } catch (e) {
      console.error('Failed to persist timer state:', e);
    }
  }, [activeSession, isFocusPhase, currentSessionCount, totalSessions, isTimerRunning, tasksList, nudgeCount]);

  // Record focus/break duration
  const recordCompletedSession = useCallback(
    (durationSec, type) => {
      const today = new Date().toISOString().split('T')[0];
      const lastDate = localStorage.getItem('tracker_date');

      if (lastDate !== today) {
        localStorage.setItem('tracker_date', today);
        localStorage.setItem('daily_focus_seconds', '0');
        localStorage.setItem('daily_break_seconds', '0');
      }

      if (type === 'focus') {
        const dailyFocus = parseNum(localStorage.getItem('daily_focus_seconds'), 0);
        const newDailyFocus = dailyFocus + durationSec;

        localStorage.setItem('daily_focus_seconds', newDailyFocus.toString());

        if (addFocusTime) {
          addFocusTime(durationSec);
        }

        const hrs = Math.floor(newDailyFocus / 3600);
        const mins = Math.floor((newDailyFocus % 3600) / 60);
        setDailyFocusFormatted(`${hrs}h ${mins}m`);
      } else {
        const dailyBreak = parseNum(localStorage.getItem('daily_break_seconds'), 0);
        const totalBreak = parseNum(localStorage.getItem('total_break_seconds'), 0);

        localStorage.setItem('daily_break_seconds', (dailyBreak + durationSec).toString());
        localStorage.setItem('total_break_seconds', (totalBreak + durationSec).toString());
      }
    },
    [addFocusTime]
  );

  const saveFinishedSessionToHistory = (sessionObj, completedTasks) => {
    try {
      const existingHistory = JSON.parse(
        localStorage.getItem('completed_sessions_history') || '[]'
      );
      const finishedEntry = {
        id: Date.now(),
        workType: sessionObj.workType || sessionObj.activity || 'Focus Session',
        techniqueName: sessionObj.techniqueName || 'Pomodoro',
        focusTime: sessionObj.focusTime,
        breakTime: sessionObj.breakTime,
        sessionCount: sessionObj.sessionCount,
        completedTasks: completedTasks,
        finishedAt: new Date().toISOString(),
      };
      existingHistory.unshift(finishedEntry);
      localStorage.setItem('completed_sessions_history', JSON.stringify(existingHistory));

      const todayKey = new Date().toISOString().split('T')[0];
      const singleFocusMins = parseNum(sessionObj.focusTime, 25);
      const rounds = parseNum(sessionObj.sessionCount, 1);

      const totalFocusMins = singleFocusMins * rounds;
      const focusHrs = Math.floor(totalFocusMins / 60);
      const focusRemMins = totalFocusMins % 60;

      let formattedDuration = '';
      if (focusHrs > 0) {
        const paddedMins = String(focusRemMins).padStart(2, '0');
        formattedDuration = `${focusHrs}h ${paddedMins}m`;
      } else {
        formattedDuration = `${focusRemMins}m`;
      }

      const rawName = sessionObj.workType || 'Reading';
      const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

      const newActivity = {
        name: formattedName,
        duration: formattedDuration,
        technique: sessionObj.techniqueName || 'Pomodoro',
      };

      if (addUserActivity) {
        addUserActivity(todayKey, newActivity);
      }
    } catch (err) {
      console.error('Failed to save session activity:', err);
    }
  };

  const selfPause = useCallback(() => {
    setRemainingTimeSec(secondsLeftUntil(phaseEndsAtRef.current));
    setIsTimerRunning(false);
    selfPausedRef.current = true;
    setIsSelfPaused(true);
    // only focus time counts as "not consumed"
    selfPauseStartRef.current = liveRef.current.isFocusPhase ? Date.now() : null;
    setNudgePauseCount((c) => c + 1);
  }, []);

  // Called when the player presses RESUME. UserHomepage then asks the server for the host's timer.
  const beginResync = useCallback(() => {
    if (!selfPausedRef.current) return;
    if (selfPauseStartRef.current) {
      const secs = Math.round((Date.now() - selfPauseStartRef.current) / 1000);
      setPausedSeconds((p) => p + secs);
    }
    selfPauseStartRef.current = null;
    selfPausedRef.current = false;
    setIsSelfPaused(false);
  }, []);

  const getNudgePenalty = useCallback(() => {
    const l = liveRef.current;
    let secs = l.pausedSeconds || 0;
    if (selfPauseStartRef.current) secs += Math.round((Date.now() - selfPauseStartRef.current) / 1000);
    return { nudgePauses: l.nudgePauseCount || 0, pausedSeconds: secs };
  }, []);

  const resetNudgePenalty = useCallback(() => {
    setNudgePauseCount(0);
    setPausedSeconds(0);
  }, []);

  // Mounts the "Are you still here?" modal (FRD Section 1).
  // Called as soon as the idle threshold is reached (no waiting queue).
  const triggerNudgeModal = useCallback(() => {
    // count the nudge when it is SHOWN (not when it is confirmed),
    // so ignoring a nudge still uses up the cap
    setNudgeCount((c) => c + 1);
    updateTelemetry((t) => {
      t.nudgesTriggered += 1;
      t.nudgeRenderTimestamp = Date.now();
    });

    // FRD Section 2: the cooldown starts the moment a nudge is RENDERED
    setIsCooldownActive(true);
    if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
    cooldownTimeoutRef.current = setTimeout(
      () => setIsCooldownActive(false),
      getTechniqueConfig().cooldownMs
    );

    const isSharedMember = sharedMemberRef.current;

    // Pause the clock so the time you are away is not credited as focus time.
    // (Members of a shared room follow the host's clock, so theirs is not paused here.)
    if (!isSharedMember) {
      setRemainingTimeSec(secondsLeftUntil(phaseEndsAtRef.current));
      setIsTimerRunning(false);
    }

    // Reset the countdown BEFORE showing the modal, so the "reached 0" effect
    // below can never see a stale 0 from the previous nudge.
    setNudgeCountdown(NUDGE_COUNTDOWN_SEC);
    setShowNudgeModal(true);

    // The visible 30s countdown ALWAYS ticks (solo players and shared members).
    // It only decrements; what happens at 0 is handled by the effect below.
    if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);
    nudgeIntervalRef.current = setInterval(() => {
      setNudgeCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
  }, [updateTelemetry, getTechniqueConfig]);

  // When the 30s countdown reaches 0 and the user ignored the modal
  useEffect(() => {
    if (!showNudgeModal || nudgeCountdown > 0) return;

    if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);
    setShowNudgeModal(false);
    setIsIdle(false);

    if (sharedMemberRef.current) {
      // member of a shared room: stop only THIS player's clock; they resume by re-syncing to the host
      selfPause();
      showRetroToast('Your timer stopped. Press RESUME to sync back with the host.');
    } else {
      // solo player: the clock was already paused when the modal opened,
      // so just close the modal and leave the timer paused until they resume
      setIsTimerRunning(false);
      showRetroToast('Session paused due to inactivity. Press resume when you are back.');
    }
  }, [showNudgeModal, nudgeCountdown, selfPause, showRetroToast]);

  // 1. COUNTDOWN TICKER (wall-clock based, so background tabs / throttling can't slow it)
  useEffect(() => {
    if (!isTimerRunning) return undefined;

    const tick = () => {
      const left = secondsLeftUntil(phaseEndsAtRef.current);
      setRemainingTimeSec(left);
      if (left <= 0) {
        setIsTimerRunning(false);
      }
    };

    tick();
    const id = setInterval(tick, 500);
    // catch up instantly when the user comes back to this tab
    document.addEventListener('visibilitychange', tick);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [isTimerRunning]);

  // 2. IDLE VERIFICATION (FRD Section 2)
  //
  //   a) No idle detection during the grace period of the focus block.
  //   b) Once grace is over, 120s with no mouse / keyboard = idle.
  //      The idle clock only starts counting after the grace period ends,
  //      so the earliest nudge is (grace + 120s) after the focus block started.
  //   c) The "Are you still here?" modal is shown right away and the timer pauses
  //      until the user clicks YES. A nudge is never shown during cooldown or
  //      after the cap for this block has been reached.
  useEffect(() => {
    if (!isTimerRunning || !activeSession || !isFocusPhase) {
      setIsIdle(false);
      return undefined;
    }
    const config = getTechniqueConfig();
    if (isCooldownActive || nudgeCount >= config.maxCap) return undefined;

    const focusTotalSec = parseNum(activeSession.focusTime, 25) * 60;
    let idleTimer;

    // Grace is measured from the FOCUS time already elapsed in this block, so it
    // starts when the timer starts (not when the session was created) and pausing,
    // resuming or refreshing cannot reset it.
    const graceRemainingMs = () => {
      const elapsedMs = (focusTotalSec - secondsLeftUntil(phaseEndsAtRef.current)) * 1000;
      return Math.max(0, config.gracePeriodMs - elapsedMs);
    };

    const armIdleTimer = () => {
      clearTimeout(idleTimer);
      // fires 120s after the LATER of: the last activity, or the end of the grace period
      idleTimer = setTimeout(() => {
        if (nudgeDisabledRef.current) return; // shared-room hosts are never nudged
        setIsIdle(true); // FRD Section 3: is_idle = true
        updateTelemetry((t) => {
          t.idleEvents += 1;
          t.idleStartTimestamp = Date.now();
        });
        triggerNudgeModal(); // show now (no waiting queue)
      }, graceRemainingMs() + config.idleThresholdMs);
    };

    // any mouse / keyboard activity restarts the 120s idle clock
    const onActivity = () => {
      armIdleTimer();
    };

    armIdleTimer();
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, [
    isTimerRunning,
    activeSession,
    isFocusPhase,
    isCooldownActive,
    nudgeCount,
    getTechniqueConfig,
    triggerNudgeModal,
    updateTelemetry,
  ]);

  // Handler when user clicks "YES, I'M HERE"
  const handleConfirmNudge = useCallback(() => {
    if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);

    // FRD telemetry: nudges_accepted + resumption_latency (render -> YES click)
    updateTelemetry((t) => {
      t.nudgesAccepted += 1;
      if (t.nudgeRenderTimestamp) t.latencyTotalMs += Date.now() - t.nudgeRenderTimestamp;
    });

    setShowNudgeModal(false);
    setIsIdle(false);
    setNudgeCountdown(NUDGE_COUNTDOWN_SEC);

    if (!sharedMemberRef.current) {
      startTimerClock(liveRef.current.remainingTimeSec);
    }
    // (the cooldown already started when the modal was rendered)
  }, [startTimerClock, updateTelemetry]);

  // Cleanup intervals / timeouts on unmount
  useEffect(() => {
    return () => {
      if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // 3. PHASE SWITCHING & STATS RECORDING
  useEffect(() => {
    // `!showRewardModal` stops this from re-running after the last phase and
    // saving / counting the finished session more than once
    if (remainingTimeSec === 0 && !isTimerRunning && activeSession && !showNudgeModal && !showRewardModal) {
      const focusSecs = parseNum(activeSession.focusTime, 25) * 60;
      const breakSecs = parseNum(activeSession.breakTime, 5) * 60;

      if (isFocusPhase) {
        recordCompletedSession(focusSecs, 'focus');
        setIsFocusPhase(false);
        setRemainingTimeSec(breakSecs);
      } else {
        recordCompletedSession(breakSecs, 'break');
        const nextCount = currentSessionCount + 1;
        setCurrentSessionCount(nextCount);

        if (nextCount >= totalSessions) {
          saveFinishedSessionToHistory(activeSession, tasksList);

          if (incrementTotalSessions) {
            incrementTotalSessions(totalSessions);
          }

          setShowRewardModal(true);

          if (pipWindowRef.current && !pipWindowRef.current.closed) {
            pipWindowRef.current.close();
          }
        } else {
          // New focus block: FRD limits are per block, so the nudge cap and the
          // cooldown start fresh (the grace period is measured per block already)
          setNudgeCount(0);
          setIsCooldownActive(false);
          if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
          setIsFocusPhase(true);
          setRemainingTimeSec(focusSecs);
        }
      }
    }
  }, [
    remainingTimeSec,
    isTimerRunning,
    isFocusPhase,
    activeSession,
    currentSessionCount,
    totalSessions,
    recordCompletedSession,
    tasksList,
    incrementTotalSessions,
    showNudgeModal,
    showRewardModal,
  ]);

  // Pause / resume (solo players, or the host of a shared room)
  const toggleTimer = () => {
    const l = liveRef.current;
    if (l.isTimerRunning) {
      setRemainingTimeSec(secondsLeftUntil(phaseEndsAtRef.current));
      setIsTimerRunning(false);
    } else {
      if (l.remainingTimeSec <= 0) return;
      startTimerClock(l.remainingTimeSec);
    }
  };

  const toggleTaskCompletion = (index) => {
    setTasksList((prev) =>
      prev.map((task, i) => (i === index ? { ...task, completed: !task.completed } : task))
    );
  };

    // Step 1: the Cancel button only opens the modal
  const cancelSession = () => {
    if (!liveRef.current.activeSession) return;
    setShowCancelModal(true);
  };

  // Step 2: the modal's "YES, CANCEL" button does the real cancelling
  const confirmCancelSession = () => {
    setShowCancelModal(false);
    if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);
    setIsTimerRunning(false);
    setActiveSession(null);
    localStorage.removeItem('activeSession');
    localStorage.removeItem(TIMER_STATE_KEY);
    resetTelemetry();
    setShowNudgeModal(false);
    setIsWidgetFloating(false);
    setIsWidgetFullscreen(false);
    setIsPipActive(false);

    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
    }
  };

  // "KEEP STUDYING" just closes the modal
  const dismissCancelModal = () => setShowCancelModal(false);

  const closeRewardModal = () => {
    // Save the session details first so the Feedback Modal can still use them
    // (nudgeTelemetry goes along so it can be sent to /api/v1/sessions/complete)
    if (activeSession) {
      localStorage.setItem('completedSessionData', JSON.stringify({
        ...activeSession,
        tasks: tasksList,
        nudgeTelemetry: getNudgeTelemetry(),
      }));
    }
    setShowRewardModal(false);
    setActiveSession(null);
    localStorage.removeItem('activeSession');
    localStorage.removeItem(TIMER_STATE_KEY);
    resetTelemetry();
  };

  const triggerInstantComplete = () => {
    if (activeSession) {
      if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);
      setShowNudgeModal(false);
      setIsTimerRunning(false);
      localStorage.setItem('completedSessionData', JSON.stringify({
        ...activeSession,
        tasks: tasksList,
        nudgeTelemetry: getNudgeTelemetry(),
      }));
      saveFinishedSessionToHistory(activeSession, tasksList);
      if (incrementTotalSessions) {
        incrementTotalSessions(totalSessions);
      }
      setShowRewardModal(true);
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }
    }
  };

  // Sync state updates to open PiP window
  useEffect(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      const pipDoc = pipWindowRef.current.document;

      const timerDisplay = pipDoc.querySelector('[data-pip-element="timer-display"]');
      if (timerDisplay) {
        const mins = Math.floor(remainingTimeSec / 60);
        const secs = remainingTimeSec % 60;
        timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }

      const phaseText = pipDoc.querySelector('[data-pip-element="phase-text"]');
      if (phaseText) {
        phaseText.textContent = isFocusPhase ? 'FOCUS PHASE' : 'BREAK PHASE';
      }

      const guideText = pipDoc.querySelector('[data-pip-element="guide-text"]');
      if (guideText) {
        if (isTimerRunning) {
          guideText.textContent = 'Go back to the webpage to pause the timer.';
        } else if (!isFocusPhase) {
          guideText.textContent = "It's break time! Go back to the webpage to start the break timer.";
        } else {
          guideText.textContent = 'Go back to the webpage to start the focus timer.';
        }
      }
    }
  }, [remainingTimeSec, isTimerRunning, isFocusPhase]);

  const toggleDocumentPiP = async () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      setIsPipActive(false);
      return;
    }

    if (isWidgetFloating) {
      setIsWidgetFloating(false);
      return;
    }

    if ('documentPictureInPicture' in window && activeSession) {
      try {
        const pipWin = await window.documentPictureInPicture.requestWindow({
          width: 380,
          height: 320,
        });
        pipWindowRef.current = pipWin;

        [...document.styleSheets].forEach((sheet) => {
          try {
            const rules = [...sheet.cssRules].map((r) => r.cssText).join('');
            const style = document.createElement('style');
            style.textContent = rules;
            pipWin.document.head.appendChild(style);
          } catch (e) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            pipWin.document.head.appendChild(link);
          }
        });

        const focusMins = activeSession.focusTime || 25;
        const breakMins = activeSession.breakTime || 5;
        const workType = activeSession.workType || 'GENERAL WORK';
        const techniqueName = activeSession.techniqueName || 'Technique';

        const mins = Math.floor(remainingTimeSec / 60);
        const secs = remainingTimeSec % 60;
        const initialTimerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        const initialPhaseText = isFocusPhase ? 'FOCUS PHASE' : 'BREAK PHASE';

        let initialGuideText = 'Go back to the webpage to start the focus timer.';
        if (isTimerRunning) {
          initialGuideText = 'Go back to the webpage to pause the timer.';
        } else if (!isFocusPhase) {
          initialGuideText = "It's break time! Go back to the webpage to start the break timer.";
        }

        pipWin.document.body.className =
          'bg-theme-muted p-3 flex flex-col justify-center items-center h-full m-0 overflow-hidden font-sans';

        pipWin.document.body.innerHTML = `
          <div class="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 shadow-md flex flex-col justify-between gap-3 w-full h-full box-border">
            <div class="flex items-center justify-between pb-2 border-b border-theme-dark/20">
              <div class="flex items-center gap-2">
                <span class="font-pressstart text-[8px] text-theme-surface bg-theme-primary border border-theme-dark px-2 py-0.5 uppercase">
                  ${workType}
                </span>
                <span class="font-pressstart text-[8px] text-theme-dark opacity-80">
                  ${techniqueName}
                </span>
              </div>
            </div>

            <div class="flex flex-col items-center justify-center text-center my-1">
              <span data-pip-element="phase-text" class="font-pressstart text-[10px] text-theme-primary tracking-wider uppercase mb-1">
                ${initialPhaseText}
              </span>
              <div data-pip-element="timer-display" class="font-pressstart text-[36px] text-theme-dark tracking-tighter drop-shadow-sm">
                ${initialTimerText}
              </div>
            </div>

            <div class="bg-theme-muted border border-theme-dark/30 p-2 rounded text-center">
              <p data-pip-element="guide-text" class="font-pixel text-[13px] text-theme-dark leading-snug m-0">
                ${initialGuideText}
              </p>
            </div>

            <div class="grid grid-cols-3 gap-2 border-t border-theme-dark/20 pt-2 text-center">
              <div class="flex items-center justify-center gap-1">
                <span class="font-pressstart text-[9px] text-theme-dark">${focusMins}m</span>
                <span class="font-pixel text-[11px] text-theme-dark/60 uppercase">FOCUS</span>
              </div>
              <div class="flex items-center justify-center gap-1 border-x border-theme-dark/20 px-1">
                <span class="font-pressstart text-[9px] text-theme-dark">${breakMins}m</span>
                <span class="font-pixel text-[11px] text-theme-dark/60 uppercase">BREAK</span>
              </div>
              <div class="flex items-center justify-center gap-1">
                <span class="font-pressstart text-[9px] text-theme-dark">${currentSessionCount}/${totalSessions}</span>
                <span class="font-pixel text-[11px] text-theme-dark/60 uppercase">SESSIONS</span>
              </div>
            </div>
          </div>
        `;

        pipWin.addEventListener('pagehide', () => {
          pipWindowRef.current = null;
          setIsPipActive(false);
        });

        setIsPipActive(true);
        setIsWidgetFloating(false);
      } catch (err) {
        console.error('PiP unsupported/blocked. Fallback to floating widget:', err);
        setIsPipActive(false);
        setIsWidgetFloating(true);
      }
    } else {
      setIsPipActive(false);
      setIsWidgetFloating(true);
    }
  };

  const toggleFullscreen = () => setIsWidgetFullscreen((prev) => !prev);

  return {
    activeSession,
    remainingTimeSec,
    isTimerRunning,
    isFocusPhase,
    currentSessionCount,
    totalSessions,
    tasksList,
    isWidgetFloating,
    isWidgetFullscreen,
    isPipActive,
    showRewardModal,
    showNudgeModal,
    nudgeCountdown,
    toastMessage,
    dailyFocusFormatted,
    closeRewardModal,
    handleConfirmNudge,
    toggleTimer,
    toggleTaskCompletion,
    cancelSession,
    showCancelModal,
    confirmCancelSession,
    dismissCancelModal,
    toggleDocumentPiP,
    toggleFullscreen,
    triggerInstantComplete,
    // shared-room sync
    startSyncedSession,
    applyTimerSnapshot,
    getTimerSnapshot,
    nudgeDisabledRef,
    sharedMemberRef,
    // nudge / self-pause penalty
    isSelfPaused,
    nudgePauseCount,
    beginResync,
    getNudgePenalty,
    resetNudgePenalty,
    // FRD Table 2.2 telemetry
    getNudgeTelemetry,
  };
}

export default useTimer;