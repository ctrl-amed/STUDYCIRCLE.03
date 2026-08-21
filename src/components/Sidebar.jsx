import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';

export default function Sidebar({ isExpanded, setIsExpanded, isMobileOpen, setIsMobileOpen }) {
  const { playerData } = usePlayer();
  const location = useLocation();
  const [appearanceRotated, setAppearanceRotated] = useState(false);

  const xpPercent = Math.min(100, Math.max(0, (playerData.currentXP / playerData.maxXP) * 100));

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

        {/* PLAYER PROFILE WIDGET */}
        <div
          id="profile-widget"
          className={`mb-4 cursor-pointer rounded-[10px] flex items-center gap-3 shrink-0 transition-all duration-300 ${
            isExpanded
              ? 'bg-[#FEF4E0] border-[2px] border-[#3D2013] p-2.5 justify-start'
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
          <Link
            to="/kitsuai"
            onClick={() => setIsMobileOpen(false)}
            className="w-full bg-[#FDE4D0] border-2 border-[#3D2013] hover:bg-[#FD923E] hover:text-white transition-colors p-2 rounded-[8px] flex items-center justify-center gap-2 cursor-pointer no-underline text-[#3D2013]"
          >
            <img src="media/kitsu_logo.png" alt="Kitsu AI Logo" className="w-5 h-5 object-contain shrink-0" />
            {isExpanded && <span className="nav-label font-pressstart text-[10px]">KitsuAI</span>}
          </Link>

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
    </>
  );
}