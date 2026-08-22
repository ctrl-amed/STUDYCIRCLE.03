import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export default function AdminLayout() {
  const location = useLocation();

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard' },
    { path: '/admin/rooms', label: 'Rooms' },
    { path: '/admin/users', label: 'Users' },
  ];

  return (
    <div className="min-h-screen bg-[#FAE9CE] text-[#3D2013] flex flex-col md:flex-row">
      {/* Admin Sidebar Header */}
      <aside className="w-full md:w-64 bg-[#FEF4E0] border-b-2 md:border-b-0 md:border-r-2 border-[#3D2013] p-4 flex flex-col gap-4">
        <div className="border-b-2 border-[#3D2013]/20 pb-3">
          <span className="font-pressstart text-[12px] text-[#E87339]">
            ADMIN PANEL
          </span>
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`font-pressstart text-[10px] p-2.5 rounded-[6px] border border-[#3D2013] transition-all ${
                  isActive
                    ? 'bg-[#E87339] text-[#FFFFF6]'
                    : 'bg-[#FAE9CE] hover:bg-[#FDE4D0] text-[#3D2013]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Admin Content Wrapper */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}