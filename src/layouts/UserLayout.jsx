import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function UserLayout() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FEF4E0] flex flex-col">
      <Sidebar
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <div
        id="main-wrapper"
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isExpanded ? 'md:pl-64' : 'md:pl-20'
        }`}
      >
        <Header onMobileToggle={() => setIsMobileOpen(!isMobileOpen)} />

        <main className="flex-1 p-4 sm:p-6">
          {/* Active user sub-route page renders here */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}