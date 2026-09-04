import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import CustomAvatar from '../components/CustomAvatar';

// Mapping para sa mga badge ng bawat level reward batay sa spec
const LEVEL_BADGES_MAP = {
  1: { img: "media/xp_starter.png", alt: "Badge Starter" },
  5: { img: "media/badge_regular.png", alt: "Badge Regular" }, // o maaari ring gamitin ang media/xp_regular.png depende sa assets mo
  10: { img: "media/badge_advanced.png", alt: "Badge Advanced" },
  15: { img: "media/xp_commited.png", alt: "Badge Committed" },
  20: { img: "media/xp_dedicated.png", alt: "Badge Dedicated" },
  25: { img: "media/badge_achiever.png", alt: "Badge Achiever" },
  30: { img: "media/xp_advanced.png", alt: "Badge Advanced" },
  40: { img: "media/xp_expert.png", alt: "Badge Expert" },
  50: { img: "media/xp_mastery.png", alt: "Badge Mastery" },
};

export default function UserProfile() {
  const { playerData } = usePlayer();
  const userEmail = playerData?.email || sessionStorage.getItem('active_user_email') || localStorage.getItem('active_user_email');

  const [focusTime, setFocusTime] = useState({ hours: 0, minutes: 0 });
  const [roomsCreatedCount, setRoomsCreatedCount] = useState(0);
  const [averageSessionText, setAverageSessionText] = useState('0m');

  // DYNAMIC AVATAR CONFIG (Gamit ang katulad na safe key para sa bawat user)
  const userEmailKey = userEmail ? userEmail.replace(/[^a-zA-Z0-9]/g, '_') : 'default';

  const [avatarConfig, setAvatarConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(`user_avatar_config_${userEmailKey}`);
      if (saved) return JSON.parse(saved);

      const generalSaved = localStorage.getItem('user_avatar_config');
      if (generalSaved) return JSON.parse(generalSaved);

      return playerData?.avatarConfig || { body: 'BODY1', face: 'FACE1', tops: 'TOP7', bottoms: 'BOTTOM6', shoes: '', hair: '', accessories: '' };
    } catch {
      return { body: 'BODY1', face: 'FACE1', tops: 'TOP7', bottoms: 'BOTTOM6', shoes: '', hair: '', accessories: '' };
    }
  });

  useEffect(() => {
    const handleAvatarUpdate = (e) => {
      if (e.detail) setAvatarConfig(e.detail);
    };
    window.addEventListener('avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('avatar-updated', handleAvatarUpdate);
  }, [userEmailKey]);

  // Load real user stats from localStorage / database history
  const loadProfileStats = async () => {
    const totalFocusSec = parseInt(localStorage.getItem('total_focus_seconds') || '0', 10);
    const hours = Math.floor(totalFocusSec / 3600);
    const minutes = Math.floor((totalFocusSec % 3600) / 60);
    setFocusTime({ hours, minutes });

    const history = JSON.parse(localStorage.getItem('completed_sessions_history') || '[]');
    if (history.length > 0) {
      let totalMin = 0;
      history.forEach(item => {
        totalMin += parseInt(item.duration || 25, 10);
      });
      const avgMins = Math.round(totalMin / history.length);
      setAverageSessionText(`${avgMins}m`);
    } else {
      setAverageSessionText('0m');
    }

    const savedRooms = parseInt(localStorage.getItem('total_rooms_created') || '0', 10);
    setRoomsCreatedCount(savedRooms || playerData?.roomsCreated || 0);

    if (userEmail) {
      try {
        const response = await fetch(`http://localhost:5000/api/get-all-sessions?email=${encodeURIComponent(userEmail)}`);
        const data = await response.json();
        if (data.success && data.sessions) {
          const sessions = data.sessions;
          let dbTotalSec = 0;
          sessions.forEach(s => {
            dbTotalSec += parseInt(s.duration_minutes || 0, 10) * 60;
          });
          const dbHours = Math.floor(dbTotalSec / 3600);
          const dbMinutes = Math.floor((dbTotalSec % 3600) / 60);
          setFocusTime({ hours: dbHours, minutes: dbMinutes });

          if (sessions.length > 0) {
            const avgDbMins = Math.round((dbTotalSec / 60) / sessions.length);
            setAverageSessionText(`${avgDbMins}m`);
          }
        }
      } catch (err) {
        console.error("Error fetching profile session stats:", err);
      }
    }
  };

  useEffect(() => {
    loadProfileStats();
  }, [playerData, userEmail]);

  const getUserCoins = () => {
    if (playerData?.coins !== undefined && playerData?.coins !== null) {
      return playerData.coins;
    }
    if (userEmail) {
      try {
        const savedUser = localStorage.getItem(`user_${userEmail}`);
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed.coins !== undefined) return parsed.coins;
        }
      } catch (e) {}
    }
    return 100;
  };

  const totalCoins = getUserCoins();
  const xpPercent = Math.min(100, Math.max(0, ((playerData?.currentXP || 0) / (playerData?.maxXP || 100)) * 100));

  // Kunin ang mga na-claim na badges mula sa playerData.inventory
  const getUnlockedBadges = () => {
    // 1. Subukang kunin mula sa playerData
    let inventory = playerData?.inventory || [];

    // 2. Kung walang laman, subukang basahin sa active user localStorage session
    if (inventory.length === 0 && userEmail) {
      try {
        const savedUserJson = localStorage.getItem(`user_${userEmail}`);
        if (savedUserJson) {
          const parsedUser = JSON.parse(savedUserJson);
          if (parsedUser.inventory) {
            inventory = parsedUser.inventory;
          }
        }
      } catch (e) {
        console.error("Error reading inventory from localStorage:", e);
      }
    }

    const claimedLevels = [1];

    inventory.forEach(item => {
      if (typeof item === 'string' && item.startsWith('level_') && item.endsWith('_reward')) {
        const parts = item.split('_');
        const lvl = parseInt(parts[1], 10);
        if (!isNaN(lvl)) claimedLevels.push(lvl);
      }
    });

    return [...new Set(claimedLevels)].sort((a, b) => a - b);
  };

  const unlockedBadges = getUnlockedBadges();

  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  return (
    <main className="relative flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex flex-col gap-5 pb-10">
      {/* ROW 1: HEADER & TITLE */}
      <div className="flex flex-col gap-1">
        <h1 className="font-pressstart text-3xl sm:text-4xl md:text-5xl inline-block level-up-gradient bg-clip-text text-transparent w-fit">
          PROFILE
        </h1>
        <p className="font-pressstart text-[10px] sm:text-xs text-theme-dark/80">
          View and manage your account details and focus statistics.
        </p>
      </div>

      {/* MAIN CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* ==================== LEFT CARD: USER IDENTITY ==================== */}
        <div className="lg:col-span-4 bg-theme-surface border-[3px] border-theme-dark rounded-[16px] p-6 flex flex-col items-center justify-center gap-5 shadow-md h-full">
          {/* AVATAR ICON WITH OVERLAYED LEVEL BADGE */}
          <div className="relative w-44 h-44 rounded-full border-[4px] border-theme-dark bg-theme-muted flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center scale-125 pt-8 pointer-events-none">
              <CustomAvatar config={avatarConfig} state="idle" />
            </div>

            {/* LEVEL BADGE AT BOTTOM RIGHT OVERLAY */}
            <div className="absolute bottom-1 right-1 bg-theme-primary border-[2px] border-theme-dark px-2 py-0.5 text-center flex items-center justify-center rounded-[6px] shadow-md z-10">
              <span className="font-pressstart text-[10px] text-theme-dark font-bold">
                {playerData?.level ?? 1}
              </span>
            </div>
          </div>

          {/* USERNAME */}
          <div className="text-center flex flex-col gap-1">
            <h2 className="font-pressstart text-base sm:text-lg text-theme-dark">
              {playerData?.username || 'ACORN_HERO'}
            </h2>
          </div>

          {/* LEVEL PROGRESS BAR & RATIO */}
          <div className="w-full flex flex-col items-center gap-2 mt-1">
            <div className="w-full bg-theme-muted border-[2.5px] border-theme-dark h-5 relative overflow-hidden rounded-[6px]">
              <div
                className="bg-theme-primary h-full transition-all duration-300 border-r-2 border-theme-dark"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <span className="font-pressstart text-[9px] text-theme-dark">
              {(playerData?.currentXP ?? 0).toLocaleString()}/{(playerData?.maxXP ?? 100).toLocaleString()} XP
            </span>
          </div>
        </div>

        {/* ==================== RIGHT CARD: TWO ROW CONTAINER ==================== */}
        <div className="lg:col-span-8 flex flex-col gap-6 justify-between h-full">
          
          {/* ROW 1: BADGES (DYNAMIC MULA SA DATABASE INVENTORY) */}
          <div className="bg-theme-surface border-[3px] border-theme-dark rounded-[16px] overflow-hidden shadow-md flex-1 flex flex-col justify-between">
            <div className="p-4 border-b-[3px] border-theme-dark flex justify-between items-center">
              <h3 className="font-pressstart text-xs text-theme-dark tracking-wide">BADGES & REWARDS</h3>
              <span className="font-pressstart text-[8px] text-theme-dark/70">
                {unlockedBadges.length} Unlocked
              </span>
            </div>
            
            <div className="p-6 flex items-center gap-6 overflow-x-auto my-auto">
              <div className="flex items-center gap-4">
                {unlockedBadges.map((lvl) => {
                  const badgeInfo = LEVEL_BADGES_MAP[lvl] || { img: "media/xp_starter.png", alt: `Level ${lvl} Badge` };
                  return (
                    <div key={lvl} className="flex flex-col items-center gap-1 shrink-0">
                      <img
                        src={`${baseUrl}${badgeInfo.img}`}
                        alt={badgeInfo.alt}
                        className="w-16 h-16 sm:w-24 sm:h-24 object-contain hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <span className="font-pressstart text-[7px] text-theme-dark">Lvl. {lvl}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ROW 2: STATS */}
          <div className="bg-theme-surface border-[3px] border-theme-dark rounded-[16px] overflow-hidden shadow-md">
            <div className="p-4 border-b-[3px] border-theme-dark">
              <h3 className="font-pressstart text-xs text-theme-dark tracking-wide">STATS</h3>
            </div>

            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              
              {/* CARD A: TOTAL FOCUS TIME */}
              <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-3 flex flex-col items-center justify-between text-center gap-2 min-h-[110px]">
                <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="13" r="8" />
                  <path d="M12 9v4l2 2" />
                  <path d="M5 3L2 6" />
                  <path d="M22 6l-3-3" />
                  <path d="M12 2v2" />
                </svg>
                <span className="font-pixel text-[15px] sm:text-[24px] leading-4 text-theme-dark/70">Total Focus Time</span>
                <span className="font-pressstart text-[clamp(10px,13cqw,20px)] text-theme-dark whitespace-nowrap">
                  {focusTime.hours}h {focusTime.minutes}m
                </span>
              </div>

              {/* CARD B: ROOMS CREATED */}
              <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-3 flex flex-col items-center justify-between text-center gap-2 min-h-[110px]">
                <svg className="w-6 h-6 text-theme-dark" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.5 7c0-1.11.89-2 2-2H18c1.1 0 2 .9 2 2v2.16c-1.16.41-2 1.51-2 2.81V14h-5.5zM6 11.96V14h5.5V7c0-1.11-.89-2-2-2H6c-1.1 0-2 .9-2 2v2.15c1.16.41 2 1.52 2 2.81m14.66-1.93c-.98.16-1.66 1.09-1.66 2.09V15H5v-3a2 2 0 1 0-4 0v5c0 1.1.9 2 2 2v2h2v-2h14v2h2v-2c1.1 0 2-.9 2-2v-5c0-1.21-1.09-2.18-2.34-1.97" />
                </svg>
                <span className="font-pixel text-[15px] sm:text-[24px] leading-4 text-theme-dark/70">Rooms Created</span>
                <span className="font-pressstart text-[clamp(10px,13cqw,20px)] text-theme-dark whitespace-nowrap">
                  {roomsCreatedCount}
                </span>
              </div>

              {/* CARD C: AVERAGE SESSION */}
              <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-3 flex flex-col items-center justify-between text-center gap-2 min-h-[110px]">
                <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="13" r="8" />
                  <path d="M12 9v4l2 2" />
                  <path d="M12 2v2" />
                </svg>
                <span className="font-pixel text-[15px] sm:text-[24px] leading-4 text-theme-dark/70">Average Session</span>
                <span className="font-pressstart text-[clamp(10px,13cqw,20px)] text-theme-dark whitespace-nowrap">
                  {averageSessionText}
                </span>
              </div>

              {/* CARD D: BEST STREAK */}
              <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-3 flex flex-col items-center justify-between text-center gap-2 min-h-[110px]">
                <svg className="w-6 h-6 text-theme-primary" viewBox="0 0 24 24">
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7.8 9.4Q11 7 12 3q2.5 5 0 10q3 0 5-2.9a7 7 0 1 1-9.2-.7" />
                </svg>
                <span className="font-pixel text-[15px] sm:text-[24px] leading-4 text-theme-dark/70">Best Streak</span>
                <span className="font-pressstart text-base sm:text-lg text-theme-dark">
                  {playerData?.bestStreak ?? 0}
                </span>
              </div>

              {/* CARD E: TOTAL COINS */}
              <div className="bg-theme-surface border-[2px] border-theme-dark rounded-[12px] p-3 flex flex-col items-center justify-between text-center gap-2 min-h-[110px]">
                <img
                  src={`${baseUrl}media/coin_logo.png`}
                  alt="Coin Icon"
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <span className="font-pixel text-[15px] sm:text-[24px] leading-4 text-theme-dark/70">Total Coins</span>
                <span className="font-pressstart text-[clamp(10px,13cqw,20px)] text-theme-dark whitespace-nowrap">
                  {totalCoins.toLocaleString()}
                </span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </main>
  );
}