import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext'; // Import the PlayerContext hook
import { useTimer } from '../hooks/useTimer';
import { ActiveSessionWidget, RecentActivityWidget } from '../components/UserHomepageWidgets';

// --- MOCK DATA ---
const initialRecentActivities = [
  { activity: 'Reading', technique: '52-17', duration: '1h 45m', date: 'Today' },
  { activity: 'Writing', technique: 'Pomodoro', duration: '2h 15m', date: 'Today' },
  { activity: 'Review', technique: '90m Focus', duration: '45m', date: 'Yesterday' },
  { activity: 'Practice', technique: 'Pomodoro', duration: '1h 10m', date: 'Yesterday' },
  { activity: 'Memorize', technique: '52-17', duration: '30m', date: 'Aug 15, 2026' },
  { activity: 'Creation', technique: '90m Focus', duration: '1h 30m', date: 'Aug 12, 2026' },
];

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

const leaderboardData = {
  'all-time': [
    { rank: 1, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel1', username: 'PixelKing', score: '420h 15m' },
    { rank: 2, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Shadow', username: 'ACORN_HERO', score: '380h 40m' },
    { rank: 3, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Retro', username: 'RetroGamer', score: '310h 05m' },
    { rank: 4, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Byte', username: 'ByteWizard', score: '295h 50m' },
  ],
  'this-month': [
    { rank: 1, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Shadow', username: 'ACORN_HERO', score: '85h 20m' },
    { rank: 2, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel1', username: 'PixelKing', score: '72h 10m' },
    { rank: 3, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Cyber', username: 'CyberSamurai', score: '68h 45m' },
  ],
  streaks: [
    { rank: 1, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Byte', username: 'ByteWizard', streak: '142 d' },
    { rank: 2, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel1', username: 'PixelKing', streak: '98 d' },
    { rank: 3, pfp: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Retro', username: 'ACORN_HERO', streak: '75 d' },
  ],
};

const userActivities = {
  '2026-08-01': [
    { name: 'Reading', duration: '1h 00m', technique: 'Pomodoro' },
    { name: 'Practice', duration: '45m', technique: '52-17' },
  ],
  '2026-08-05': [{ name: 'Writing', duration: '2h 15m', technique: '90m' }],
  '2026-08-12': [{ name: 'Creation', duration: '1h 30m', technique: 'Pomodoro' }],
  '2026-08-15': [{ name: 'Memorize', duration: '30m', technique: '52-17' }],
  '2026-08-17': [
    { name: 'Review', duration: '45m', technique: 'Pomodoro' },
    { name: 'Practice', duration: '1h 10m', technique: '90m' },
  ],
  '2026-08-18': [
    { name: 'Reading', duration: '1h 45m', technique: '52-17' },
    { name: 'Writing', duration: '2h 15m', technique: '90m' },
  ],
};

export default function UserHomepage() {
  // Use PlayerContext to dynamically get live player details
  const { playerData } = usePlayer();

  // Safely fallback defaults in case context values are undefined
  const player = {
    username: playerData?.username || 'ACORN_HERO',
    streakDays: playerData?.streakDays ?? 0,
    level: playerData?.level ?? 1,
    coins: playerData?.coins ?? 0,
  };

  const timer = useTimer(player);
  const activeCardRef = useRef(null);

  // Dynamic Date Greeting
  const [greetingText, setGreetingText] = useState('Good Afternoon');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [dailyFocusFormatted, setDailyFocusFormatted] = useState('0h 0m');

  // Modal Visibility Controls
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Leaderboard Tab Selection
  const [activeTab, setActiveTab] = useState('all-time');

  // Calendar State & Touch Popover Control
  const [currentCalDate, setCurrentCalDate] = useState(new Date(2026, 7, 1));
  const [activePopoverDate, setActivePopoverDate] = useState(null);

  useEffect(() => {
    const now = new Date();
    const hours = now.getHours();
    let timeOfDay = 'Morning';
    if (hours >= 12 && hours < 17) timeOfDay = 'Afternoon';
    else if (hours >= 17) timeOfDay = 'Evening';

    setGreetingText(`Good ${timeOfDay}`);
    setCurrentDateStr(
      now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    );

    const today = now.toISOString().split('T')[0];
    const lastSavedDate = localStorage.getItem('tracker_date');
    if (lastSavedDate !== today) {
      localStorage.setItem('tracker_date', today);
      localStorage.setItem('daily_focus_seconds', '0');
    }
    const dailySecs = parseInt(localStorage.getItem('daily_focus_seconds') || '0', 10);
    const hrs = Math.floor(dailySecs / 3600);
    const mins = Math.floor((dailySecs % 3600) / 60);
    setDailyFocusFormatted(`${hrs}h ${mins}m`);
  }, []);

  // Dismiss popovers when clicking outside
  useEffect(() => {
    const handleDocumentClick = () => setActivePopoverDate(null);
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  const handlePrevMonth = () => {
    setCurrentCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Helper for Activity Item HTML inside lists
  const renderActivityItem = (item, idx) => {
    const iconSvg = activityIcons[item.activity] || activityIcons.Reading;
    return (
      <div
        key={idx}
        className="flex items-center justify-between p-2 rounded-[8px] transition-colors hover:bg-theme-muted/50"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-[6px] bg-theme-muted border-[1.5px] border-theme-dark flex items-center justify-center text-lg shrink-0">
            {iconSvg}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-pressstart text-[10px] text-theme-dark truncate uppercase">
              {item.activity}
            </span>
            <span className="font-pressstart text-[8px] text-theme-dark/60 truncate mt-0.5">
              {item.duration} | {item.technique}
            </span>
          </div>
        </div>
        <div className="shrink-0 pl-2">
          <span className="font-pixel text-[15px] text-theme-dark/70 px-2 py-1 uppercase">
            {item.date}
          </span>
        </div>
      </div>
    );
  };

  // Render Calendar Grid with Popover Indicators
  const renderCalendarDays = (isCompact = true) => {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(
        <div
          key={`empty-${i}`}
          className={isCompact ? 'h-full min-h-0' : 'min-h-[40px] sm:min-h-[48px]'}
        />
      );
    }

    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
      const formattedMonth = String(month + 1).padStart(2, '0');
      const formattedDay = String(day).padStart(2, '0');
      const dateKey = `${year}-${formattedMonth}-${formattedDay}`;

      const dayActivities = userActivities[dateKey] || [];
      const hasActivity = dayActivities.length > 0;
      const isToday =
        day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

      // Position logic for Popover
      const isTopRow = day + firstDayIndex <= 7;
      const colIndex = (day + firstDayIndex - 1) % 7;
      const isLeftEdge = colIndex <= 1;
      const isRightEdge = colIndex >= 5;

      const verticalPos = isTopRow ? 'top-full mt-2' : 'bottom-full mb-2';

      let horizontalPos = 'left-1/2 -translate-x-1/2';
      let arrowHorizontal = 'left-1/2 -translate-x-1/2';

      if (isLeftEdge) {
        horizontalPos = 'left-0 -translate-x-1 sm:translate-x-0';
        arrowHorizontal = 'left-4';
      } else if (isRightEdge) {
        horizontalPos = 'right-0 translate-x-1 sm:translate-x-0';
        arrowHorizontal = 'right-4';
      }

      const arrowVertical = isTopRow
        ? 'bottom-full border-b-4 border-b-theme-dark'
        : 'top-full border-t-4 border-t-theme-dark';

      const arrowPos = `${arrowVertical} ${arrowHorizontal} border-x-4 border-x-transparent`;
      const isPopoverActive = activePopoverDate === dateKey;

      cells.push(
        <div
          key={day}
          onClick={(e) => {
            if (hasActivity) {
              e.stopPropagation();
              setActivePopoverDate((prev) => (prev === dateKey ? null : dateKey));
            }
          }}
          className={`relative flex flex-col items-center justify-center p-1 rounded-[6px] transition-all cursor-pointer min-h-[40px] sm:min-h-[48px] group cal-day-cell ${
            isToday
              ? 'bg-theme-primary text-theme-surface border-[1.5px] border-theme-dark'
              : 'bg-theme-surface hover:bg-theme-muted text-theme-dark'
          } ${isPopoverActive ? 'z-50' : ''}`}
        >
          <span className={`font-pressstart text-[9px] sm:text-[11px] ${isToday ? 'text-theme-surface' : 'text-theme-dark'}`}>
            {day}
          </span>

          {hasActivity && (
            <span
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${
                isToday ? 'bg-theme-surface' : 'bg-theme-primary'
              } border-[1px] border-theme-dark rounded-full mt-1 shrink-0`}
            />
          )}

          {/* Activity Popover */}
          {hasActivity && (
            <div
              className={`cal-popover absolute ${verticalPos} ${horizontalPos} ${
                isPopoverActive ? 'flex' : 'hidden sm:group-hover:flex'
              } flex-col gap-1.5 w-40 sm:w-48 bg-theme-surface border-2 border-theme-dark rounded-[8px] p-2 shadow-xl z-50 pointer-events-none transition-all`}
            >
              {dayActivities.map((act, index) => {
                const isLast = index === dayActivities.length - 1;
                return (
                  <div
                    key={index}
                    className={`flex flex-col gap-0.5 ${
                      !isLast ? 'border-b border-theme-dark/20 pb-1.5' : ''
                    }`}
                  >
                    <span className="font-pressstart text-[8px] sm:text-[9px] text-theme-primary font-bold truncate">
                      {act.name}
                    </span>
                    <div className="flex items-center justify-between font-pressstart text-[6px] sm:text-[7px] text-theme-dark/80">
                      <span>{act.duration}</span>
                      <span className="bg-theme-dark/10 px-1 py-0.5 rounded text-theme-dark">
                        {act.technique}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className={`absolute ${arrowPos}`} />
            </div>
          )}
        </div>
      );
    }
    return cells;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <main className="relative flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex flex-col gap-5">
      {/* 1ST ROW: 2 COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
        {/* LEFT COLUMN: GREETING & AVATAR ROOM */}
        <section className="flex flex-col gap-2 sm:gap-4 p-2 sm:p-4">
          <div>
            <h2 className="font-pressstart text-[14px] sm:text-[18px] mb-1 level-up-gradient bg-clip-text text-transparent w-fit">
              {greetingText}, {player.username}
            </h2>
            <div className="flex items-center gap-2 font-pixel text-[20px] sm:text-[25px] text-theme-dark/80">
              <svg className="w-5 h-5 text-theme-primary shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 19H5V8h14m-3-7v2H8V1H6v2H5c-1.11 0-2 .89-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0-2-2V5a2 2 0 0 0-2-2h-1V1m-1 11h-5v5h5z" />
              </svg>
              <span>{currentDateStr} | Ready to focus?</span>
            </div>
          </div>

          <div className="relative w-full flex items-center justify-center rounded-[12px] bg-theme-surface border-2 border-theme-dark p-6 min-h-[300px]">
            <div className="text-center">
              <div className="bg-[#000000]/20 px-3 py-1 rounded mb-4 inline-block">
                <span className="font-pressstart text-[10px] text-[#FFFFFF] drop-shadow">
                  {player.username}
                </span>
              </div>
              <p className="font-pressstart text-xs text-theme-dark/60">
                [ Custom Room & Avatar Component ]
              </p>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: ACTIVE SESSION TIMER & RECENT ACTIVITY */}
        <div className="flex flex-col gap-5 w-full">
          <ActiveSessionWidget
            activeSession={timer.activeSession}
            remainingTimeSec={timer.remainingTimeSec}
            isTimerRunning={timer.isTimerRunning}
            isFocusPhase={timer.isFocusPhase}
            currentSessionCount={timer.currentSessionCount}
            totalSessions={timer.totalSessions}
            toggleTimer={timer.toggleTimer}
            cancelSession={timer.cancelSession}
            toggleDocumentPiP={timer.toggleDocumentPiP}
            toggleFullscreen={timer.toggleFullscreen}
            cardRef={activeCardRef}
            isWidgetFloating={timer.isWidgetFloating}
            isWidgetFullscreen={timer.isWidgetFullscreen}
            streakDays={player.streakDays}
            focusTimeFormatted={dailyFocusFormatted}
          />

          <RecentActivityWidget
            activeSession={timer.activeSession}
            tasksList={timer.tasksList}
            toggleTaskCompletion={timer.toggleTaskCompletion}
            recentActivities={initialRecentActivities}
            onViewAll={() => setShowRecentModal(true)}
          />
        </div>
      </div>

      {/* 2ND ROW: LEADERBOARD & CALENDAR */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 w-full">
        <section className="md:col-span-3 bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col gap-3">
          <h3 className="font-pressstart text-[11px] sm:text-[13px] text-theme-dark">OVERVIEW</h3>
          <div className="w-full h-full min-h-[120px] bg-theme-muted border-2 border-dashed border-theme-dark/50 rounded-[8px] p-4 flex items-center justify-center text-center">
            <span className="font-pressstart text-[9px] text-theme-dark/60">
              LVL {player.level} • {player.coins} COINS
            </span>
          </div>
        </section>

        {/* MIDDLE COLUMN: LEADERBOARD CARD */}
        <section className="md:col-span-4 bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b-[2px] border-theme-dark/20">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-theme-primary shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 21q-.425 0-.712-.288T2 20V10q0-.425.288-.712T3 9h3.5q.425 0 .713.288T7.5 10v10q0 .425-.288.713T6.5 21zm7.25 0q-.425 0-.712-.288T9.25 20V4q0-.425.288-.712T10.25 3h3.5q.425 0 .713.288T14.75 4v16q0 .425-.288.713T13.75 21zm7.25 0q-.425 0-.712-.288T16.5 20v-8q0-.425.288-.712T17.5 11H21q.425 0 .713.288T22 12v8q0 .425-.288.713T21 21z" />
              </svg>
              <h3 className="font-pressstart text-[11px] sm:text-[13px] text-theme-dark uppercase">
                Leaderboards
              </h3>
            </div>
            <button
              onClick={() => setShowLeaderboardModal(true)}
              className="p-1 hover:text-theme-primary cursor-pointer text-theme-dark transition-colors"
              title="View Full Leaderboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20H4v-5m0 5l6.5-6.5M15 4h5v5m0-5l-6.5 6.5" />
              </svg>
            </button>
          </div>

          <div className="flex gap-2 p-1">
            {['all-time', 'this-month', 'streaks'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 font-pressstart text-[8px] sm:text-[9px] rounded-none border-[1.5px] sm:border-2 border-theme-dark transition-all duration-150 retro-shadow cursor-pointer ${
                  activeTab === tab
                    ? 'bg-theme-primary text-[#FFFFF6]'
                    : 'bg-theme-muted text-theme-dark hover:bg-[#f3dcba]'
                }`}
              >
                {tab.replace('-', ' ').toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[300px] pr-1">
            {(leaderboardData[activeTab] || []).map((item) => {
              const isCurrentUser = item.username === player.username;
              return (
                <div
                  key={item.rank}
                  className={`flex items-center justify-between p-2 rounded-[8px] ${
                    isCurrentUser
                      ? 'bg-[#C97845]/50 border-[1.5px] border-theme-dark'
                      : 'bg-theme-muted/40 border-[1.5px] border-theme-dark/20 hover:bg-theme-muted'
                  } transition-colors`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`font-pressstart text-[10px] w-5 text-center ${
                        item.rank <= 3 ? 'text-theme-primary font-bold' : 'text-theme-dark/60'
                      }`}
                    >
                      #{item.rank}
                    </span>
                    <img
                      src={item.pfp}
                      alt={item.username}
                      className="w-7 h-7 rounded-[4px] border border-theme-dark bg-theme-surface shrink-0"
                    />
                    <span className="font-pressstart text-[9px] text-theme-dark truncate">
                      {item.username} {isCurrentUser && <span className="text-[7px] text-theme-primary">(YOU)</span>}
                    </span>
                  </div>
                  <span className="font-pressstart text-[9px] text-theme-dark">
                    {item.score || item.streak}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* RIGHT COLUMN: CALENDAR CARD */}
        <section className="md:col-span-5 bg-theme-surface border-2 border-theme-dark rounded-[12px] p-3 sm:p-4 shadow-md flex flex-col gap-2.5 relative">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-theme-dark/20">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-theme-dark shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-pressstart text-[10px] sm:text-[12px] text-theme-dark truncate">
                {monthNames[currentCalDate.getMonth()]} {currentCalDate.getFullYear()}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowCalendarModal(true)}
                className="p-1 sm:p-1.5 rounded-[6px] text-theme-dark hover:bg-theme-muted hover:text-theme-primary transition-all cursor-pointer"
                title="Full Screen"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20H4v-5m0 5l6.5-6.5M15 4h5v5m0-5l-6.5 6.5" />
                </svg>
              </button>

              <div className="flex items-center gap-1">
                <button onClick={handlePrevMonth} className="p-1 sm:p-1.5 rounded-[4px] text-theme-dark hover:bg-theme-muted transition-colors cursor-pointer">
                  ◀
                </button>
                <button onClick={handleNextMonth} className="p-1 sm:p-1.5 rounded-[4px] text-theme-dark hover:bg-theme-muted transition-colors cursor-pointer">
                  ▶
                </button>
              </div>
            </div>
          </div>

          <div className="w-full flex-1 flex flex-col justify-between p-2 sm:p-3 overflow-hidden">
            <div className="grid grid-cols-7 gap-1 text-center font-pressstart text-[7.5px] sm:text-[9px] text-theme-dark/70 pb-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 pt-1.5 flex-1 auto-rows-fr h-full">
              {renderCalendarDays(true)}
            </div>
          </div>
        </section>
      </div>

      {/* ==================== RECENT ACTIVITIES ALL-IN-ONE MODAL ==================== */}
      {showRecentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50 backdrop-blur-xs">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] w-full max-w-lg p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between pb-2 border-b-[2px] border-theme-dark/20">
              <h3 className="font-pressstart text-[13px] sm:text-[15px] text-theme-dark">
                ALL RECENT ACTIVITY
              </h3>
              <button
                onClick={() => setShowRecentModal(false)}
                className="text-theme-dark hover:text-theme-primary p-1 cursor-pointer transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* FULL ACTIVITY LIST CONTAINER */}
            <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 max-h-[60vh]">
              {initialRecentActivities.map((item, idx) => renderActivityItem(item, idx))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== FULLSCREEN LEADERBOARD MODAL ==================== */}
      {showLeaderboardModal && (
        <div className="fixed inset-0 bg-theme-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-4 sm:p-6 w-full max-w-2xl max-h-[85vh] flex flex-col gap-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b-[2px] border-theme-dark/20">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-theme-primary shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 21q-.425 0-.712-.288T2 20V10q0-.425.288-.712T3 9h3.5q.425 0 .713.288T7.5 10v10q0 .425-.288.713T6.5 21zm7.25 0q-.425 0-.712-.288T9.25 20V4q0-.425.288-.712T10.25 3h3.5q.425 0 .713.288T14.75 4v16q0 .425-.288.713T13.75 21zm7.25 0q-.425 0-.712-.288T16.5 20v-8q0-.425.288-.712T17.5 11H21q.425 0 .713.288T22 12v8q0 .425-.288.713T21 21z" />
                </svg>
                <h3 className="font-pressstart text-[13px] sm:text-[15px] text-theme-dark uppercase">
                  Full Leaderboard
                </h3>
              </div>
              <button
                onClick={() => setShowLeaderboardModal(false)}
                className="text-theme-dark hover:text-theme-primary p-1 cursor-pointer transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex gap-2 p-1">
              {['all-time', 'this-month', 'streaks'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 font-pressstart text-[9px] rounded-none border-[1.5px] sm:border-2 border-theme-dark transition-all duration-150 retro-shadow cursor-pointer ${
                    activeTab === tab
                      ? 'bg-theme-primary text-theme-surface'
                      : 'bg-theme-muted text-theme-dark hover:bg-[#f3dcba]'
                  }`}
                >
                  {tab.replace('-', ' ').toUpperCase()}
                </button>
              ))}
            </div>

            {/* Modal Full List */}
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[60vh] pr-2">
              {(leaderboardData[activeTab] || []).map((item) => {
                const isCurrentUser = item.username === player.username;
                return (
                  <div
                    key={item.rank}
                    className={`flex items-center justify-between p-2 rounded-[8px] ${
                      isCurrentUser
                        ? 'bg-[#C97845]/50 border-[1.5px] border-theme-dark'
                        : 'bg-theme-muted/40 border-[1.5px] border-theme-dark/20 hover:bg-theme-muted'
                    } transition-colors`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-pressstart text-[10px] w-5 text-center text-theme-dark">
                        #{item.rank}
                      </span>
                      <img
                        src={item.pfp}
                        alt={item.username}
                        className="w-7 h-7 rounded-[4px] border border-theme-dark bg-theme-surface shrink-0"
                      />
                      <span className="font-pressstart text-[9px] text-theme-dark truncate">
                        {item.username} {isCurrentUser && <span className="text-[7px] text-theme-primary">(YOU)</span>}
                      </span>
                    </div>
                    <span className="font-pressstart text-[9px] text-theme-dark">
                      {item.score || item.streak}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== FULLSCREEN CALENDAR OVERLAY ==================== */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-theme-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 transition-all duration-300">
          <div className="w-full max-w-2xl h-[75vh] bg-theme-surface border-2 border-theme-dark rounded-[12px] shadow-2xl flex flex-col p-3 sm:p-4 gap-2">
            <div className="flex items-center justify-between gap-2 pb-2 shrink-0 border-b border-theme-dark/20">
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-5 h-5 text-theme-dark shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-pressstart text-[11px] sm:text-[13px] text-theme-dark truncate">
                  {monthNames[currentCalDate.getMonth()]} {currentCalDate.getFullYear()}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="p-1 rounded-[6px] text-theme-dark hover:bg-theme-muted hover:text-theme-primary transition-all cursor-pointer"
                  title="Minimize Modal"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="m10 15.4l-5.9 5.9q-.275.275-.7.275t-.275-.7t.275-.7L8.6 14H5q-.425 0-.712-.288T4 13t.288-.712T5 12h6q.425 0 .713.288T12 13v6q0 .425-.288.713T11 20t-.712-.288T10 19zm5.4-5.4H19q.425 0 .713.288T20 11t-.288.713T19 12h-6q-.425 0-.712-.288T12 11V5q0-.425.288-.712T13 4t.713.288T14 5v3.6l5.9-5.9q.275-.275.7-.275t.7.275t.275.7t-.275.7z" />
                  </svg>
                </button>

                <div className="flex items-center gap-1">
                  <button onClick={handlePrevMonth} className="p-1 rounded-[4px] text-theme-dark hover:bg-theme-muted transition-colors cursor-pointer">
                    ◀
                  </button>
                  <button onClick={handleNextMonth} className="p-1 rounded-[4px] text-theme-dark hover:bg-theme-muted transition-colors cursor-pointer">
                    ▶
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full flex-1 flex flex-col justify-between p-2 overflow-y-auto">
              <div className="grid grid-cols-7 gap-1 text-center font-pressstart text-[9px] sm:text-[11px] text-theme-dark/70 pb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 pt-1 flex-1 auto-rows-fr">
                {renderCalendarDays(false)}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}