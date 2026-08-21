import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer(playerData) {
  const [activeSession, setActiveSession] = useState(null);
  const [remainingTimeSec, setRemainingTimeSec] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isFocusPhase, setIsFocusPhase] = useState(true);
  const [currentSessionCount, setCurrentSessionCount] = useState(0);
  const [totalSessions, setTotalSessions] = useState(1);
  const [tasksList, setTasksList] = useState([]);
  const [isWidgetFloating, setIsWidgetFloating] = useState(false);
  const [isWidgetFullscreen, setIsWidgetFullscreen] = useState(false);

  const timerRef = useRef(null);
  const pipWindowRef = useRef(null);

  // Load session from localStorage on mount[cite: 36]
  useEffect(() => {
    const savedSession = localStorage.getItem('activeSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setActiveSession(session);
        setTotalSessions(parseInt(session.sessionCount, 10) || 1);
        const fSec = (parseInt(session.focusTime, 10) || 25) * 60;
        setRemainingTimeSec(fSec);
        setTasksList((session.tasks || []).map((t) => ({ text: t, completed: false })));
      } catch (e) {
        console.error('Failed to parse activeSession:', e);
      }
    }
  }, []);

  // Update Daily & Lifetime Stats in localStorage[cite: 36]
  const recordCompletedSession = useCallback((durationSec, type) => {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem('tracker_date');

    if (lastDate !== today) {
      localStorage.setItem('tracker_date', today);
      localStorage.setItem('daily_focus_seconds', '0');
      localStorage.setItem('daily_break_seconds', '0');
    }

    const dailyFocus = parseInt(localStorage.getItem('daily_focus_seconds') || '0', 10);
    const dailyBreak = parseInt(localStorage.getItem('daily_break_seconds') || '0', 10);
    const totalFocus = parseInt(localStorage.getItem('total_focus_seconds') || '0', 10);
    const totalBreak = parseInt(localStorage.getItem('total_break_seconds') || '0', 10);

    if (type === 'focus') {
      localStorage.setItem('daily_focus_seconds', (dailyFocus + durationSec).toString());
      localStorage.setItem('total_focus_seconds', (totalFocus + durationSec).toString());
    } else {
      localStorage.setItem('daily_break_seconds', (dailyBreak + durationSec).toString());
      localStorage.setItem('total_break_seconds', (totalBreak + durationSec).toString());
    }
  }, []);

  // Timer Tick Loop[cite: 36]
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setRemainingTimeSec((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);

            if (isFocusPhase) {
              const fSec = (parseInt(activeSession?.focusTime, 10) || 25) * 60;
              recordCompletedSession(fSec, 'focus');
              setIsFocusPhase(false);
              const bSec = (parseInt(activeSession?.breakTime, 10) || 5) * 60;
              return bSec;
            } else {
              const bSec = (parseInt(activeSession?.breakTime, 10) || 5) * 60;
              recordCompletedSession(bSec, 'break');
              setCurrentSessionCount((c) => c + 1);
              setIsFocusPhase(true);
              const fSec = (parseInt(activeSession?.focusTime, 10) || 25) * 60;
              return fSec;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, isFocusPhase, activeSession, recordCompletedSession]);

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

  // Document Picture-in-Picture Toggle[cite: 36]
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
    toggleTimer,
    toggleTaskCompletion,
    cancelSession,
    toggleDocumentPiP,
    toggleFullscreen,
  };
}