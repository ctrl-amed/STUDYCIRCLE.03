import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header({ onMobileToggle }) {
  const navigate = useNavigate();

  // Modal visibility state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Date and Time state
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000); // Update every minute is sufficient for AM/PM format without seconds

    return () => clearInterval(timer);
  }, []);

  // Format date and time
  const formattedDate = currentDateTime.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = currentDateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <>
      <header className="relative z-10 pt-4 sm:pt-6 flex items-center justify-between md:justify-end w-full px-3 sm:px-6 shrink-0 transition-colors duration-200">
        <button
          onClick={onMobileToggle}
          aria-label="Open Mobile Navigation"
          className="md:hidden bg-theme-surface border-2 border-theme-dark text-theme-dark h-8 sm:h-11 w-8 sm:w-11 flex items-center justify-center rounded-[8px] sm:rounded-[10px] shadow-sm hover:bg-theme-muted transition-colors focus:outline-none cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 sm:gap-4 flex-nowrap justify-end max-w-full py-2 px-1">
          
          {/* DATE AND TIME WIDGET */}
          <div className="h-8 sm:h-11 bg-theme-surface border-2 border-theme-dark px-2 sm:px-4 rounded-[8px] sm:rounded-[10px] flex items-center justify-center shadow-sm transition-colors duration-200">
            {/* Date Section */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-theme-dark shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-theme-primary" viewBox="0 0 16 16">
                <path d="M0 0h16v16H0z" fill="none" />
                <path fill="currentColor" d="M14.5 16h-13C.67 16 0 15.33 0 14.5v-12C0 1.67.67 1 1.5 1h13c.83 0 1.5.67 1.5 1.5v12c0 .83-.67 1.5-1.5 1.5M1.5 2c-.28 0-.5.22-.5.5v12c0 .28.22.5.5.5h13c.28 0 .5-.22.5-.5v-12c0-.28-.22-.5-.5-.5z" />
                <path fill="currentColor" d="M4.5 4c-.28 0-.5-.22-.5-.5v-3c0-.28.22-.5.5-.5s.5.22.5.5v3c0 .28-.22.5-.5.5m7 0c-.28 0-.5-.22-.5-.5v-3c0-.28.22-.5.5-.5s.5.22.5.5v3c0 .28-.22.5-.5.5m4 2H.5C.22 6 0 5.78 0 5.5S.22 5 .5 5h15c.28 0 .5.22.5.5s-.22.5-.5.5" />
              </svg>
              <span className="font-pressstart text-[7px] sm:text-[10px] whitespace-nowrap">
                {formattedDate}
              </span>
            </div>

            {/* Divider */}
            <div className="w-[2px] h-4 sm:h-6 bg-theme-dark/20 mx-2 sm:mx-3 shrink-0" />

            {/* Time Section */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-theme-dark shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-theme-primary" viewBox="0 0 32 32">
                <path d="M0 0h32v32H0z" fill="none" />
                <path fill="currentColor" d="M16 30a14 14 0 1 1 14-14a14 14 0 0 1-14 14m0-26a12 12 0 1 0 12 12A12 12 0 0 0 16 4" />
                <path fill="currentColor" d="M20.59 22L15 16.41V7h2v8.58l5 5.01z" />
              </svg>
              <span className="font-pressstart text-[7px] sm:text-[10px] uppercase whitespace-nowrap">
                {formattedTime}
              </span>
            </div>
          </div>

          {/* SIGN OUT BUTTON */}
          <button
            onClick={() => setShowLogoutModal(true)}
            title="Logout"
            className="h-8 sm:h-11 bg-theme-danger border-2 border-theme-dark px-1.5 sm:px-3 rounded-[8px] sm:rounded-[10px] flex items-center justify-center gap-1 sm:gap-2 transition-all duration-150 retro-shadow cursor-pointer shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24">
              <path d="M0 0h24v24H0z" fill="none" />
              <path fill="currentColor" d="M9 20.75H6a2.64 2.64 0 0 1-2.75-2.53V5.78A2.64 2.64 0 0 1 6 3.25h3a.75.75 0 0 1 0 1.5H6a1.16 1.16 0 0 0-1.25 1v12.47a1.16 1.16 0 0 0 1.25 1h3a.75.75 0 0 1 0 1.5Zm7-4a.74.74 0 0 1-.53-.22a.75.75 0 1 1 0-1.06L18.94 12l-3.47-3.47a.75.75 0 1 1 1.06-1.06l4 4a.75.75 0 0 1 0 1.06l-4 4a.74.74 0 0 1-.53.22" />
              <path fill="currentColor" d="M20 12.75H9a.75.75 0 0 1 0-1.5h11a.75.75 0 0 1 0 1.5" />
            </svg>
            <span className="font-pressstart text-[8px] sm:text-[11px] text-white hidden sm:inline">SIGN OUT</span>
          </button>
        </div>
      </header>

      {/* LOGOUT MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-dark/50">
          <div className="bg-theme-surface border-2 border-theme-dark rounded-[12px] p-6 max-w-sm w-full shadow-xl flex flex-col gap-4 text-center">
            <h3 className="font-pressstart text-[14px] text-theme-dark">Sign Out</h3>
            <p className="font-pressstart text-[10px] text-theme-dark/80 leading-normal">
              Are you sure you want to sign out?
            </p>
            <div className="flex gap-3 justify-center mt-2">
              <button 
                onClick={() => {
                  localStorage.removeItem('active_user_email');
                  navigate('/auth#login');
                }} 
                className="bg-theme-danger text-white border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[10px] cursor-pointer hover:opacity-90"
              >
                Yes
              </button>
              <button 
                onClick={() => setShowLogoutModal(false)} 
                className="bg-theme-muted text-theme-dark border-2 border-theme-dark px-4 py-2 rounded-[8px] font-pressstart text-[10px] cursor-pointer hover:opacity-80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}