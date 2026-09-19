import React from 'react';
import { DeviceStatus } from '../../types';

interface StatusBadgeProps {
  status: DeviceStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
}) => {
  const normalized = (status || 'UNKNOWN').toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'UP':
      case 'HEALTHY':
      case 'PASSED':
      case 'REACHABLE':
        return {
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30',
          dot: 'bg-emerald-400 shadow-[0_0_8px_#10B981]',
        };
      case 'DEGRADED':
      case 'WARNING':
        return {
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          dot: 'bg-amber-400 shadow-[0_0_8px_#F59E0B]',
        };
      case 'DOWN':
      case 'CRITICAL':
      case 'FAILED':
      case 'OFFLINE':
      case 'UNREACHABLE':
        return {
          bg: 'bg-rose-500/10',
          text: 'text-rose-400',
          border: 'border-rose-500/30',
          dot: 'bg-rose-400 shadow-[0_0_8px_#F43F5E] animate-pulse',
        };
      case 'MAINTENANCE':
        return {
          bg: 'bg-purple-500/10',
          text: 'text-purple-400',
          border: 'border-purple-500/30',
          dot: 'bg-purple-400 shadow-[0_0_8px_#8B5CF6]',
        };
      default:
        return {
          bg: 'bg-gray-800/40',
          text: 'text-gray-400',
          border: 'border-gray-700',
          dot: 'bg-gray-400',
        };
    }
  };

  const style = getStyle();
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-full border ${style.bg} ${style.text} ${style.border} ${sizeClasses[size]}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
      <span>{normalized}</span>
    </span>
  );
};
