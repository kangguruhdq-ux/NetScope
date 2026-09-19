import React from 'react';
import {
  Router,
  Network,
  Wifi,
  Server,
  Monitor,
  Printer,
  ShieldAlert,
  Cpu,
  HelpCircle,
} from 'lucide-react';
import { DeviceType } from '../../types';

interface DeviceTypeIconProps {
  type: DeviceType | string;
  className?: string;
}

export const DeviceTypeIcon: React.FC<DeviceTypeIconProps> = ({ type, className = 'w-5 h-5' }) => {
  const norm = (type || '').toUpperCase();

  switch (norm) {
    case 'ROUTER':
      return <Router className={className} />;
    case 'SWITCH':
      return <Network className={className} />;
    case 'ACCESS_POINT':
      return <Wifi className={className} />;
    case 'SERVER':
      return <Server className={className} />;
    case 'PC':
      return <Monitor className={className} />;
    case 'PRINTER':
      return <Printer className={className} />;
    case 'FIREWALL':
      return <ShieldAlert className={className} />;
    case 'OTHER':
    default:
      return <Cpu className={className} />;
  }
};
