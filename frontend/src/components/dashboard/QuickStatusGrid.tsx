import React from 'react';
import { Link } from 'react-router-dom';
import { Device } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { DeviceTypeIcon } from '../common/DeviceTypeIcon';
import { ExternalLink, Activity } from 'lucide-react';

interface QuickStatusGridProps {
  devices: Device[];
}

export const QuickStatusGrid: React.FC<QuickStatusGridProps> = ({ devices }) => {
  return (
    <div className="noc-card p-5 rounded-xl flex flex-col justify-between h-[320px] relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-mono text-gray-400 uppercase tracking-wider block">
            Device Quick-Status Grid
          </span>
          <span className="text-[11px] font-mono text-cyan-400">
            Real-Time Node Telemetry &amp; Availability
          </span>
        </div>
        <Link
          to="/devices"
          className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
        >
          All Perangkat <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-[11px]">
              <th className="pb-2 font-normal">NODE</th>
              <th className="pb-2 font-normal hidden sm:table-cell">IP ADDRESS</th>
              <th className="pb-2 font-normal">LATENCY</th>
              <th className="pb-2 font-normal text-right">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {devices.slice(0, 6).map((device) => (
              <tr key={device.id} className="hover:bg-white/[0.02] transition">
                <td className="py-2.5">
                  <Link
                    to={`/devices/${device.id}`}
                    className="flex items-center gap-2.5 text-gray-200 hover:text-cyan-400 transition"
                  >
                    <div className="w-6 h-6 rounded bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <DeviceTypeIcon type={device.device_type} className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-sans font-medium text-xs text-white truncate max-w-[140px]">
                        {device.name}
                      </span>
                      <span className="text-[10px] text-gray-400 sm:hidden">
                        {device.ip_address}
                      </span>
                    </div>
                  </Link>
                </td>
                <td className="py-2.5 text-gray-400 hidden sm:table-cell">
                  {device.ip_address}
                </td>
                <td className="py-2.5">
                  {device.current_latency_ms != null ? (
                    <span className="text-cyan-400">
                      {device.current_latency_ms} ms
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="py-2.5 text-right">
                  <StatusBadge status={device.status} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-2 border-t border-gray-800 text-[11px] font-mono text-gray-400 flex items-center justify-between">
        <span>Active Devices: {devices.length}</span>
        <span className="text-emerald-400 flex items-center gap-1">
          <Activity className="w-3 h-3 animate-pulse" /> Live Telemetry Synced
        </span>
      </div>
    </div>
  );
};
