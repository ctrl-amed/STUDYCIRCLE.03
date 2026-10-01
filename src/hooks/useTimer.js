import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';

const TIMER_STATE_KEY = 'timerState';

const TECHNIQUE_CONFIGS = {
  POMODORO: {
    gracePeriodMs: 3 * 60 * 1000, // 3 minutes grace period
    cooldownMs: 5 * 60 * 1000,
    maxCap: 2,
  },
  MEDIUM: {
    gracePeriodMs: 5 * 60 * 1000, // 5 minutes grace period
    cooldownMs: 10 * 60 * 1000,
    maxCap: 3,
  },
  ULTRADIAN: {
    gracePeriodMs: 10 * 60 * 1000, // 10 minutes grace period
    cooldownMs: 15 * 60 * 1000,
    maxCap: 4,
  },
};

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
  const [nudgeCountdown, setNudgeCountdown] = useState(30);
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const [nudgeCount, setNudgeCount] = useState(0);
  const [pausedSeconds, setPausedSeconds] = useState(0);
  const [isSelfPaused, setIsSelfPaused] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const sharedMemberRef = useRef(false); // true for non-host players in a private-shared room
  const selfPausedRef = useRef(false);
  const selfPauseStartRef = useRef(null);

  const sessionStartTimeRef = useRef(null);
  const pipWindowRef = useRef(null);
  const nudgeIntervalRef = useRef(null);
  const [nudgePauseCount, setNudgePauseCount] = useState(0);

  // The timer is driven by a wall-clock end time, NOT by counting ticks.
  // That is what keeps it correct when the tab is in the background or the
  // page was unmounted while the user visited another route.
  const phaseEndsAtRef = useRef(0);

  // When true, the idle "Are you still here?" nudge never pauses this player
  // (used for members of a host-controlled shared room)
  const nudgeDisabledRef = useRef(false);

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

  const showRetroToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  const getTechniqueConfig = useCallback(() => {
    if (!activeSession) return TECHNIQUE_CONFIGS.POMODORO;
    const techName = (activeSession.techniqueName || '').toUpperCase();

    if (techName.includes('52') || techName.includes('75') || techName.includes('MEDIUM')) {
      return TECHNIQUE_CONFIGS.MEDIUM;
    }
    if (techName.includes('90') || techName.includes('ULTRADIAN')) {
      return TECHNIQUE_CONFIGS.ULTRADIAN;
    }
    return TECHNIQUE_CONFIGS.POMODORO;
  }, [activeSession]);

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
      sessionStartTimeRef.current = Date.now();
      setIsIdle(false);
      setShowNudgeModal(false);
      setIsCooldownActive(false);

      // keep already-ticked tasks / nudge count if we're just re-syncing the same session
      if (!sameSession) {
        setNudgeCount(0);
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
    [applySnapshotCore]
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

        sessionStartTimeRef.current = Date.now();
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

  // Helper to trigger Nudge Modal with active visual 30s countdown
  const triggerNudgeModal = useCallback(() => {
    // count the nudge when it is SHOWN (not when it is confirmed),
    // so ignoring a nudge still uses up the cap
    setNudgeCount((c) => c + 1);

    const isSharedMember = sharedMemberRef.current;

    if (!isSharedMember) {
      setRemainingTimeSec(secondsLeftUntil(phaseEndsAtRef.current));
      setIsTimerRunning(false);
    }
    setShowNudgeModal(true);
    setIsIdle(false);
    setNudgeCountdown(30);

    if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);

    nudgeIntervalRef.current = setInterval(() => {
      setNudgeCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(nudgeIntervalRef.current);
          setShowNudgeModal(false);
          if (sharedMemberRef.current) {
            selfPause();
            showRetroToast('Your timer stopped. Press RESUME to sync back with the host.');
          } else {
            setIsTimerRunning(false);
            showRetroToast('Session paused due to inactivity.');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [selfPause]);

  // 1. COUNTDOWN TICKER (wall-clock based, so background tabs / throttling can't slow it)
  useEffect(() => {
    if (!isTimerRunning) return undefined;

    const tick = () => {
      const left = secondsLeftUntil(phaseEndsAtRef.current);
      setRemainingTimeSec(left);
      if (left <= 0) {
        setIsTimerRunning(false);
        if (liveRef.current.isIdle) {
          triggerNudgeModal();
        }
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
  }, [isTimerRunning, triggerNudgeModal]);

  // 2. BOUNDARY-QUEUED IDLE VERIFICATION LOGIC
  useEffect(() => {
    if (!isTimerRunning || !activeSession || !isFocusPhase) {
      setIsIdle(false);
      return;
    }
    const config = getTechniqueConfig();
    if (isCooldownActive || nudgeCount >= config.maxCap) return;
    let idleTimer;
    const startIdleTimer = () => {
      clearTimeout(idleTimer);
      const graceLeft = Math.max(
        0,
        config.gracePeriodMs - (Date.now() - (sessionStartTimeRef.current || Date.now()))
      );
      idleTimer = setTimeout(() => {
        if (nudgeDisabledRef.current) return; // shared-room hosts are never nudged
        setIsIdle(true);
        triggerNudgeModal();
      }, Math.max(120000, graceLeft));
    };
    startIdleTimer();
    window.addEventListener('mousemove', startIdleTimer);
    window.addEventListener('keydown', startIdleTimer);
    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('mousemove', startIdleTimer);
      window.removeEventListener('keydown', startIdleTimer);
    };
  }, [isTimerRunning, activeSession, isFocusPhase, isCooldownActive, nudgeCount, getTechniqueConfig, triggerNudgeModal]);

  // Handler when user clicks "YES, I'M HERE" before timer reaches 0
  const handleConfirmNudge = useCallback(() => {
    if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);
    const config = getTechniqueConfig();

    setShowNudgeModal(false);

    if (!sharedMemberRef.current) {
      startTimerClock(liveRef.current.remainingTimeSec);
    }

    setIsCooldownActive(true);
    setTimeout(() => setIsCooldownActive(false), config.cooldownMs);
  }, [getTechniqueConfig, startTimerClock]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);
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

  const cancelSession = () => {
    if (window.confirm('Are you sure you want to cancel the active session?')) {
      setIsTimerRunning(false);
      setActiveSession(null);
      localStorage.removeItem('activeSession');
      localStorage.removeItem(TIMER_STATE_KEY);
      setIsWidgetFloating(false);
      setIsWidgetFullscreen(false);
      setIsPipActive(false);

      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }
    }
  };

  const closeRewardModal = () => {
    // Save the session details first so the Feedback Modal can still use them
    if (activeSession) {
      localStorage.setItem('completedSessionData', JSON.stringify({
        ...activeSession,
        tasks: tasksList
      }));
    }
    setShowRewardModal(false);
    setActiveSession(null);
    localStorage.removeItem('activeSession');
    localStorage.removeItem(TIMER_STATE_KEY);
  };

  const triggerInstantComplete = () => {
    if (activeSession) {
      setIsTimerRunning(false);
      localStorage.setItem('completedSessionData', JSON.stringify({
        ...activeSession,
        tasks: tasksList
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
  };
}

export default useTimer;