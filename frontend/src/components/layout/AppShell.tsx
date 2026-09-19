import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  demoMode?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ demoMode = false }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile drawer whenever URL route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col cyber-circuit-bg">
      <Topbar
        demoMode={demoMode}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar + Mobile Drawer */}
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-[#0B0F19]/90 max-w-full">
          <div key={location.pathname} className="page-fade-enter min-w-0 max-w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
