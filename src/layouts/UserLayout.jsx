import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function UserLayout() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isKitsuOpen, setIsKitsuOpen] = useState(false);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [isMultiplayer, setIsMultiplayer] = useState(false);

  const location = useLocation();

  // Detect whether the user is in multiplayer mode
  useEffect(() => {
    const checkMultiplayer = () => {
      const storedSession = localStorage.getItem('activeRoomSession');
      const stateIsMultiplayer = location.state?.isMultiplayer;
      
      setIsMultiplayer(Boolean(storedSession || stateIsMultiplayer));
    };

    checkMultiplayer();

    // Listen for storage changes in case room session is removed or updated
    window.addEventListener('storage', checkMultiplayer);
    return () => window.removeEventListener('storage', checkMultiplayer);
  }, [location]);

  // Listen for iframe close requests posted from KitsuAI & CreateSession
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data === 'CLOSE_KITSU_MODAL') {
        setIsKitsuOpen(false);
      }
      if (e.data === 'CLOSE_CREATE_SESSION_MODAL') {
        setIsCreateSessionOpen(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const openKitsuModal = () => setIsKitsuOpen(true);
  const openCreateSessionModal = () => setIsCreateSessionOpen(true);

  // Determine correct base URL for iframe rendering
  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  return (
    <div className="min-h-screen bg-theme-muted relative text-theme-dark flex flex-col">
      {/* BACKGROUND TEXTURE LAYERS */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(61, 32, 19, 0.06) 1px, transparent 1px)',
          backgroundSize: '100% 5px',
        }}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute right-[20%] sm:right-[25%] md:right-[90%] top-[10%] sm:top-[8%] w-[250px] h-[250px] sm:w-[450px] sm:h-[600px] rounded-full opacity-50 filter blur-3xl mix-blend-multiply"
          style={{
            background:
              'radial-gradient(circle, rgba(253, 146, 62, 0.45) 0%, rgba(253, 146, 62, 0) 70%)',
          }}
        />
        <div
          className="absolute left-[20%] sm:left-[25%] md:left-[90%] top-[52%] sm:top-[54%] w-[250px] h-[250px] sm:w-[450px] sm:h-[600px] rounded-full opacity-50 filter blur-3xl mix-blend-multiply"
          style={{
            background:
              'radial-gradient(circle, rgba(253, 146, 62, 0.45) 0%, rgba(253, 146, 62, 0) 70%)',
          }}
        />
        <div
          className="absolute left-[70%] sm:left-[75%] md:left-[80%] top-[-5%] w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full opacity-45 filter blur-3xl mix-blend-multiply"
          style={{
            background:
              'radial-gradient(circle, rgba(253, 146, 62, 0.4) 0%, rgba(253, 146, 62, 0) 70%)',
          }}
        />
        <div
          className="absolute right-[75%] md:right-[85%] bottom-[5%] w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full opacity-45 filter blur-3xl mix-blend-multiply"
          style={{
            background:
              'radial-gradient(circle, rgba(253, 146, 62, 0.4) 0%, rgba(253, 146, 62, 0) 70%)',
          }}
        />
      </div>

      {/* RENDER SIDEBAR ONLY WHEN NOT IN MULTIPLAYER */}
      {!isMultiplayer && (
        <Sidebar
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          onOpenKitsu={openKitsuModal}
        />
      )}

      <div
        id="main-wrapper"
        className={`relative z-10 flex-1 flex flex-col transition-all duration-300 ${
          isMultiplayer
            ? 'pl-0'
            : isExpanded
            ? 'md:pl-64'
            : 'md:pl-20'
        }`}
      >
        <Header 
          onMobileToggle={() => setIsMobileOpen(!isMobileOpen)} 
          onOpenKitsu={openKitsuModal}
        />

        <main className="flex-1 p-4 sm:p-6">
          <Outlet context={{ openKitsuModal, openCreateSessionModal }} />
        </main>
      </div>

      {/* KITSU AI OVERLAY MODAL IFRAME */}
      {isKitsuOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-theme-surface border-4 border-theme-dark">
          <iframe
            src={`${baseUrl}kitsuai-embed`}
            title="Kitsu AI Frame"
            className="w-full h-full border-none flex-grow"
          />
        </div>
      )}

      {/* CREATE SESSION OVERLAY MODAL IFRAME */}
      {isCreateSessionOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-theme-surface border-4 border-theme-dark">
          <iframe
            src={`${baseUrl}create-session-embed`}
            title="Create Session Frame"
            className="w-full h-full border-none flex-grow"
          />
        </div>
      )}
    </div>
  );
}