import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import CustomAvatar from '../components/CustomAvatar';
import { LEVEL_MATRIX, calculateLevelFromXP, getPlayerTitle } from '../utils/levelUtils';

// LEVEL REWARDS DATA PARA SA MGA TIERS NA NAKABASE SA SPEC DOC
const LEVEL_REWARDS_DATA = [
  { level: 1, label: "Lvl. 1", img: "media/xp_starter.png", text: "Sprout Initiate: Take it one focused step at a time." },
  { level: 5, label: "Lvl. 5", img: "media/xp_regular.png", text: "Tiny Seedling: Keep building your routine!" },
  { level: 10, label: "Lvl. 10", img: "media/xp_focused.png", text: "Budding Blossom: Keep your momentum going!" },
  { level: 15, label: "Lvl. 15", img: "media/xp_commited.png", text: "Focused Scholar: Your consistency is paying off." },
  { level: 20, label: "Lvl. 20", img: "media/xp_dedicated.png", text: "Cozy Sage: Unlocks +1 Streak Freeze Slot (Max 3)!" },
  { level: 25, label: "Lvl. 25", img: "media/xp_achiever.png", text: "Master of Flow: Your dedication is shining through!" },
  { level: 30, label: "Lvl. 30", img: "media/xp_advanced.png", text: "Arch-Scholar: Your focus skills are leveling up!" },
  { level: 40, label: "Lvl. 40", img: "media/xp_expert.png", text: "Sequoia Guardian: Your consistency is impressive!" },
  { level: 50, label: "Lvl. 50", img: "media/xp_mastery.png", text: "Golden Sequoia: You've reached the top!" },
];

const LEVEL_PAGES_TIERS = [
  [1, 5, 10, 15, 20],
  [25, 30, 40, 50],
];

// FEEDBACK RATING EMOJIS
const FEEDBACK_RATINGS = [
  { label: "Terrible", emoji: "🤢" },
  { label: "Bad", emoji: "🙁" },
  { label: "Meh", emoji: "😐" },
  { label: "Good", emoji: "😊" },
  { label: "Awesome", emoji: "😍" },
];

export default function Sidebar({
  isExpanded,
  setIsExpanded,
  isMobileOpen,
  setIsMobileOpen,
  onOpenKitsu,
}) {
  const { playerData } = usePlayer();
  const location = useLocation();
  const [appearanceRotated, setAppearanceRotated] = useState(false);

  // Theme State (Persisted in localStorage)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Sync theme with document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // --- DYNAMIC AVATAR CONFIG ---
  const userEmailKey = playerData?.email ? playerData.email.replace(/[^a-zA-Z0-9]/g, '_') : 'default';

  const [avatarConfig, setAvatarConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(`user_avatar_config_${userEmailKey}`);
      return saved
        ? JSON.parse(saved)
        : playerData?.avatarConfig || { body: 'BODY1', face: 'FACE1', tops: 'TOP7', bottoms: 'BOTTOM6', shoes: '', hair: '', accessories: '' };
    } catch {
      return { body: 'BODY1', face: 'FACE1', tops: 'TOP7', bottoms: 'BOTTOM6', shoes: '', hair: '', accessories: '' };
    }
  });

  useEffect(() => {
    const handleAvatarUpdate = (e) => setAvatarConfig(e.detail);
    window.addEventListener('avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('avatar-updated', handleAvatarUpdate);
  }, [userEmailKey]);

  // Modal State for Level Rewards
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [levelPageIndex, setLevelPageIndex] = useState(0);

  // Helper function para i-parse ang inventory galing sa database patungo sa level numbers
  const parseClaimedLevels = (inventory) => {
    if (!inventory || !Array.isArray(inventory)) return [1];
    const levels = inventory
      .filter(item => typeof item === 'string' && item.startsWith('level_') && item.endsWith('_reward'))
      .map(item => {
        const parts = item.split('_');
        return parseInt(parts[1], 10);
      });
    return [...new Set([1, ...levels])];
  };

  const [claimedLevels, setClaimedLevels] = useState(() => parseClaimedLevels(playerData?.inventory));

  // I-sync kapag nagbago o nag-load ang playerData inventory galing sa DB
  useEffect(() => {
    if (playerData?.inventory) {
      setClaimedLevels(parseClaimedLevels(playerData.inventory));
    }
  }, [playerData?.inventory]);

  // Modal State for Feedback
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState("Awesome");
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Kalkulasyon ng kasalukuyang Level at Title batay sa spec
  const currentXP = playerData?.currentXP ?? 0;
  const calculatedLevel = calculateLevelFromXP(currentXP);
  const currentTitle = getPlayerTitle(calculatedLevel);
  const maxXP = playerData?.maxXP ?? 100;
  const xpPercent = Math.min(100, Math.max(0, (currentXP / maxXP) * 100));

  const handleClaimLevelReward = async (item) => {
    if (claimedLevels.includes(item.level)) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/claim-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: playerData.email, level: item.level }),
      });
      const data = await response.json();

      if (data.success) {
        setClaimedLevels(parseClaimedLevels(data.inventory));
      }
    } catch (err) {
      console.error("Failed to claim reward:", err);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:5000/api/send-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: playerData?.email || 'Guest',
          rating: selectedRating,
          feedbackText: feedbackText
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSubmitted(true);
        setTimeout(() => {
          setShowFeedbackModal(false);
          setIsSubmitted(false);
          setFeedbackText("");
          setSelectedRating("Awesome");
        }, 2000);
      } else {
        alert(data.message || "Failed to submit feedback. Please try again.");
      }
    } catch (err) {
      console.error("Feedback error:", err);
      alert("Network error connecting to server.");
    }
  };

  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  const navItems = [
    {
      path: '/dashboard',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M0 0h24v24H0z" fill="none" />
          <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
            <path d="m3 9l9-7l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
            <path d="M9 22V12h6v10" />
          </g>
        </svg>
      ),
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: (
        <svg className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M0 0h24v24H0z" fill="none" />
          <g fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinejoin="round" d="M4 18a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
            <circle cx="12" cy="7" r="3" />
          </g>
        </svg>
      ),
    },
    {
      path: '/rooms',
      label: 'Rooms',
      icon: (
        <svg className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M0 0h24v24H0z" fill="none" />
          <path fill="currentColor" d="M5 4h14q.425 0 .713.288T20 5t-.288.713T19 6H5q-.425 0-.712-.288T4 5t.288-.712T5 4m0 16q-.425 0-.712-.288T4 19v-5h-.175q-.475 0-.775-.363t-.2-.837l1-5q.075-.35.35-.575T4.825 7h14.35q.35 0 .625.225t.35.575l1 5q.1.475-.2.837t-.775.363H20v5q0 .425-.288.713T13 20zm1-2h6v-4H6zm-.95-6h13.9zm0 0h13.9l-.6-3H5.65z" />
        </svg>
      ),
    },
    {
      path: '/statistics',
      label: 'Statistics',
      icon: (
        <svg className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
          <path d="M0 0h16v16H0z" fill="none" />
          <path fill="currentColor" d="M1.75 13.25V1.5H.5v12a1.24 1.24 0 0 0 1.22 1H15.5v-1.25z" />
          <path fill="currentColor" d="M3.15 8H4.4v3.9H3.15zm3.26-4h1.26v7.9H6.41zm3.27 2h1.25v5.9H9.68zm3.27-3.5h1.25v9.4h-1.25z" />
        </svg>
      ),
    },
    {
      path: '/customization',
      label: 'Customization',
      icon: (
        <svg className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 0h24v24H0z" fill="none" />
          <path fill="currentColor" d="M14.883 3.007L14.978 3l.112.004l.113.017l.113.03l6 2a1 1 0 0 1 .677.833L22 6v5a1 1 0 0 1-.883.993L21 12h-2v7a2 2 0 0 1-1.85 1.995L17 21H7a2 2 0 0 1-1.995-1.85L5 19v-7H3a1 1 0 0 1-.993-.883L2 11V6a1 1 0 0 1 .576-.906l.108-.043l6-2A1 1 0 0 1 10 4a2 2 0 0 0 3.995.15l.009-.24l.017-.113l.037-.134l.044-.103l.05-.092l.068-.093l.069-.08q.083-.08.175-.14l.096-.053l.103-.044l.108-.032l.112-.02z" />
        </svg>
      ),
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: (
        <svg className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M0 0h24v24H0z" fill="none" />
          <path fill="currentColor" d="m9.25 22l-.4-3.2q-.325-.125-.612-.3t-.563-.375L4.7 19.375l-2.75-4.75l2.575-1.95Q4.5 12.5 4.5 12.338v-.675q0-.163.025-.338L1.95 9.375l2.75-4.75l2.975 1.25q.275-.2.575-.375t.6-.3l.4-3.2h5.5l.4 3.2q.325.125.613.3t.562.375l2.975-1.25l2.75 4.75l-2.575 1.95q.025.175.025.338v.674q0 .163-.05.338l2.575 1.95l-2.75 4.75l-2.95-1.25q-.275.2-.575.375t-.6.3l-.4 3.2zM11 20h1.975l.35-2.65q.775-.2 1.438-.587t1.212-.938l2.475 1.025l.975-1.7l-2.15-1.625q.125-.35.175-.737T17.5 12t-.05-.787t-.175-.738l2.15-1.625l-.975-1.7l-2.475 1.05q-.55-.575-1.212-.962t-1.438-.588L13 4h-1.975l-.35 2.65q-.775.2-1.437.588t-1.213.937L5.55 7.15l-.975 1.7l2.15 1.6q-.125.375-.175.75t-.05.8q0 .4.05.775t.175.75l-2.15 1.625l.975 1.7l2.475-1.05q.55.575 1.213.963t1.437.587zm1.05-4.5q1.45 0 2.475-1.025T15.55 12t-1.025-2.475T12.05 8.5q-1.475 0-2.488 1.025T8.55 12t1.013 2.475T12.05 15.5M12 12" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <div
        id="sidebar-overlay"
        onClick={() => setIsMobileOpen(false)}
        className={`fixed inset-0 bg-theme-dark/40 z-40 md:hidden transition-opacity duration-300 ${
          isMobileOpen ? 'block opacity-100' : 'hidden opacity-0'
        }`}
      />

      <aside
        id="sidebar"
        className={`fixed top-0 left-0 h-full bg-theme-surface border-r-[3px] border-theme-dark z-50 transition-all duration-300 ease-in-out flex flex-col p-4 shadow-xl overflow-x-hidden dark:bg-zinc-900 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isExpanded ? 'w-64' : 'w-20 md:w-20'} ${isMobileOpen ? 'w-64' : ''}`}
      >
        <div
          id="sidebar-header"
          className={`flex items-center pb-4 border-b-2 border-theme-dark/20 mb-4 shrink-0 transition-all duration-300 ${
            isExpanded || isMobileOpen ? 'flex-row justify-between' : 'flex-col gap-2 items-center'
          }`}
        >
          <div id="logo-container" className="flex items-center gap-2 overflow-hidden">
            <img src={`${baseUrl}media/kitsu_logo.png`} alt="Kitsu Logo" className="w-8 h-8 object-contain shrink-0" />
            {(isExpanded || isMobileOpen) && (
              <span className="nav-label font-pressstart text-[12px] text-theme-dark tracking-tight whitespace-nowrap">
                StudyCircle
              </span>
            )}
          </div>

          <button
            id="toggle-sidebar-btn"
            aria-label="Toggle Sidebar"
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden md:flex text-theme-dark hover:text-theme-primary transition-colors p-1 rounded-md focus:outline-none shrink-0 cursor-pointer"
          >
            <svg
              id="toggle-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className={`transition-transform duration-300 ${!isExpanded ? 'rotate-180' : ''}`}
            >
              <path d="M0 0h24v24H0z" fill="none" />
              <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
                <path d="M21.97 15V9c0-5-2-7-7-7h-6c-5 0-7 2-7 7v6c0 5 2 7 7 7h6c5 0 7-2 7-7m-14-13v20" />
                <path d="M14.97 9.44L12.41 12l2.56 2.56" />
              </g>
            </svg>
          </button>
        </div>

        {/* CLICKABLE PLAYER PROFILE WIDGET */}
        <div
          id="profile-widget"
          onClick={() => setShowLevelModal(true)}
          title="Click to view Level Rewards"
          className={`mb-4 cursor-pointer rounded-[10px] flex items-center gap-3 shrink-0 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
            isExpanded || isMobileOpen
              ? 'bg-theme-surface border-[2px] border-theme-dark p-2.5 justify-start hover:border-theme-primary'
              : 'bg-transparent border-transparent p-0 justify-center'
          }`}
        >
          <div className="relative shrink-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-[2px] border-theme-dark bg-theme-muted overflow-hidden flex items-center justify-center relative">
              <div 
                className="absolute flex items-start justify-center pointer-events-none w-[120px] h-[120px]" 
                style={{ transform: 'scale(0.4) translateY(20px)' }}
              >
                <CustomAvatar config={avatarConfig} state="idle" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-theme-primary border-[2px] border-theme-dark px-1 py-0.5 text-center flex items-center justify-center min-w-[18px] rounded-[4px] leading-none z-10">
              <span id="player-level" className="font-pressstart text-[8px] text-theme-dark font-bold">
                {calculatedLevel}
              </span>
            </div>
          </div>

          {(isExpanded || isMobileOpen) && (
            <div className="nav-label flex-1 flex flex-col gap-1 overflow-hidden transition-opacity duration-200">
              <h2 id="player-name" className="font-pressstart text-[11px] text-theme-dark tracking-tight truncate leading-none">
                {playerData.username}
              </h2>
              <span className="text-[7px] font-pressstart text-theme-primary truncate">{currentTitle}</span>
              <div className="w-full bg-theme-muted border-[2px] border-theme-dark h-3.5 relative overflow-hidden rounded-[4px]">
                <div
                  id="xp-bar-fill"
                  className={`bg-theme-primary h-full transition-all duration-300 ${xpPercent > 0 ? 'border-r-2 border-theme-dark' : ''}`}
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <div id="xp-text" className="font-pressstart text-[8px] text-theme-dark leading-none">
                {currentXP.toLocaleString()}/{maxXP.toLocaleString()} XP
              </div>
            </div>
          )}
        </div>

        {/* NAVIGATION ITEMS */}
        <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isSettings = item.path === '/settings';

            return (
              <div key={item.path} className="flex flex-col gap-1.5">
                {isSettings && <div className="border-t-2 border-theme-dark/20 my-1" />}
                <Link
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`nav-item group font-pressstart text-[11px] p-2.5 rounded-[8px] transition-colors flex items-center gap-3 whitespace-nowrap ${
                    isActive
                      ? 'active bg-theme-muted border-r-4 border-theme-primary text-theme-primary'
                      : 'text-theme-dark hover:bg-theme-muted hover:text-theme-primary'
                  }`}
                >
                  {item.icon}
                  {(isExpanded || isMobileOpen) && (
                    <span className="nav-label transition-opacity duration-200">{item.label}</span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* FOOTER SECTION */}
        <div className="mt-auto pt-3 border-t-2 border-theme-dark/20 flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsMobileOpen(false);
              if (onOpenKitsu) onOpenKitsu();
            }}
            className="w-full bg-theme-muted border-2 border-theme-dark hover:bg-theme-primary hover:text-white transition-colors p-2 rounded-[8px] flex items-center justify-center gap-2 cursor-pointer text-theme-dark"
          >
            <img src={`${baseUrl}media/kitsu_logo.png`} alt="Kitsu AI Logo" className="w-5 h-5 object-contain shrink-0" />
            {(isExpanded || isMobileOpen) && <span className="nav-label font-pressstart text-[10px]">KitsuAI</span>}
          </button>

          <div className="bg-theme-muted rounded-[8px] p-1.5 flex flex-col gap-1.5">
            <button
              id="appearance-btn"
              title="Toggle Appearance"
              onClick={() => {
                setAppearanceRotated(!appearanceRotated);
                setIsDarkMode((prev) => !prev);
              }}
              className="w-full text-theme-dark hover:text-theme-primary transition-colors p-1.5 flex items-center justify-start gap-2 rounded-[6px] hover:bg-theme-muted cursor-pointer"
            >
              <svg
                id="appearance-icon"
                className={`w-5 h-5 shrink-0 transition-transform duration-300 ${appearanceRotated ? 'rotate-180' : ''}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M0 0h24v24H0z" fill="none" />
                <g fill="none">
                  <path fill="currentColor" d="M2.75 12A9.25 9.25 0 0 0 12 21.25V2.75A9.25 9.25 0 0 0 2.75 12" />
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M12 21.25a9.25 9.25 0 0 0 0-18.5m0 18.5a9.25 9.25 0 0 1 0-18.5m0 18.5V2.75"
                  />
                </g>
              </svg>
              {(isExpanded || isMobileOpen) && <span className="nav-label font-pressstart text-[9px] whitespace-nowrap">Appearance</span>}
            </button>

            <button
              title="Feedback"
              onClick={() => setShowFeedbackModal(true)}
              className="w-full text-theme-dark hover:text-theme-primary transition-colors p-1.5 flex items-center justify-start gap-2 rounded-[6px] hover:bg-theme-muted cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path
                  fill="currentColor"
                  d="M12 15q.425 0 .713-.288T13 14t-.288-.712T12 13t-.712.288T11 11t.288.713T12 15m-1-4h2V5h-2zM2 22V4q0-.825.588-1.412T4 2h16q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18H6zm3.15-6H20V4H4v13.125zM4 16V4z"
                />
              </svg>
              {(isExpanded || isMobileOpen) && <span className="nav-label font-pressstart text-[9px] whitespace-nowrap">Feedback</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* LEVEL REWARDS MODAL */}
      {showLevelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-theme-dark/50">
          <div className="bg-theme-surface border-[3px] border-theme-dark rounded-[16px] p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-3 sm:gap-4 relative [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden dark:bg-zinc-900">
            
            <button
              onClick={() => setShowLevelModal(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-theme-dark hover:text-theme-danger font-pressstart text-[12px] sm:text-[14px] p-1 cursor-pointer z-10"
            >
              ✕
            </button>

            <div className="flex flex-col items-center justify-center text-center gap-1 pt-1">
              <h3 className="font-pressstart text-sm sm:text-[36px] text-theme-dark tracking-wide">
                LEVELS
              </h3>
              <p className="font-pixel text-[7px] sm:text-[24px] text-theme-dark/70 px-4">
                Level up by completing study sessions to earn perks & titles!
              </p>
            </div>

            <div className="relative flex items-center justify-between w-full my-1 min-h-[190px] sm:min-h-[220px]">
              <button
                disabled={levelPageIndex === 0}
                onClick={() => setLevelPageIndex((prev) => Math.max(0, prev - 1))}
                className={`p-1 sm:px-2 sm:py-4 font-pressstart text-sm sm:text-lg text-theme-dark hover:text-theme-primary hover:scale-110 active:scale-95 shrink-0 z-10 transition-all ${
                  levelPageIndex === 0
                    ? 'opacity-20 cursor-not-allowed hover:scale-100 hover:text-theme-dark'
                    : 'cursor-pointer'
                }`}
              >
                ◀
              </button>

              <div className="flex items-stretch justify-start sm:justify-center gap-2 sm:gap-3 flex-1 px-1 sm:px-2 overflow-x-auto py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {LEVEL_PAGES_TIERS[levelPageIndex].map((lvlValue) => {
                  const item = LEVEL_REWARDS_DATA.find((r) => r.level === lvlValue);
                  if (!item) return null;

                  const isClaimed = claimedLevels.includes(item.level);
                  const canClaim = calculatedLevel >= item.level && !isClaimed;
                  const isLocked = !canClaim && !isClaimed;

                  return (
                    <div
                      key={item.level}
                      className={`w-28 sm:w-36 rounded-[12px] flex flex-col justify-between overflow-hidden shrink-0 border-[2px] sm:border-[2.5px] transition-all shadow-sm ${
                        canClaim
                          ? 'border-theme-primary bg-gradient-to-b from-[#FDE4D0] to-[#FFD2AE]'
                          : 'border-theme-dark bg-theme-surface'
                      }`}
                    >
                      <div className="p-1.5 sm:p-2 text-center pt-2">
                        <span className="font-pressstart text-[8px] sm:text-[10px] text-theme-dark uppercase block truncate">
                          {item.label}
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center gap-1.5 p-1.5 sm:p-2 my-auto">
                        <img
                          src={`${baseUrl}${item.img}`}
                          alt={item.label}
                          className="w-20 h-20 sm:w-30 sm:h-30 object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <span className="font-pixel text-[13px] sm:text-[15px] text-theme-dark/90 text-center leading-tight">
                          {item.text}
                        </span>
                      </div>

                      <div className="w-full h-[2px] sm:h-[2px] bg-theme-dark" />

                      {isClaimed && (
                        <div className="bg-[#C8DDB0] text-theme-safe p-3.5 sm:p-4 flex items-center justify-center gap-1 font-pressstart text-[6px] sm:text-[8px] font-bold">
                          <span>CLAIMED</span>
                        </div>
                      )}

                      {canClaim && (
                        <div className="p-2 sm:p-2.5 bg-transparent flex justify-center">
                          <button
                            onClick={() => handleClaimLevelReward(item)}
                            className="w-full bg-theme-primary text-theme-surface border-[1.5px] sm:border-[2px] border-theme-dark py-1 font-pressstart text-[7px] sm:text-[8px] rounded-[6px] hover:bg-[#d0622c] cursor-pointer transition-colors uppercase"
                          >
                            CLAIM
                          </button>
                        </div>
                      )}

                      {isLocked && (
                        <div className="bg-[#D8D0C4] text-[#8A786C] p-3.5 sm:p-4 flex items-center justify-center gap-1 font-pressstart text-[6px] sm:text-[8px] font-bold">
                          <span>LOCKED</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                disabled={levelPageIndex === LEVEL_PAGES_TIERS.length - 1}
                onClick={() => setLevelPageIndex((prev) => Math.min(LEVEL_PAGES_TIERS.length - 1, prev + 1))}
                className={`p-1 sm:px-2 sm:py-4 font-pressstart text-sm sm:text-lg text-theme-dark hover:text-theme-primary hover:scale-110 active:scale-95 shrink-0 z-10 transition-all ${
                  levelPageIndex === LEVEL_PAGES_TIERS.length - 1
                    ? 'opacity-20 cursor-not-allowed hover:scale-100 hover:text-theme-dark'
                    : 'cursor-pointer'
                }`}
              >
                ▶
              </button>
            </div>

            <div className="flex flex-col items-center gap-1.5 pb-1">
              <span className="font-pressstart text-[7px] sm:text-[9px] text-theme-dark/70 text-center">
                Gain XP from completed sessions to unlock tiers
              </span>

              <div className="flex items-center gap-2">
                {LEVEL_PAGES_TIERS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLevelPageIndex(idx)}
                    className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border-[1.5px] border-theme-dark transition-colors cursor-pointer ${
                      levelPageIndex === idx ? 'bg-theme-primary' : 'bg-theme-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK & IDEAS MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-theme-dark/50">
          <div className="bg-theme-surface border-[3px] border-theme-dark rounded-[16px] p-5 sm:p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 relative animate-fade-in dark:bg-zinc-900">
            <button
              onClick={() => setShowFeedbackModal(false)}
              className="absolute top-4 right-4 text-theme-dark hover:text-theme-danger font-pressstart text-[12px] sm:text-[14px] p-1 cursor-pointer z-10"
            >
              ✕
            </button>

            <div className="flex flex-col gap-1">
              <h3 className="font-pressstart text-[14px] sm:text-[18px] text-theme-dark tracking-wide">
                Feedback & Ideas
              </h3>
            </div>

            {isSubmitted ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <span className="text-4xl">🎉</span>
                <span className="font-pressstart text-[12px] text-theme-primary">THANK YOU!</span>
                <span className="font-pixel text-[16px] text-theme-dark/80">
                  Your feedback has been submitted successfully.
                </span>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <span className="font-pressstart text-[9px] text-theme-dark/70">
                    How was your experience?
                  </span>

                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {FEEDBACK_RATINGS.map((item) => {
                      const isSelected = selectedRating === item.label;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setSelectedRating(item.label)}
                          className={`flex flex-col items-center justify-center p-2 rounded-[12px] border-[2px] transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-theme-primary border-theme-dark scale-105 shadow-md'
                              : 'bg-theme-muted border-transparent hover:border-theme-dark/30 hover:scale-102'
                          }`}
                        >
                          <span className="text-2xl sm:text-3xl mb-1">{item.emoji}</span>
                          <span
                            className={`font-pressstart text-[7px] sm:text-[8px] truncate max-w-full ${
                              isSelected ? 'text-theme-surface font-bold' : 'text-theme-dark/80'
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative">
                  <fieldset className="border-[2px] border-theme-dark rounded-[8px] p-2 bg-theme-surface">
                    <legend className="px-2 font-pressstart text-[8px] text-theme-dark/70 ml-2">
                      We would love to hear from you!
                    </legend>
                    <textarea
                      required
                      rows="4"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Write your feedback or feature ideas here..."
                      className="w-full bg-transparent font-pixel text-[15px] sm:text-[18px] text-theme-dark focus:outline-none resize-none px-1"
                    />
                  </fieldset>
                </div>

                <button
                  type="submit"
                  className="w-full bg-theme-primary text-theme-surface border-[2px] border-theme-dark py-2.5 sm:py-3 font-pressstart text-[10px] sm:text-[11px] rounded-[8px] hover:bg-[#d0622c] cursor-pointer transition-colors shadow-sm uppercase"
                >
                  Submit
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}