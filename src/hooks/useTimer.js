import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';

const TECHNIQUE_CONFIGS = {
  POMODORO: {
    gracePeriodMs: 3 * 60 * 1000,
    cooldownMs: 5 * 60 * 1000,
    maxCap: 2,
  },
  MEDIUM: {
    gracePeriodMs: 5 * 60 * 1000,
    cooldownMs: 10 * 60 * 1000,
    maxCap: 3,
  },
  ULTRADIAN: {
    gracePeriodMs: 10 * 60 * 1000,
    cooldownMs: 15 * 60 * 1000,
    maxCap: 4,
  },
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
  const [toastMessage, setToastMessage] = useState('');

  const sessionStartTimeRef = useRef(null);
  const timerRef = useRef(null);
  const pipWindowRef = useRef(null);
  const nudgeIntervalRef = useRef(null);

  const parseNum = (val, fallback) => {
    const num = parseInt(val, 10);
    return isNaN(num) || num <= 0 ? fallback : num;
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

  // Load active session from localStorage
  useEffect(() => {
    calculateDailyFocusText();

    const loadSession = () => {
      const savedSession = localStorage.getItem('activeSession');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          const focusMins = parseNum(session.focusTime, 25);
          const breakMins = parseNum(session.breakTime, 5);

          setActiveSession({
            ...session,
            focusTime: focusMins,
            breakTime: breakMins,
          });

          setTotalSessions(parseNum(session.sessionCount, 1));
          setRemainingTimeSec(focusMins * 60);
          setIsFocusPhase(true);
          setCurrentSessionCount(0);
          setIsTimerRunning(false);

          sessionStartTimeRef.current = Date.now();
          setNudgeCount(0);
          setIsIdle(false);
          setShowNudgeModal(false);
          setIsCooldownActive(false);

          setTasksList((session.tasks || []).map((t) => ({ text: t, completed: false })));
        } catch (e) {
          console.error('Failed to parse activeSession:', e);
        }
      } else {
        setActiveSession(null);
      }
    };

    loadSession();

    const handleMessage = (e) => {
      if (e.data === 'CLOSE_CREATE_SESSION_MODAL' || e.data === 'SESSION_CREATED') {
        loadSession();
      }
    };

    window.addEventListener('storage', loadSession);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('storage', loadSession);
      window.removeEventListener('message', handleMessage);
    };
  }, [calculateDailyFocusText]);

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
        workType: sessionObj.workType || 'General Work',
        techniqueName: sessionObj.techniqueName || 'Custom',
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

  // Helper to trigger Nudge Modal with active visual 30s countdown
  const triggerNudgeModal = useCallback(() => {
    setIsTimerRunning(false);
    setShowNudgeModal(true);
    setIsIdle(false);
    setNudgeCountdown(30);

    if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);

    nudgeIntervalRef.current = setInterval(() => {
      setNudgeCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(nudgeIntervalRef.current);
          setShowNudgeModal(false);
          setIsTimerRunning(false); // Pause focus session
          console.log(`[Focus Verification] Timed out at 0s. nudges_accepted: 0`);
          showRetroToast('Session paused due to inactivity.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // 1. COUNTDOWN TICKER & RELEASE TRIGGER 2
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setRemainingTimeSec((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);

            if (isIdle) {
              triggerNudgeModal();
            }

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, isIdle, triggerNudgeModal]);

  // 2. BOUNDARY-QUEUED IDLE VERIFICATION LOGIC
  useEffect(() => {
    if (!isTimerRunning || !activeSession || !isFocusPhase) {
      setIsIdle(false);
      return;
    }

    const config = getTechniqueConfig();
    const sessionElapsedMs = Date.now() - (sessionStartTimeRef.current || Date.now());

    if (sessionElapsedMs < config.gracePeriodMs) {
      return;
    }

    if (isCooldownActive || nudgeCount >= config.maxCap) {
      return;
    }

    let idleTimer;

    const handleUserActivity = () => {
      if (isIdle) {
        triggerNudgeModal();
      }

      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIsIdle(true);
      }, 120000);
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, [
    isTimerRunning,
    activeSession,
    isFocusPhase,
    isIdle,
    isCooldownActive,
    nudgeCount,
    getTechniqueConfig,
    triggerNudgeModal,
  ]);

  // Handler when user clicks "YES, I'M HERE" before timer reaches 0
  const handleConfirmNudge = useCallback(() => {
    if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);

    const config = getTechniqueConfig();

    setShowNudgeModal(false);
    console.log(`[Focus Verification] User confirmed presence. nudges_accepted: 1`);

    setNudgeCount((prev) => prev + 1);
    setIsTimerRunning(true);

    setIsCooldownActive(true);
    setTimeout(() => {
      setIsCooldownActive(false);
    }, config.cooldownMs);
  }, [getTechniqueConfig]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (nudgeIntervalRef.current) clearInterval(nudgeIntervalRef.current);
    };
  }, []);

  // 3. PHASE SWITCHING & STATS RECORDING
  useEffect(() => {
    if (remainingTimeSec === 0 && !isTimerRunning && activeSession && !showNudgeModal) {
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

          localStorage.removeItem('activeSession');
          setActiveSession(null);
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
  ]);

  const toggleTimer = () => setIsTimerRunning((prev) => !prev);

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
      setIsWidgetFloating(false);
      setIsWidgetFullscreen(false);
      setIsPipActive(false);

      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }
    }
  };

  const closeRewardModal = () => setShowRewardModal(false);

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
  };
}



export default useTimer;