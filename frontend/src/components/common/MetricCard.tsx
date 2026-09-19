import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  change?: string;
  isPositive?: boolean;
  statusColor?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' | 'gray';
  icon?: React.ReactNode;
  subtitle?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  change,
  isPositive,
  statusColor = 'cyan',
  icon,
  subtitle,
}) => {
  const colorMap = {
    cyan: 'text-cyan-400 border-cyan-500/20 shadow-[0_0_15px_-3px_rgba(6,182,212,0.15)]',
    emerald: 'text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]',
    amber: 'text-amber-400 border-amber-500/20 shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)]',
    rose: 'text-rose-400 border-rose-500/20 shadow-[0_0_15px_-3px_rgba(244,63,94,0.2)]',
    purple: 'text-purple-400 border-purple-500/20 shadow-[0_0_15px_-3px_rgba(139,92,246,0.15)]',
    gray: 'text-gray-300 border-gray-700/50',
  };

  return (
    <div className={`noc-card p-4 rounded-xl relative overflow-hidden flex flex-col justify-between ${colorMap[statusColor]}`}>
      {/* Background corner glow */}
      <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-cyan-500/5 blur-xl pointer-events-none" />

      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-mono font-medium uppercase tracking-wider text-gray-400">
          {label}
        </span>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span className="text-2xl lg:text-3xl font-bold font-mono tracking-tight text-white">
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-gray-400">{unit}</span>}
      </div>

      <div className="flex items-center justify-between text-xs mt-1">
        {subtitle && <span className="text-gray-400 font-mono">{subtitle}</span>}
        {change && (
          <span
            className={`font-mono text-xs px-1.5 py-0.5 rounded ${
              isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
};
