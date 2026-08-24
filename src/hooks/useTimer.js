import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';

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
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [dailyFocusFormatted, setDailyFocusFormatted] = useState('0h 0m');

  const timerRef = useRef(null);
  const pipWindowRef = useRef(null);

  const parseNum = (val, fallback) => {
    const num = parseInt(val, 10);
    return isNaN(num) || num <= 0 ? fallback : num;
  };

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
  const recordCompletedSession = useCallback((durationSec, type) => {
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
  }, [addFocusTime]);

const saveFinishedSessionToHistory = (sessionObj, completedTasks) => {
    try {
      // 1. Array-based history log
      const existingHistory = JSON.parse(localStorage.getItem('completed_sessions_history') || '[]');
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

      // 2. Calendar Activities grouped by date (YYYY-MM-DD)
      const todayKey = new Date().toISOString().split('T')[0];
      
      const singleFocusMins = parseNum(sessionObj.focusTime, 25);
      const rounds = parseNum(sessionObj.sessionCount, 1);
      
      const totalFocusMins = singleFocusMins * rounds;
      const focusHrs = Math.floor(totalFocusMins / 60);
      const focusRemMins = totalFocusMins % 60;

      // --- FORMAT MATCHING YOUR MOCK DATA ---
      let formattedDuration = '';
      if (focusHrs > 0) {
        const paddedMins = String(focusRemMins).padStart(2, '0');
        formattedDuration = `${focusHrs}h ${paddedMins}m`; // e.g., '1h 00m' or '1h 30m'
      } else {
        formattedDuration = `${focusRemMins}m`; // e.g., '45m' or '01m' if padded: `${String(focusRemMins).padStart(2, '0')}m`
      }

      // Capitalize activity name for consistency with mock data
      const rawName = sessionObj.workType || 'Reading';
      const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

      const newActivity = {
        name: formattedName,
        duration: formattedDuration,
        technique: sessionObj.techniqueName || 'Pomodoro',
      };

      // Instantly push to PlayerContext & localStorage
      if (addUserActivity) {
        addUserActivity(todayKey, newActivity);
      }
    } catch (err) {
      console.error('Failed to save session activity:', err);
    }
  };

  // 1. COUNTDOWN TICKER
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setRemainingTimeSec((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  // 2. PHASE SWITCHING & STATS RECORDING
  useEffect(() => {
    if (remainingTimeSec === 0 && !isTimerRunning && activeSession) {
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

          // Inflate total sessions count in PlayerContext
          if (incrementTotalSessions) {
            incrementTotalSessions(totalSessions);
          }

          localStorage.removeItem('activeSession');
          setActiveSession(null);
          setShowRewardModal(true);
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
    }
  };

  const closeRewardModal = () => setShowRewardModal(false);

  const toggleDocumentPiP = async (cardElement) => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      return;
    }

    if ('documentPictureInPicture' in window && cardElement) {
      try {
        const parent = cardElement.parentElement;
        const nextSib = cardElement.nextSibling;

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

        pipWin.document.body.className =
          'bg-[#FAE9CE] p-3 flex flex-col justify-center items-center h-full m-0 overflow-hidden';
        pipWin.document.body.appendChild(cardElement);

        pipWin.addEventListener('pagehide', () => {
          if (parent) {
            if (nextSib) parent.insertBefore(cardElement, nextSib);
            else parent.appendChild(cardElement);
          }
          pipWindowRef.current = null;
          setIsWidgetFloating(false);
        });

        setIsWidgetFloating(true);
      } catch (err) {
        console.error('PiP Error:', err);
        setIsWidgetFloating((prev) => !prev);
      }
    } else {
      setIsWidgetFloating((prev) => !prev);
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
    showRewardModal,
    dailyFocusFormatted,
    closeRewardModal,
    toggleTimer,
    toggleTaskCompletion,
    cancelSession,
    toggleDocumentPiP,
    toggleFullscreen,
  };
}

export default useTimer;