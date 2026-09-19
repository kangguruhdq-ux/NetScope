import React from 'react';

interface NetScopeLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const NetScopeLogo: React.FC<NetScopeLogoProps> = ({
  size = 'md',
  showTagline = false,
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`relative flex items-center justify-center ${iconSizes[size]}`}>
        {/* Outer scope ring */}
        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.5)]" />
        {/* Inner crosshair reticle */}
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full text-cyan-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="2" x2="12" y2="7" />
          <line x1="12" y1="17" x2="12" y2="22" />
          <line x1="2" y1="12" x2="7" y2="12" />
          <line x1="17" y1="12" x2="22" y2="12" />
          <circle cx="12" cy="12" r="3" className="fill-cyan-400/30" />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <span className={`font-bold tracking-tight text-white font-sans ${textSizes[size]}`}>
            Net<span className="text-cyan-400">Scope</span>
          </span>
        </div>
        {showTagline && (
          <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">
            Real-Time NOC & Diagnostics
          </span>
        )}
      </div>
    </div>
  );
};
