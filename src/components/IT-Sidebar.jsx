import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({
  isExpanded,
  setIsExpanded,
  isMobileOpen,
  setIsMobileOpen
}) {
  const location = useLocation();

  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  const navItems = [
    {
      path: '/itadmin/dashboard',
      label: 'Dashboard',
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
      path: '/itadmin/users',
      label: 'Users',
      icon: (
        <svg className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 0h24v24H0z" fill="none" />
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      ),
    },
    {
      path: '/itadmin/rooms',
      label: 'Rooms',
      icon: (
        <svg className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M0 0h24v24H0z" fill="none" />
          <path fill="currentColor" d="M5 4h14q.425 0 .713.288T20 5t-.288.713T19 6H5q-.425 0-.712-.288T4 5t.288-.712T5 4m0 16q-.425 0-.712-.288T4 19v-5h-.175q-.475 0-.775-.363t-.2-.837l1-5q.075-.35.35-.575T4.825 7h14.35q.35 0 .625.225t.35.575l1 5q.1.475-.2.837t-.775.363H20v5q0 .425-.288.713T13 20zm1-2h6v-4H6zm-.95-6h13.9zm0 0h13.9l-.6-3H5.65z" />
        </svg>
      ),
    },
    {
      path: '/itadmin/reports',
      label: 'Reports',
      icon: (
        <svg className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
          <path d="M0 0h16v16H0z" fill="none" />
          <path fill="currentColor" d="M1.75 13.25V1.5H.5v12a1.24 1.24 0 0 0 1.22 1H15.5v-1.25z" />
          <path fill="currentColor" d="M3.15 8H4.4v3.9H3.15zm3.26-4h1.26v7.9H6.41zm3.27 2h1.25v5.9H9.68zm3.27-3.5h1.25v9.4h-1.25z" />
        </svg>
      ),
    },
    {
      path: '/itadmin/logs',
      label: 'Logs',
      icon: (
        <svg className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 0h24v24H0z" fill="none" />
          <path d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z" />
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

        {/* STATIC IT ADMIN PROFILE WIDGET */}
        <div
          id="profile-widget"
          className={`mb-4 rounded-[10px] flex items-center gap-3 shrink-0 transition-all duration-300 ${
            isExpanded || isMobileOpen
              ? 'bg-theme-surface border-[2px] border-theme-dark p-2.5 justify-start'
              : 'bg-transparent border-transparent p-0 justify-center'
          }`}
        >
          <div className="relative shrink-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-[2px] border-theme-dark bg-theme-muted overflow-hidden flex items-center justify-center relative text-theme-dark">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </div>

          {(isExpanded || isMobileOpen) && (
            <div className="nav-label flex-1 flex flex-col justify-center gap-1.5 overflow-hidden transition-opacity duration-200">
              <h2 id="player-name" className="font-pressstart text-[11px] text-theme-dark tracking-tight truncate leading-none">
                Admin
              </h2>
              <span className="text-[7px] font-pressstart text-theme-primary truncate">
                System Administrator
              </span>
            </div>
          )}
        </div>

        {/* NAVIGATION ITEMS */}
        <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <div key={item.path} className="flex flex-col gap-1.5">
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
      </aside>
    </>
  );
}