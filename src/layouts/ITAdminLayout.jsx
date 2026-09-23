import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ITSidebar from '../components/IT-Sidebar';
import ITHeader from '../components/IT-Header';

export default function ITAdminLayout() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

      <ITSidebar
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <div
        id="main-wrapper"
        className={`relative z-10 flex-1 flex flex-col transition-all duration-300 ${
          isExpanded ? 'md:pl-64' : 'md:pl-20'
        }`}
      >
        <ITHeader 
          onMobileToggle={() => setIsMobileOpen(!isMobileOpen)} 
        />

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}