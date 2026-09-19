import React from 'react';
import { Device } from '../../types';

interface DynamicNodeUptimeProps {
  devices: Device[];
}

export const DynamicNodeUptime: React.FC<DynamicNodeUptimeProps> = ({ devices }) => {
  return (
    <div className="noc-card p-5 rounded-xl flex flex-col justify-between h-[320px] relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-mono text-gray-400 uppercase tracking-wider block">
            Dynamic Node Uptime
          </span>
          <span className="text-[11px] font-mono text-cyan-400">
            Real-Time Heartbeat &amp; Fleet Availability
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
          <span className="inline-block w-2 h-2 rounded bg-emerald-400" /> UP
          <span className="inline-block w-2 h-2 rounded bg-amber-400" /> DEG
          <span className="inline-block w-2 h-2 rounded bg-rose-400" /> DWN
        </div>
      </div>

      {/* Grid of node uptime indicators matching the mockup */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-auto">
        {devices.slice(0, 8).map((device) => {
          const isUp = device.status === 'UP';
          const isDeg = device.status === 'DEGRADED';
          const isDown = device.status === 'DOWN';

          // Generate 10 ticks per device representing historical interval slots
          const ticks = Array.from({ length: 12 }, (_, i) => {
            if (isDown && i > 8) return 'bg-rose-500 shadow-[0_0_6px_#F43F5E]';
            if (isDeg && i > 9) return 'bg-amber-400';
            return 'bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.5)]';
          });

          return (
            <div
              key={device.id}
              className="bg-[#0B0F19]/80 border border-gray-800/80 p-2.5 rounded-lg flex flex-col justify-between hover:border-cyan-500/30 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-medium text-gray-300 truncate max-w-[90px]" title={device.name}>
                  {device.name}
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  {device.current_latency_ms ? `${device.current_latency_ms}ms` : 'UP'}
                </span>
              </div>

              {/* Vertical or horizontal tick segments */}
              <div className="grid grid-cols-6 gap-1 my-1">
                {ticks.map((tickClass, tIdx) => (
                  <div
                    key={tIdx}
                    className={`h-4 rounded-sm transition-all duration-300 ${tickClass}`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-800 text-[10px] font-mono text-gray-400">
                <span>{device.ip_address}</span>
                <span className={isDown ? 'text-rose-400' : isDeg ? 'text-amber-400' : 'text-emerald-400'}>
                  {device.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-800 text-[11px] font-mono text-gray-400">
        <span>Fleet Monitored: {devices.length} Nodes</span>
        <span className="text-emerald-400">Dual-Engine Active</span>
      </div>
    </div>
  );
};
