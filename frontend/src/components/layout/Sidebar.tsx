import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NetScopeLogo } from '../common/NetScopeLogo';
import {
  LayoutDashboard,
  Server,
  Share2,
  Radio,
  Wrench,
  AlertTriangle,
  BarChart3,
  UserCheck,
  Settings,
  ShieldCheck,
  ShieldAlert,
  X,
  History,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/devices', label: 'Devices', icon: Server },
    { to: '/topology', label: 'Cyber Topology', icon: Share2 },
    { to: '/discovery', label: 'Subnet Discovery', icon: Radio },
    { to: '/troubleshooting', label: 'Cyber Diagnostics', icon: Wrench },
    { to: '/security-hub', label: 'Security & Config Hub', icon: ShieldAlert },
    { to: '/web-sentinel', label: 'Web & Cyber Sentinel', icon: ShieldCheck },
    { to: '/alerts', label: 'Alerts Center', icon: AlertTriangle },
    { to: '/reports', label: 'SLA & Reports', icon: BarChart3 },
    { to: '/profile', label: 'My Profile', icon: UserCheck },
  ];

  if (isAdmin) {
    navItems.push({ to: '/activity-logs', label: 'Activity Logs', icon: History });
    navItems.push({ to: '/settings', label: 'Platform Settings', icon: Settings });
  }

  const renderNavLinks = () => (
    <div className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition duration-150 ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-semibold'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-[#111827] border border-transparent'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );

  const renderUserBadge = () => (
    <div className="space-y-3">
      {user && (
        <NavLink
          to="/profile"
          onClick={onClose}
          className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-800/80 bg-[#0E1424] hover:border-cyan-500/40 hover:bg-[#111827] transition group"
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-xs font-bold overflow-hidden shrink-0">
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
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold text-gray-200 truncate group-hover:text-cyan-400 transition font-sans">
              {user.full_name}
            </span>
            <span className="text-[10px] font-mono text-cyan-400/70 truncate uppercase">
              {user.role} &bull; @{user.username}
            </span>
          </div>
        </NavLink>
      )}

      {/* Footer info box */}
      <div className="border-t border-gray-800/80 pt-3 px-1 text-xs font-mono text-gray-400">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span>NetScope Core</span>
          <span className="text-cyan-400">v1.0.0</span>
        </div>
        <p className="text-[10px] text-gray-400">Dual-Engine Ping &amp; Pure-SNMP</p>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Static Sidebar (Always visible on md and up) */}
      <aside className="hidden md:flex w-64 border-r border-[#1F2937] bg-[#0B0F19] flex-col justify-between p-4 min-h-[calc(100vh-4rem)] shrink-0">
        <div className="space-y-6">
          <div>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-gray-400 px-3 block mb-2">
              NOC Operations
            </span>
            {renderNavLinks()}
          </div>
        </div>
        {renderUserBadge()}
      </aside>

      {/* 2. Mobile Responsive Drawer (< md) */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0B0F19] border-r border-gray-800 p-4 flex flex-col justify-between overflow-y-auto shadow-2xl transform transition-transform duration-300 ease-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-5">
          {/* Mobile Drawer Header */}
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <NetScopeLogo size="sm" showTagline={false} />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition"
              title="Close Menu"
              aria-label="Close Navigation"
            >
              <X className="w-5 h-5 text-rose-400" />
            </button>
          </div>

          <div>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-gray-400 px-3 block mb-2">
              NOC Operations
            </span>
            {renderNavLinks()}
          </div>
        </div>

        {renderUserBadge()}
      </aside>
    </>
  );
};
