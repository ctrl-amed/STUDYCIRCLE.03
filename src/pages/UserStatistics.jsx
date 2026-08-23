import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';

export default function UserStatistics() {
  const { playerData } = usePlayer();

  const [focusTime, setFocusTime] = useState({ hours: 0, minutes: 0 });
  const [totalSessionsCount, setTotalSessionsCount] = useState(0);
  const [dynamicWeeklyActivity, setDynamicWeeklyActivity] = useState([]);
  const [heatmapWeeks, setHeatmapWeeks] = useState([]);
  const [monthsRow, setMonthsRow] = useState([]);

  // Calculate stats & weekly activity map dynamically from localStorage
  const loadStats = () => {
    // 1. Focus Time
    const totalFocusSec = parseInt(localStorage.getItem('total_focus_seconds') || '0', 10);
    const hours = Math.floor(totalFocusSec / 3600);
    const minutes = Math.floor((totalFocusSec % 3600) / 60);
    setFocusTime({ hours, minutes });

    // 2. Total Sessions
    const savedSessions = parseInt(localStorage.getItem('total_completed_sessions') || '0', 10);
    setTotalSessionsCount(savedSessions || playerData?.totalSessions || 0);

    // 3. Dynamic Weekly Activity Map
    const history = JSON.parse(localStorage.getItem('completed_sessions_history') || '[]');
    const today = new Date();
    
    // Calculate start of current week (Monday)
    const currentDayOfWeek = (today.getDay() + 6) % 7; // Mon = 0, Sun = 6
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const initialWeekly = (playerData?.weeklyActivity || []).map((item, idx) => ({ ...item, day: dayLabels[idx] }));

    // Count completed sessions for each day of the current week
    const countsPerDay = [0, 0, 0, 0, 0, 0, 0];
    history.forEach((entry) => {
      if (entry.finishedAt) {
        const entryDate = new Date(entry.finishedAt);
        if (entryDate >= monday) {
          const dayIndex = (entryDate.getDay() + 6) % 7;
          const sessionCount = parseInt(entry.sessionCount || 1, 10);
          countsPerDay[dayIndex] += sessionCount;
        }
      }
    });

    // Merge baseline static data with newly completed sessions
    const updatedWeekly = initialWeekly.map((item, idx) => {
      const liveCount = item.count + countsPerDay[idx];
      return {
        ...item,
        count: liveCount,
        completed: liveCount > 0,
      };
    });

    setDynamicWeeklyActivity(updatedWeekly);
  };

  useEffect(() => {
    loadStats();

    const daysData = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const rand = Math.random();
      let count = 0;
      if (rand > 0.4) count = Math.floor(Math.random() * 3) + 1;
      if (rand > 0.8) count = Math.floor(Math.random() * 5) + 3;

      daysData.push({
        date: d.toISOString().split('T')[0],
        count,
      });
    }

    const weeks = [];
    let currentWeek = [];
    daysData.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === daysData.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const months = [];
    let lastMonth = -1;

    weeks.forEach((week) => {
      const firstDayOfWeek = new Date(week[0].date);
      const month = firstDayOfWeek.getMonth();
      if (month !== lastMonth) {
        months.push({ name: monthNames[month], weekIndex: weeks.indexOf(week) });
        lastMonth = month;
      }
    });

    setHeatmapWeeks(weeks);
    setMonthsRow(months);

    const handleStorageChange = (e) => {
      if (
        e.key === 'total_focus_seconds' ||
        e.key === 'total_completed_sessions' ||
        e.key === 'completed_sessions_history'
      ) {
        loadStats();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [playerData]);

  const productiveDays = playerData?.productiveDays || [];
  const maxProductiveCount = Math.max(...productiveDays.map((d) => d.count), 1);
  const currentDayIndex = (new Date().getDay() + 6) % 7;

  return (
    <main className="relative flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex flex-col gap-5 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-pressstart text-3xl sm:text-4xl md:text-5xl inline-block bg-gradient-to-r from-[#DD6E36] via-[#D06631] to-[#511B00] bg-clip-text text-transparent w-fit">
          STATISTICS
        </h1>
        <p className="font-pressstart text-[10px] sm:text-xs text-[#3D2013]/80">
          Track your focus time, streaks, and study sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-[#FEF4E0] border-[2px] border-[#3D2013] rounded-[12px] p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center gap-3 sm:gap-4 mb-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#FFD7A3] border-2 border-[#944444] rounded-[10px] flex items-center justify-center text-[#944444] shrink-0 text-2xl sm:text-3xl">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#ED8C00]" viewBox="0 0 24 24">
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7.8 9.4Q11 7 12 3q2.5 5 0 10q3 0 5-2.9a7 7 0 1 1-9.2-.7" />
              </svg>
            </div>
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="font-pressstart text-lg sm:text-2xl text-[#3D2013] font-bold leading-none truncate">
                {playerData?.streakDays ?? 0} Days
              </span>
              <span className="font-pixel text-[15px] sm:text-[18px] text-[#3D2013]/70 uppercase tracking-tight mt-1 leading-tight truncate">
                Current Streak
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#FEF4E0] border-[2px] border-[#3D2013] rounded-[12px] p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center gap-3 sm:gap-4 mb-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#CDECCF] border-2 border-[#5C8D57] rounded-[10px] flex items-center justify-center text-[#5C8D57] shrink-0 text-2xl sm:text-3xl">
              <svg width="1em" height="1em" viewBox="0 0 24 24">
                <path fill="currentColor" d="M7 21v-2h4v-3.1q-1.225-.275-2.187-1.037T7.4 12.95q-1.875-.225-3.137-1.637T3 8V7q0-.825.588-1.412T5 5h2V3h10v2h2q.825 0 1.413.588T21 7v1q0 1.9-1.263 3.313T16.6 12.95q-.45 1.15-1.412 1.913T13 15.9V19h4v2zm0-10.2V7H5v1q0 .95.55 1.713T7 10.8m10 0q.9-.325 1.45-1.088T19 8V7h-2z" />
              </svg>
            </div>
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="font-pressstart text-lg sm:text-2xl text-[#3D2013] font-bold leading-none truncate">
                {playerData?.bestStreak ?? 0} Days
              </span>
              <span className="font-pixel text-[15px] sm:text-[18px] text-[#3D2013]/70 uppercase tracking-tight mt-1 leading-tight truncate">
                Best Streak
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: TOTAL SESSIONS */}
        <div className="bg-[#FEF4E0] border-[2px] border-[#3D2013] rounded-[12px] p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center gap-3 sm:gap-4 mb-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#E3D2E5] border-2 border-[#261A36] rounded-[10px] flex items-center justify-center text-[#261A36] shrink-0 text-2xl sm:text-3xl">
              <svg width="1em" height="1em" viewBox="0 0 16 16">
                <g fill="currentColor">
                  <path d="M1.5 1a.5.5 0 0 1 .5.5V14h12.5a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5" />
                  <path d="M5 8a1 1 0 0 1 1 1v4H3V9a1 1 0 0 1 1-1zm4-6a1 1 0 0 1 1 1v10H7V3a1 1 0 0 1 1-1zm4 4a1 1 0 0 1 1 1v6h-3V7a1 1 0 0 1 1-1z" />
                </g>
              </svg>
            </div>
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="font-pressstart text-lg sm:text-2xl text-[#3D2013] font-bold leading-none truncate">
                {totalSessionsCount}
              </span>
              <span className="font-pixel text-[15px] sm:text-[18px] text-[#3D2013]/70 uppercase tracking-tight mt-1 leading-tight truncate">
                Total Sessions
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#FEF4E0] border-[2px] border-[#3D2013] rounded-[12px] p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center gap-3 sm:gap-4 mb-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#CDE9F8] border-2 border-[#4F87B6] rounded-[10px] flex items-center justify-center text-[#4F87B6] shrink-0 text-2xl sm:text-3xl">
              <svg className="w-[1em] h-[1em]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
            </div>
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="font-pressstart text-base sm:text-xl text-[#3D2013] font-bold leading-none truncate">
                {focusTime.hours}h {focusTime.minutes}m
              </span>
              <span className="font-pixel text-[15px] sm:text-[18px] text-[#3D2013]/70 uppercase tracking-tight mt-1 leading-tight truncate">
                Focus Time
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2ND ROW: THIS WEEK TRACKER WITH DYNAMIC COUNTS */}
      <div className="bg-[#FEF4E0] border-[2px] border-[#3D2013] rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col gap-4">
        <div className="flex items-center justify-between border-b-2 border-[#3D2013]/20 pb-3">
          <h3 className="font-pressstart text-[12px] sm:text-[14px] text-[#3D2013]">THIS WEEK</h3>
          <span className="font-pixel text-[14px] text-[#3D2013]/70">Mon - Sun</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-4 text-center">
          {dynamicWeeklyActivity.map((item, idx) => {
            const isFuture = idx > currentDayIndex;
            const isCurrent = idx === currentDayIndex;
            const countDisplay = isFuture ? '-' : item.count;
            const dotBg = isFuture
              ? 'bg-[#3D2013]/10 border-[#3D2013]/20'
              : item.completed || item.count > 0
              ? 'bg-[#E87339] border-[#3D2013]'
              : 'bg-[#3D2013]/20 border-[#3D2013]/40';

            return (
              <div
                key={item.day}
                className={`flex flex-col items-center justify-between p-2 rounded-[8px] bg-[#FEF4E0] border-[2px] ${
                  isCurrent ? 'border-[#E87339] shadow-sm' : 'border-[#3D2013]/30'
                }`}
              >
                <span className="font-pixel text-[13px] sm:text-[15px] text-[#3D2013] uppercase">
                  {item.day}
                </span>
                <div className={`my-2 w-5 h-5 rounded-full border-[1.5px] ${dotBg} flex items-center justify-center`} />
                <span className="font-pressstart text-[10px] sm:text-[12px] text-[#3D2013]">
                  {countDisplay}
                </span>
                {isCurrent ? (
                  <div className="w-full h-[3px] bg-[#E87339] mt-2 rounded-full" />
                ) : (
                  <div className="w-full h-[3px] bg-transparent mt-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#FEF4E0] border-[2px] border-[#3D2013] rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-[#3D2013]/20 pb-3 gap-2">
          <h3 className="font-pixel text-[15px] sm:text-[20px] text-[#3D2013]">
            {totalSessionsCount} study sessions in the last year
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-pixel text-[#3D2013]">
            <span>Less</span>
            <div className="flex gap-1 items-center">
              <span className="w-3 h-3 bg-[#EADcc9] border border-[#3D2013]/30 rounded-sm" />
              <span className="w-3 h-3 bg-[#F8C8A6] border border-[#3D2013]/30 rounded-sm" />
              <span className="w-3 h-3 bg-[#F2994A] border border-[#3D2013]/30 rounded-sm" />
              <span className="w-3 h-3 bg-[#E87339] border border-[#3D2013]/30 rounded-sm" />
            </div>
            <span>More</span>
          </div>
        </div>

        <div className="w-full overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
          <div className="min-w-[700px] relative">
            <div className="flex flex-col gap-2 w-max">
              <div className="flex pl-7 relative h-4 font-pixel text-[11px] text-[#3D2013]/70">
                {monthsRow.map((m, idx) => {
                  const nextWeekIdx = monthsRow[idx + 1]
                    ? monthsRow[idx + 1].weekIndex
                    : heatmapWeeks.length;
                  const spanWeeks = nextWeekIdx - m.weekIndex;
                  return (
                    <div
                      key={idx}
                      style={{ width: `${spanWeeks * 20}px` }}
                      className="shrink-0"
                    >
                      {m.name}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-start gap-2">
                <div className="flex flex-col justify-between text-[10px] font-pixel text-[#3D2013]/70 h-[108px] pr-1 select-none shrink-0">
                  <span>Mon</span>
                  <span>Wed</span>
                  <span>Fri</span>
                </div>

                <div className="flex gap-1.5 justify-start">
                  {heatmapWeeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1.5">
                      {week.map((d, dIdx) => {
                        let bgColor = 'bg-[#EADcc9]';
                        if (d.count > 0 && d.count <= 2) bgColor = 'bg-[#F8C8A6]';
                        else if (d.count > 2 && d.count <= 4) bgColor = 'bg-[#F2994A]';
                        else if (d.count > 4) bgColor = 'bg-[#E87339]';

                        return (
                          <div
                            key={dIdx}
                            className={`w-3.5 h-3.5 rounded-sm border border-[#3D2013]/20 ${bgColor} relative group cursor-pointer`}
                          >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none whitespace-nowrap bg-[#3D2013] text-[#FEF4E0] font-pixel text-[10px] px-2 py-1 rounded shadow-lg">
                              <span>
                                {d.count} study sessions on {d.date}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#FEF4E0] border-[2px] border-[#3D2013] rounded-[12px] p-4 sm:p-6 shadow-md flex flex-col gap-4">
        <div className="border-b-2 border-[#3D2013]/20 pb-3">
          <h3 className="font-pressstart text-[12px] sm:text-[14px] text-[#3D2013]">
            MOST PRODUCTIVE DAY
          </h3>
        </div>
        <div className="flex flex-col gap-3 pt-1">
          {productiveDays.map((d) => {
            const percentage = Math.round((d.count / maxProductiveCount) * 100);
            const isPeak = d.count === maxProductiveCount;

            return (
              <div key={d.day} className="flex items-center gap-3 font-pixel text-[14px] text-[#3D2013]">
                <span className="w-8 font-pressstart text-[10px] uppercase">{d.day}</span>
                <div className="flex-1 h-4 bg-[#3D2013]/10 border-[1.5px] border-[#3D2013]/30 rounded-[4px] overflow-hidden p-[2px]">
                  <div
                    className={`h-full rounded-[2px] ${
                      isPeak ? 'bg-[#E87339]' : 'bg-[#3D2013]/60'
                    } transition-all duration-300`}
                    style={{ width: `${Math.max(percentage, 4)}%` }}
                  />
                </div>
                <span className="w-6 text-right font-pressstart text-[10px]">{d.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}