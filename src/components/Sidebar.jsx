import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';

// LEVEL REWARDS DATA FOR THE 9 TIERS
const LEVEL_REWARDS_DATA = [
  { level: 1, label: "Lvl. 1", img: "media/xp_starter.png", text: "Take it one focused step at a time." },
  { level: 5, label: "Lvl. 5", img: "media/xp_regular.png", text: "Keep building your routine!" },
  { level: 10, label: "Lvl. 10", img: "media/xp_focused.png", text: "Keep your momentum going!" },
  { level: 15, label: "Lvl. 15", img: "media/xp_commited.png", text: "Your consistency is paying off." },
  { level: 20, label: "Lvl. 20", img: "media/xp_dedicated.png", text: "Keep going!" },
  { level: 25, label: "Lvl. 25", img: "media/xp_achiever.png", text: "Your dedication is shining through!" },
  { level: 30, label: "Lvl. 30", img: "media/xp_advanced.png", text: "Your focus skills are leveling up!" },
  { level: 40, label: "Lvl. 40", img: "media/xp_expert.png", text: "Your consistency is impressive!" },
  { level: 50, label: "Lvl. 50", img: "media/xp_mastery.png", text: "You've reached the top!" },
];

const LEVEL_PAGES_TIERS = [
  [1, 5, 10, 15, 20],
  [25, 30, 40, 50],
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

  // Modal State for Level Rewards
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [levelPageIndex, setLevelPageIndex] = useState(0);
  const [claimedLevels, setClaimedLevels] = useState([0]);

  const xpPercent = Math.min(100, Math.max(0, (playerData.currentXP / playerData.maxXP) * 100));

  const handleClaimLevelReward = (item) => {
    if (claimedLevels.includes(item.level)) return;
    setClaimedLevels((prev) => [...prev, item.level]);
  };

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
          <path fill="currentColor" d="M5 4h14q.425 0 .713.288T20 5t-.288.713T19 6H5q-.425 0-.712-.288T4 5t.288-.712T5 4m0 16q-.425 0-.712-.288T4 19v-5h-.175q-.475 0-.775-.363t-.2-.837l1-5q.075-.35.35-.575T4.825 7h14.35q.35 0 .625.225t.35.575l1 5q.1.475-.2.837t-.775.363H20v5q0 .425-.288.713T19 20t-.712-.288T18 19v-5h-4v5q0 .425-.288.713T13 20zm1-2h6v-4H6zm-.95-6h13.9zm0 0h13.9l-.6-3H5.65z" />
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
      path: '/customizer',
      label: 'Customizer',
      icon: (
        <svg className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 640 640">
          <path d="M0 0h640v640H0z" fill="none" />
          <path fill="currentColor" d="M320.2 176c44.2 0 80-35.8 80-80h53.5c17 0 33.3 6.7 45.3 18.7l118.6 118.7c12.5 12.5 12.5 32.8 0 45.3l-50.7 50.7c-12.5 12.5-32.8 12.5-45.3 0L480.2 288v224c0 35.3-28.7 64-64 64h-192c-35.3 0-64-28.7-64-64V288l-41.4 41.4c-12.5 12.5-32.8 12.5-45.3 0l-50.6-50.8c-12.5-12.5-12.5-32.8 0-45.3l118.6-118.6c12-12 28.3-18.7 45.3-18.7h53.5c0 44.2 35.8 80 80 80z" />
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
      {/* SIDEBAR OVERLAY (BACKDROP FOR MOBILE) */}
      <div
        id="sidebar-overlay"
        onClick={() => setIsMobileOpen(false)}
        className={`fixed inset-0 bg-[#3D2013]/40 z-40 md:hidden transition-opacity duration-300 ${
          isMobileOpen ? 'block opacity-100' : 'hidden opacity-0'
        }`}
      />

      {/* SIDE NAVIGATION */}
      <aside
        id="sidebar"
        className={`fixed top-0 left-0 h-full bg-[#FEF4E0] border-r-[3px] border-[#3D2013] z-50 transition-all duration-300 ease-in-out flex flex-col p-4 shadow-xl overflow-x-hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isExpanded ? 'w-64' : 'w-20'}`}
      >
        {/* HEADER: LOGO & TOGGLE BUTTON */}
        <div
          id="sidebar-header"
          className={`flex items-center pb-4 border-b-2 border-[#3D2013]/20 mb-4 shrink-0 transition-all duration-300 ${
            isExpanded ? 'flex-row justify-between' : 'flex-col gap-2 items-center'
          }`}
        >
          <div id="logo-container" className="flex items-center gap-2 overflow-hidden">
            <img src="media/kitsu_logo.png" alt="Kitsu Logo" className="w-8 h-8 object-contain shrink-0" />
            {isExpanded && (
              <span className="nav-label font-pressstart text-[12px] text-[#3D2013] tracking-tight whitespace-nowrap">
                StudyCircle
              </span>
            )}
          </div>

          <button
            id="toggle-sidebar-btn"
            aria-label="Toggle Sidebar"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#3D2013] hover:text-[#FD923E] transition-colors p-1 rounded-md focus:outline-none shrink-0 cursor-pointer"
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
            isExpanded
              ? 'bg-[#FEF4E0] border-[2px] border-[#3D2013] p-2.5 justify-start hover:border-[#FD923E]'
              : 'bg-transparent border-transparent p-0 justify-center'
          }`}
        >
          <div className="relative shrink-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-[2px] border-[#3D2013] bg-[#FAE9CE] overflow-hidden flex items-center justify-center">
              {playerData.avatarUrl ? (
                <img id="player-avatar" src={playerData.avatarUrl} alt="Player Avatar" className="w-full h-full object-cover" />
              ) : (
                <svg id="avatar-placeholder" className="w-6 h-6 text-[#3D2013]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 9l2 11h16l2-11L12 2zm0 4a3 3 0 110 6 3 3 0 010-6zm-6 12v-1.5c0-1.65 2.7-3 6-3s6 1.35 6 3V18H6z" />
                </svg>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#FD923E] border-[2px] border-[#3D2013] px-1 py-0.5 text-center flex items-center justify-center min-w-[18px] rounded-[4px] leading-none z-10">
              <span id="player-level" className="font-pressstart text-[8px] text-[#3D2013] font-bold">
                {playerData.level}
              </span>
            </div>
          </div>

          {isExpanded && (
            <div className="nav-label flex-1 flex flex-col gap-1 overflow-hidden transition-opacity duration-200">
              <h2 id="player-name" className="font-pressstart text-[11px] text-[#3D2013] tracking-tight truncate leading-none">
                {playerData.username}
              </h2>
              <div className="w-full bg-[#FAE9CE] border-[2px] border-[#3D2013] h-3.5 relative overflow-hidden rounded-[4px]">
                <div
                  id="xp-bar-fill"
                  className={`bg-[#FD923E] h-full transition-all duration-300 ${xpPercent > 0 ? 'border-r-2 border-[#3D2013]' : ''}`}
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <div id="xp-text" className="font-pressstart text-[8px] text-[#3D2013] leading-none">
                {playerData.currentXP.toLocaleString()}/{playerData.maxXP.toLocaleString()} XP
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
                {isSettings && <div className="border-t-2 border-[#3D2013]/20 my-1" />}
                <Link
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`nav-item group font-pressstart text-[11px] p-2.5 rounded-[8px] transition-colors flex items-center gap-3 whitespace-nowrap ${
                    isActive
                      ? 'active bg-[#FDE4D0] border-r-4 border-[#FD923E] text-[#EA781C]'
                      : 'text-[#3D2013] hover:bg-[#FDE4D0] hover:text-[#EA781C]'
                  }`}
                >
                  {item.icon}
                  {isExpanded && <span className="nav-label transition-opacity duration-200">{item.label}</span>}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* FOOTER SECTION */}
        <div className="mt-auto pt-3 border-t-2 border-[#3D2013]/20 flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsMobileOpen(false);
              if (onOpenKitsu) onOpenKitsu();
            }}
            className="w-full bg-[#FDE4D0] border-2 border-[#3D2013] hover:bg-[#FD923E] hover:text-white transition-colors p-2 rounded-[8px] flex items-center justify-center gap-2 cursor-pointer text-[#3D2013]"
          >
            <img src="media/kitsu_logo.png" alt="Kitsu AI Logo" className="w-5 h-5 object-contain shrink-0" />
            {isExpanded && <span className="nav-label font-pressstart text-[10px]">KitsuAI</span>}
          </button>

          <div className="bg-[#FDE4D0] rounded-[8px] p-1.5 flex flex-col gap-1.5">
            <button
              id="appearance-btn"
              title="Toggle Appearance"
              onClick={() => setAppearanceRotated(!appearanceRotated)}
              className="w-full text-[#3D2013] hover:text-[#FD923E] transition-colors p-1.5 flex items-center justify-start gap-2 rounded-[6px] hover:bg-[#FAE9CE] cursor-pointer"
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
              {isExpanded && <span className="nav-label font-pressstart text-[9px] whitespace-nowrap">Appearance</span>}
            </button>

            <button
              title="Feedback"
              className="w-full text-[#3D2013] hover:text-[#FD923E] transition-colors p-1.5 flex items-center justify-start gap-2 rounded-[6px] hover:bg-[#FAE9CE] cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path
                  fill="currentColor"
                  d="M12 15q.425 0 .713-.288T13 14t-.288-.712T12 13t-.712.288T11 11t.288.713T12 15m-1-4h2V5h-2zM2 22V4q0-.825.588-1.412T4 2h16q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18H6zm3.15-6H20V4H4v13.125zM4 16V4z"
                />
              </svg>
              {isExpanded && <span className="nav-label font-pressstart text-[9px] whitespace-nowrap">Feedback</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* LEVEL REWARDS MODAL */}
      {showLevelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#3D2013]/50">
          <div className="bg-[#FEF4E0] border-[3px] border-[#3D2013] rounded-[16px] p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-3 sm:gap-4 relative [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            
            {/* CLOSE BUTTON AT TOP RIGHT */}
            <button
              onClick={() => setShowLevelModal(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-[#3D2013] hover:text-[#A53914] font-pressstart text-[12px] sm:text-[14px] p-1 cursor-pointer z-10"
            >
              ✕
            </button>

            {/* HEADER */}
            <div className="flex flex-col items-center justify-center text-center gap-1 pt-1">
              <h3 className="font-pressstart text-sm sm:text-[36px] text-[#3D2013] tracking-wide">
                LEVELS
              </h3>
              <p className="font-pixel text-[7px] sm:text-[24px] text-[#3D2013]/70 px-4">
                Level up by completing study sessions to earn perks & titles!
              </p>
            </div>

            {/* CARDS CONTAINER WITH NAVIGATION ARROWS */}
            <div className="relative flex items-center justify-between w-full my-1 min-h-[190px] sm:min-h-[220px]">
              
              {/* LEFT ARROW */}
              <button
                disabled={levelPageIndex === 0}
                onClick={() => setLevelPageIndex((prev) => Math.max(0, prev - 1))}
                className={`p-1 sm:px-2 sm:py-4 font-pressstart text-sm sm:text-lg text-[#3D2013] hover:text-[#E87339] hover:scale-110 active:scale-95 shrink-0 z-10 transition-all ${
                  levelPageIndex === 0
                    ? 'opacity-20 cursor-not-allowed hover:scale-100 hover:text-[#3D2013]'
                    : 'cursor-pointer'
                }`}
              >
                ◀
              </button>

              {/* HORIZONTAL CARDS DISPLAY */}
              <div className="flex items-stretch justify-start sm:justify-center gap-2 sm:gap-3 flex-1 px-1 sm:px-2 overflow-x-auto py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {LEVEL_PAGES_TIERS[levelPageIndex].map((lvlValue) => {
                  const item = LEVEL_REWARDS_DATA.find((r) => r.level === lvlValue);
                  if (!item) return null;

                  const isClaimed = claimedLevels.includes(item.level);
                  const canClaim = (playerData.level ?? 1) >= item.level && !isClaimed;
                  const isLocked = !canClaim && !isClaimed;

                  return (
                    <div
                      key={item.level}
                      className={`w-28 sm:w-36 rounded-[12px] flex flex-col justify-between overflow-hidden shrink-0 border-[2px] sm:border-[2.5px] transition-all shadow-sm ${
                        canClaim
                          ? 'border-[#E87339] bg-gradient-to-b from-[#FDE4D0] to-[#FFD2AE]'
                          : 'border-[#3D2013] bg-[#FEF4E0]'
                      }`}
                    >
                      {/* CARD HEADER */}
                      <div className="p-1.5 sm:p-2 text-center pt-2">
                        <span className="font-pressstart text-[8px] sm:text-[10px] text-[#3D2013] uppercase block truncate">
                          {item.label}
                        </span>
                      </div>

                      {/* CARD BODY */}
                      <div className="flex flex-col items-center justify-center gap-1.5 p-1.5 sm:p-2 my-auto">
                        <img
                          src={item.img}
                          alt={item.label}
                          className="w-20 h-20 sm:w-30 sm:h-30 object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <span className="font-pixel text-[13px] sm:text-[15px] text-[#3D2013]/90 text-center leading-tight">
                          {item.text}
                        </span>
                      </div>

                      {/* BORDER SEPARATOR */}
                      <div className="w-full h-[2px] sm:h-[2px] bg-[#3D2013]" />

                      {/* CARD FOOTER */}
                      {isClaimed && (
                        <div className="bg-[#C8DDB0] text-[#5C8D57] p-3.5 sm:p-4 flex items-center justify-center gap-1 font-pressstart text-[6px] sm:text-[8px] font-bold">
                          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" viewBox="0 0 32 32">
                            <path d="M0 0h32v32H0z" fill="none" />
                            <path fill="currentColor" d="m14 21.414l-5-5.001L10.413 15L14 18.586L21.585 11L23 12.415z" />
                            <path fill="currentColor" d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2m0 26a12 12 0 1 1 12-12a12 12 0 0 1-12 12" />
                          </svg>
                          <span>CLAIMED</span>
                        </div>
                      )}

                      {canClaim && (
                        <div className="p-2 sm:p-2.5 bg-transparent flex justify-center">
                          <button
                            onClick={() => handleClaimLevelReward(item)}
                            className="w-full bg-[#E87339] text-[#FEF4E0] border-[1.5px] sm:border-[2px] border-[#3D2013] py-1 font-pressstart text-[7px] sm:text-[8px] rounded-[6px] hover:bg-[#d0622c] cursor-pointer transition-colors uppercase"
                          >
                            CLAIM
                          </button>
                        </div>
                      )}

                      {isLocked && (
                        <div className="bg-[#D8D0C4] text-[#8A786C] p-3.5 sm:p-4 flex items-center justify-center gap-1 font-pressstart text-[6px] sm:text-[8px] font-bold">
                          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" viewBox="0 0 16 16">
                            <path d="M0 0h16v16H0z" fill="none" />
                            <path fill="currentColor" d="M8 1a4 4 0 0 1 4 4v2l.204.01A2 2 0 0 1 14 9v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2V5a4 4 0 0 1 4-4m0 8a1 1 0 0 0-1 1v2a1 1 0 1 0 2 0v-2a1 1 0 0 0-1-1m0-6a2 2 0 0 0-2 2v2h4V5a2 2 0 0 0-2-2" />
                          </svg>
                          <span>LOCKED</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* RIGHT ARROW */}
              <button
                disabled={levelPageIndex === LEVEL_PAGES_TIERS.length - 1}
                onClick={() => setLevelPageIndex((prev) => Math.min(LEVEL_PAGES_TIERS.length - 1, prev + 1))}
                className={`p-1 sm:px-2 sm:py-4 font-pressstart text-sm sm:text-lg text-[#3D2013] hover:text-[#E87339] hover:scale-110 active:scale-95 shrink-0 z-10 transition-all ${
                  levelPageIndex === LEVEL_PAGES_TIERS.length - 1
                    ? 'opacity-20 cursor-not-allowed hover:scale-100 hover:text-[#3D2013]'
                    : 'cursor-pointer'
                }`}
              >
                ▶
              </button>
            </div>

            {/* INFO TEXT & CIRCLE PAGE INDICATOR */}
            <div className="flex flex-col items-center gap-1.5 pb-1">
              <span className="font-pressstart text-[7px] sm:text-[9px] text-[#3D2013]/70 text-center">
                Gain XP from completed sessions to unlock tiers
              </span>

              <div className="flex items-center gap-2">
                {LEVEL_PAGES_TIERS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLevelPageIndex(idx)}
                    className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border-[1.5px] border-[#3D2013] transition-colors cursor-pointer ${
                      levelPageIndex === idx ? 'bg-[#E87339]' : 'bg-[#FAE9CE]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* FOOTER SECTION WITH DISTINCT BACKGROUND */}
            <div className="-mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 py-3.5 sm:py-4 bg-[#FAE9CE] border-t-[2.5px] border-[#3D2013] rounded-b-[13px] flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 mt-1">
              
              {/* LEFT: KITSU LOGO & TEXT */}
              <div className="flex items-center gap-2.5 text-center md:text-left">
                <img
                  src="media/kitsu_logo.png"
                  alt="Kitsu Logo"
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain shrink-0"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="flex flex-col">
                  <span className="font-pressstart text-[11px] sm:text-[16px] text-[#3D2013]">Keep it up!</span>
                  <span className="font-pixel text-[15px] sm:text-[20px] text-[#3D2013]/80 leading-4">
                    Earn XP by completing study <br /> sessions to unlock new levels.
                  </span>
                </div>
              </div>

              {/* RIGHT: DUAL STATS CARD (CURRENT LEVEL & TOTAL XP WITH BAR) */}
              <div className="bg-[#FEF4E0] border-[2px] border-[#3D2013] rounded-[10px] p-2 sm:p-2.5 flex items-center justify-center gap-2 sm:gap-3 w-full md:w-auto shrink-0 shadow-xs">
                
                {/* CURRENT LEVEL */}
                <div className="flex items-center gap-1.5 sm:gap-2 pr-1.5 sm:pr-2">
                  <svg
                    className="w-5 h-5 sm:w-10 sm:h-10 text-[#FD923E] shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path d="M7 21H3v-8h4zm7 0h-4V3h4zm7-13v13h-4V8z" />
                  </svg>
                  <div className="flex flex-col text-left">
                    <span className="font-pixel text-[15px] sm:text-[20px] text-[#3D2013]/70">CURRENT LEVEL</span>
                    <span className="font-pressstart text-[8px] sm:text-[20px] text-[#FD923E]">
                      {playerData.level ?? 1}
                    </span>
                  </div>
                </div>

                {/* VERTICAL BORDER SEPARATOR */}
                <div className="w-[1.5px] h-6 sm:h-7 bg-[#3D2013]/30" />

                {/* TOTAL XP WITH BAR & RATIO */}
                <div className="flex flex-col text-left pl-1 gap-1 min-w-[110px] sm:min-w-[130px]">
                  <span className="font-pixel text-[15px] sm:text-[20px] text-[#3D2013]/70">TOTAL XP</span>
                  <div className="w-full bg-[#FAE9CE] border-[1.5px] border-[#3D2013] h-2.5 sm:h-3 relative overflow-hidden rounded-[3px]">
                    <div
                      className={`bg-[#FD923E] h-full transition-all duration-300 ${xpPercent > 0 ? 'border-r border-[#3D2013]' : ''}`}
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                  <span className="font-pressstart text-[6px] sm:text-[7px] text-[#3D2013]">
                    {playerData.currentXP?.toLocaleString() ?? 0}/{playerData.maxXP?.toLocaleString() ?? 100} XP
                  </span>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}