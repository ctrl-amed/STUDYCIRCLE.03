import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useOutletContext } from 'react-router-dom';

const activityIcons = {
  Reading: (
    <svg className="w-5 h-5 text-theme-dark" viewBox="0 0 2048 2048" fill="currentColor">
      <path d="M1920 256v1664H0V256h256V128h384q88 0 169 27t151 81q69-54 150-81t170-27h384v128zm-640 0q-70 0-136 23t-120 69v1254q59-33 124-49t132-17h256V256zM384 1536h256q67 0 132 16t124 50V348q-54-45-120-68t-136-24H384zm-256 256h806q-32-31-65-54t-68-40t-75-25t-86-9H256V384H128zM1792 384h-128v1280h-384q-46 0-85 8t-75 25t-69 40t-65 55h806z" />
    </svg>
  ),
  Writing: (
    <svg className="w-5 h-5 text-theme-dark" viewBox="-2 -2 24 24" fill="currentColor">
      <path d="m5.72 14.456l1.761-.508l10.603-10.73a.456.456 0 0 0-.003-.64l-.635-.642a.443.443 0 0 0-.632-.003L6.239 12.635zM18.703.664l.635.643c.876.887.884 2.318.016 3.196L8.428 15.561l-3.764 1.084a.9.9 0 0 1-1.11-.623.9.9 0 0 1-.002-.506l1.095-3.84L15.544.647a2.215 2.215 0 0 1 3.159.016zM7.184 1.817c.496 0 .898.407.898.909a.903.903 0 0 1-.898.909H3.592c-.992 0-1.796.814-1.796 1.817v10.906c0 1.004.804 1.818 1.796 1.818h10.776c.992 0 1.797-.814 1.797-1.818v-3.635c0-.502.402-.909.898-.909s.898.407.898.91v3.634c0 2.008-1.609 3.636-3.593 3.636H3.592C1.608 19.994 0 18.366 0 16.358V5.452c0-2.007 1.608-3.635 3.592-3.635z" />
    </svg>
  ),
  Review: (
    <svg className="w-5 h-5 text-theme-dark" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 14h1.625q.2 0 .388-.075t.337-.225l4.7-4.7q.225-.225.338-.513t.112-.562t-.125-.537t-.325-.488l-.9-.95q-.225-.225-.5-.337t-.575-.113q-.275 0-.562.113T11 5.95l-4.7 4.7q-.15.15-.225.338T6 11.375V13q0 .425.288.713T7 14m6-6.075L12.075 7zM7.5 12.5v-.95l2.525-2.525l.5.45l.45.5L8.45 12.5zm3.025-3.025l.45.5l-.95-.95zm.65 4.525H17q.425 0 .713-.288T18 13t-.288-.712T17 12h-3.825zM6 18l-2.3 2.3q-.475.475-1.088.213T2 19.575V4q0-.825.588-1.412T4 2h16q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm-.85-2H20V4H4v13.125zM4 16V4z" />
    </svg>
  ),
};

export function ActiveSessionWidget({
  activeSession,
  remainingTimeSec,
  isTimerRunning,
  isFocusPhase,
  currentSessionCount,
  totalSessions,
  toggleTimer,
  cancelSession,
  toggleDocumentPiP,
  toggleFullscreen,
  cardRef,
  isWidgetFloating,
  isWidgetFullscreen,
  showNudgeModal,
  nudgeCountdown = 30,
  handleConfirmNudge,
  toastMessage,
  streakDays = 0,
  focusTimeFormatted = '0h 0m',
}) {
  const context = useOutletContext();
  const dragPosRef = useRef({ isDragging: false, startX: 0, startY: 0, initialLeft: 0, initialTop: 0 });

  // Enable smooth dragging when widget is in floating mode
  useEffect(() => {
    const card = cardRef?.current;
    if (!card || !isWidgetFloating) return;

    const handleDragStart = (e) => {
      if (e.target.closest('button, input, label, a, svg')) return;

      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);

      const rect = card.getBoundingClientRect();
      dragPosRef.current = {
        isDragging: true,
        startX: clientX,
        startY: clientY,
        initialLeft: rect.left,
        initialTop: rect.top,
      };

      card.style.position = 'fixed';
      card.style.left = `${rect.left}px`;
      card.style.top = `${rect.top}px`;
      card.style.bottom = 'auto';
      card.style.right = 'auto';
      card.style.cursor = 'grabbing';
      card.style.userSelect = 'none';

      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleDragEnd);
    };

    const handleDragMove = (e) => {
      if (!dragPosRef.current.isDragging) return;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);

      const deltaX = clientX - dragPosRef.current.startX;
      const deltaY = clientY - dragPosRef.current.startY;

      let newX = dragPosRef.current.initialLeft + deltaX;
      let newY = dragPosRef.current.initialTop + deltaY;

      const maxX = window.innerWidth - card.offsetWidth;
      const maxY = window.innerHeight - card.offsetHeight;

      newX = Math.max(10, Math.min(newX, maxX - 10));
      newY = Math.max(10, Math.min(newY, maxY - 10));

      card.style.left = `${newX}px`;
      card.style.top = `${newY}px`;
    };

    const handleTouchMove = (e) => {
      if (!dragPosRef.current.isDragging) return;
      e.preventDefault();
      handleDragMove(e);
    };

    const handleDragEnd = () => {
      if (!dragPosRef.current.isDragging) return;
      dragPosRef.current.isDragging = false;
      if (card) {
        card.style.cursor = '';
        card.style.userSelect = '';
      }

      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleDragEnd);
    };

    card.addEventListener('mousedown', handleDragStart);
    card.addEventListener('touchstart', handleDragStart);

    return () => {
      card.removeEventListener('mousedown', handleDragStart);
      card.removeEventListener('touchstart', handleDragStart);
      handleDragEnd();
      if (card) {
        card.style.position = '';
        card.style.left = '';
        card.style.top = '';
        card.style.bottom = '';
        card.style.right = '';
        card.style.cursor = '';
        card.style.userSelect = '';
      }
    };
  }, [isWidgetFloating, cardRef]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!activeSession) {
    return (
<section className="card-highlight border-2 border-theme-dark rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col justify-between gap-4">
  <div className="flex flex-col gap-2">
    <h3 className="font-pressstart text-[20px] sm:text-[30px] text-theme-dark">READY TO FOCUS?</h3>
    <p className="font-pixel text-[20px] sm:text-[24px] text-theme-dark leading-snug">
      Select a task category and let StudyCircle recommend the right study technique for you.
    </p>
  </div>

  <div className="flex flex-wrap items-center justify-between gap-3 pt-12 sm:pt-15">
    <button
      type="button"
      onClick={() => context?.openCreateSessionModal?.()}
      className="inline-block font-pressstart text-[8px] sm:text-[10px] md:text-[12px] text-theme-white bg-theme-primary border-2 border-theme-dark px-3 py-2 md:px-4 md:py-2.5 transition-all duration-150 retro-shadow cursor-pointer text-center"
    >
      START SESSION
    </button>

    <div className="flex items-center gap-4 sm:gap-6">
      <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
        <span className="font-pixel text-[20px] sm:text-[24px] text-theme-dark/50 uppercase tracking-wider">Current Streak</span>
        <span className="font-pressstart text-[11px] sm:text-[13px] text-theme-primary">{streakDays} days</span>
      </div>

      <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
        <span className="font-pixel text-[20px] sm:text-[24px] text-theme-dark/50 uppercase tracking-wider">Today</span>
        <span className="font-pressstart text-[11px] sm:text-[13px] text-theme-primary">{focusTimeFormatted}</span>
      </div>
    </div>
  </div>
</section>
    );
  }

  const focusMins = activeSession.focusTime || 25;
  const breakMins = activeSession.breakTime || 5;

  let wrapperClasses =
    'bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col justify-between gap-4';

  if (isWidgetFullscreen) {
    wrapperClasses =
      'fixed inset-0 z-[9999] w-screen h-screen flex flex-col justify-between p-6 sm:p-12 bg-theme-muted overflow-y-auto';
  } else if (isWidgetFloating) {
    wrapperClasses = 'fixed bottom-5 right-5 w-80 sm:w-96 z-50 shadow-2xl bg-theme-surface border-2 border-theme-dark p-4 rounded-[12px] cursor-grab active:cursor-grabbing';
  }

  const progressPercent = Math.max(0, Math.min(100, (nudgeCountdown / 30) * 100));

  const content = (
    <>
      {/* RETRO TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[10001] bg-theme-surface border-3 border-theme-dark px-4 py-3 rounded-[8px] shadow-2xl flex items-center gap-3 animate-bounce-short">
          <span className="text-xl">⚠️</span>
          <span className="font-pressstart text-[9px] text-theme-danger uppercase">
            {toastMessage}
          </span>
        </div>
      )}

      <section ref={cardRef} className={wrapperClasses}>
        <div className="flex flex-col gap-3 h-full justify-between w-full max-w-3xl mx-auto">
          <div className="flex items-center justify-between pb-2 border-b border-theme-dark/20">
            <div className="flex items-center gap-2">
              <span className="font-pressstart text-[8px] sm:text-[9px] text-theme-surface bg-theme-primary border border-theme-dark px-2 py-0.5 uppercase">
                {activeSession.workType || 'GENERAL WORK'}
              </span>
              <span className="font-pressstart text-[8px] sm:text-[9px] text-theme-dark opacity-80">
                {activeSession.techniqueName || 'Technique'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleDocumentPiP}
                className="p-1 cursor-pointer text-theme-dark hover:text-theme-primary transition-colors"
                title="Pop-out Widget / Fallback Float"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 002 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1 cursor-pointer text-theme-dark hover:text-theme-primary transition-colors"
                title="Fullscreen"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>

              <button
                onClick={cancelSession}
                className="p-1 cursor-pointer text-theme-danger hover:text-theme-primary transition-colors"
                title="Cancel Session"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center my-2 text-center">
            <span className="font-pressstart text-[10px] sm:text-[14px] text-theme-primary tracking-wider uppercase mb-1">
              {isFocusPhase ? 'FOCUS PHASE' : 'BREAK PHASE'}
            </span>
            <div className="font-pressstart text-[36px] sm:text-[56px] text-theme-dark tracking-tighter drop-shadow-sm">
              {formatTime(remainingTimeSec)}
            </div>
          </div>

          <div>
            <button
              onClick={toggleTimer}
              className="w-full font-pressstart text-[11px] sm:text-[13px] text-theme-white bg-theme-primary border-2 border-theme-dark py-2.5 transition-all hover:bg-[#d0622c] cursor-pointer"
            >
              {isTimerRunning ? 'PAUSE' : isFocusPhase ? 'START FOCUS' : 'START BREAK'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-theme-dark/20 pt-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="font-pressstart text-[10px] sm:text-[13px] text-theme-dark">{focusMins}m</span>
              <span className="font-pixel text-[10px] sm:text-[15px] text-theme-dark/60 uppercase">FOCUS</span>
            </div>

            <div className="flex items-center justify-center gap-2 border-x border-theme-dark/20 px-1">
              <span className="font-pressstart text-[10px] sm:text-[13px] text-theme-dark">{breakMins}m</span>
              <span className="font-pixel text-[10px] sm:text-[15px] text-theme-dark/60 uppercase">BREAK</span>
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className="font-pressstart text-[10px] sm:text-[13px] text-theme-dark">
                {currentSessionCount}/{totalSessions}
              </span>
              <span className="font-pixel text-[10px] sm:text-[15px] text-theme-dark/60 uppercase">SESSIONS</span>
            </div>
          </div>
        </div>
      </section>

{/* FOCUS VERIFICATION NUDGE MODAL WITH REAL-TIME COUNTDOWN */}
{showNudgeModal && (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-theme-dark/60 backdrop-blur-xs">
    <div className="bg-theme-surface border-4 border-theme-dark rounded-[16px] w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-fade-in">
      
      {/* KITSU LOGO ICON */}
      <img
        src={`${baseUrl || '/'}media/kitsu_logo.png`}
        alt="Kitsu Logo"
        className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 animate-bounce-short"
        onError={(e) => {
          e.currentTarget.src = '/media/kitsu_logo.png';
        }}
      />

      <h3 className="font-pressstart text-[14px] text-theme-primary uppercase">
        ARE YOU STILL HERE?
      </h3>

      <p className="font-pixel text-[18px] text-theme-dark leading-snug">
        Just checking in - are you still focused on today’s goal?
      </p>

      {/* VISUAL REAL-TIME COUNTDOWN DISPLAY */}
      <div className="w-full flex flex-col items-center gap-1.5 my-1">
        <span className="font-pressstart text-[10px] text-theme-danger uppercase tracking-wider">
          CLOSING IN {nudgeCountdown}S
        </span>
        
        <div className="w-full bg-theme-muted border-2 border-theme-dark h-3.5 rounded-full overflow-hidden p-0.5">
          <div
            className="bg-theme-primary h-full rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <button
        onClick={handleConfirmNudge}
        className="w-full font-pressstart text-[10px] text-theme-white bg-theme-primary border-2 border-theme-dark py-2.5 hover:bg-[#d0622c] cursor-pointer shadow-sm uppercase transition-colors"
      >
        YES, I'M HERE
      </button>
    </div>
  </div>
)}
    </>
  );

  if (isWidgetFullscreen) {
    return ReactDOM.createPortal(content, document.body);
  }

  return content;
}

export function RecentActivityWidget({
  activeSession,
  tasksList,
  toggleTaskCompletion,
  recentActivities = [],
  onViewAll,
}) {
  if (activeSession) {
    const completedCount = tasksList.filter((t) => t.completed).length;

    return (
      <section className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b-2 border-theme-dark/20">
          <h3 className="font-pressstart text-[11px] sm:text-[13px] text-theme-dark uppercase">SESSION TASKS</h3>
          <span className="font-pressstart text-[9px] sm:text-[10px] text-theme-primary">
            {completedCount}/{tasksList.length} COMPLETED
          </span>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto max-h-[220px] pr-1">
          {tasksList.map((task, idx) => (
            <label
              key={idx}
              className="flex items-center gap-2.5 p-2 bg-theme-muted/60 border border-theme-dark/30 rounded-[6px] hover:bg-theme-muted cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTaskCompletion(idx)}
                className="w-4 h-4 accent-[#E87339] border-theme-dark rounded cursor-pointer shrink-0"
              />
              <span
                className={`font-pressstart text-[8px] sm:text-[9px] text-theme-dark break-words ${
                  task.completed ? 'line-through opacity-50' : ''
                }`}
              >
                {task.text}
              </span>
            </label>
          ))}
        </div>
      </section>
    );
  }

  let mergedActivities = [...recentActivities];

  try {
    const savedHistory = JSON.parse(localStorage.getItem('completed_sessions_history') || '[]');
    const todayStr = new Date().toISOString().split('T')[0];

    const userSavedItems = savedHistory.map((item) => {
      const focusMins = parseInt(item.focusTime || 25, 10);
      const rounds = parseInt(item.sessionCount || 1, 10);
      const totalMins = focusMins * rounds;

      const hrs = Math.floor(totalMins / 60);
      const remMins = totalMins % 60;
      let durationStr = `${remMins}m`;
      if (hrs > 0) {
        durationStr = `${hrs}h ${String(remMins).padStart(2, '0')}m`;
      }

      const finishDateStr = item.finishedAt ? item.finishedAt.split('T')[0] : todayStr;
      let dateDisplay = 'Today';
      if (finishDateStr !== todayStr) {
        const finishedDateObj = new Date(item.finishedAt);
        dateDisplay = finishedDateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }

      return {
        activity: item.workType || 'Reading',
        technique: item.techniqueName || 'Pomodoro',
        duration: durationStr,
        date: dateDisplay,
      };
    });

    mergedActivities = [...userSavedItems, ...recentActivities];
  } catch (err) {
    console.error('Error parsing session history for widget:', err);
  }

  return (
    <section className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2">
        <h3 className="font-pressstart text-[12px] sm:text-[14px] text-theme-dark">RECENT ACTIVITY</h3>
        <button
          onClick={onViewAll}
          className="text-theme-dark hover:text-theme-primary font-pressstart text-[8px] sm:text-[9px] px-2.5 py-1.5 rounded-[6px] transition-colors cursor-pointer"
        >
          VIEW ALL
        </button>
      </div>

      <div className="border-t-2 border-theme-dark/20" />

      <div className="flex flex-col gap-1 overflow-y-auto">
        {mergedActivities.slice(0, 3).map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2 rounded-[8px] transition-colors hover:bg-theme-muted/50"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-[6px] bg-theme-muted border-[1.5px] border-theme-dark flex items-center justify-center text-lg shrink-0">
                {activityIcons[item.activity] || activityIcons.Reading}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-pressstart text-[10px] sm:text-[15px] text-theme-dark truncate uppercase">{item.activity}</span>
                <span className="font-pixel text-[18px] sm:text-[20px] text-theme-dark/60 truncate mt-0.5">
                  {item.duration} | {item.technique}
                </span>
              </div>
            </div>

            <div className="shrink-0 pl-2">
              <span className="font-pixel text-[18px] sm:text-[20px] text-theme-dark/70 px-2 py-1 uppercase">{item.date}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}