import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { useToast } from '../../context/ToastContext';
import { NetScopeLogo } from '../common/NetScopeLogo';
import {
  LogOut,
  Activity,
  Cpu,
  Menu,
  X,
} from 'lucide-react';

interface TopbarProps {
  demoMode?: boolean;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  demoMode = false,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
}) => {
  const { user, logout } = useAuth();
  const { isConnected, isReconnecting, reconnectAttempt } = useWebSocket();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info('Anda telah berhasil keluar dari sesi sistem.', 'Logout Berhasil');
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-[#1F2937] bg-[#0E1424]/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Mobile Toggle + Brand & Cluster label */}
      <div className="flex items-center gap-2.5 sm:gap-6">
        {/* Mobile Hamburger Drawer Button */}
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl border border-gray-800 bg-[#090D16] text-gray-300 hover:text-cyan-400 hover:border-cyan-500/40 md:hidden transition"
          title={isMobileMenuOpen ? 'Tutup Menu' : 'Buka Menu'}
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5 text-rose-400" /> : <Menu className="w-5 h-5" />}
        </button>

        <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition">
          <NetScopeLogo size="sm" showTagline={false} />
        </Link>

        {/* NOC Region / Cluster indicator */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-gray-400 bg-black/40 border border-gray-800 px-2.5 py-1 rounded-md">
          <span className="text-cyan-400 font-semibold">CLUSTER_ALPHA</span>
          <span className="text-gray-600">//</span>
          <span className="text-gray-300">NOC-LOCAL</span>
        </div>
      </div>

      {/* Center / Status Indicators */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mode Tag */}
        {demoMode ? (
          <div className="hidden xs:flex items-center gap-1.5 text-xs font-mono px-2 sm:px-2.5 py-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="font-semibold tracking-wide hidden sm:inline">DEMO SIMULATOR</span>
            <span className="font-semibold tracking-wide sm:hidden">DEMO</span>
          </div>
        ) : (
          <div className="hidden xs:flex items-center gap-1.5 text-xs font-mono px-2 sm:px-2.5 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold tracking-wide hidden sm:inline">LIVE PRODUCTION</span>
            <span className="font-semibold tracking-wide sm:hidden">LIVE</span>
          </div>
        )}

        {/* Live WebSocket Status Dot */}
        <div className="flex items-center gap-2 text-xs font-mono px-2 sm:px-2.5 py-1 rounded-md bg-black/40 border border-gray-800">
          {isConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_#10B981]" />
              </span>
              <span className="text-emerald-400 font-medium hidden sm:inline">LIVE WS</span>
            </>
          ) : isReconnecting ? (
            <>
              <span className="inline-flex rounded-full h-2 w-2 bg-amber-400 animate-pulse shadow-[0_0_6px_#F59E0B]" />
              <span className="text-amber-400 font-medium hidden sm:inline">RECONNECTING ({reconnectAttempt})</span>
            </>
          ) : (
            <>
              <span className="inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_6px_#F43F5E]" />
              <span className="text-rose-400 font-medium hidden sm:inline">OFFLINE</span>
            </>
          )}
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {user && (
          <Link
            to="/profile"
            className="flex items-center gap-2 sm:gap-2.5 px-2 sm:px-2.5 py-1 rounded-lg border border-gray-800 hover:border-cyan-500/40 bg-black/30 hover:bg-black/50 transition group"
            title="Manage Personal Profile"
          >
            <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-300 text-xs font-bold overflow-hidden shrink-0">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.username.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-medium text-gray-200 group-hover:text-cyan-400 transition font-sans">
                {user.full_name}
              </span>
              <span className="text-[10px] font-mono text-cyan-400/80 uppercase">
                {user.role}
              </span>
            </div>
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg border border-gray-800 hover:border-rose-500/40 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          title="Sign Out"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
