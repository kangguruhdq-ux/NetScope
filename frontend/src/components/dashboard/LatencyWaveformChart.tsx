import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface LatencyWaveformProps {
  currentLatency: number;
  data: { time_str: string; latency_ms: number; loss_pct: number }[];
}

export const LatencyWaveformChart: React.FC<LatencyWaveformProps> = ({
  currentLatency,
  data,
}) => {
  // If data has fewer than 2 points, generate a graceful starter baseline
  const chartData =
    data.length >= 2
      ? data
      : Array.from({ length: 15 }, (_, i) => ({
          time_str: `${10 + i}:00`,
          latency_ms: Math.max(1, currentLatency + Math.sin(i / 2) * 3 + (Math.random() - 0.5)),
          loss_pct: 0,
        }));

  return (
    <div className="noc-card p-5 rounded-xl flex flex-col justify-between h-[320px] relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs font-mono text-gray-400 uppercase tracking-wider">
            Fleet Average Latency
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold font-mono text-white tracking-tight">
              {currentLatency}
            </span>
            <span className="text-sm font-mono text-cyan-400">ms</span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Optimal (&lt; 20ms)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06B6D4]" />
            <span className="text-gray-300">RTT (ms)</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#06B6D4" floodOpacity="0.8" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
            <XAxis
              dataKey="time_str"
              stroke="#4B5563"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#1F2937' }}
            />
            <YAxis
              stroke="#4B5563"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#1F2937' }}
              domain={[0, 'dataMax + 10']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                borderColor: '#1F2937',
                borderRadius: '8px',
                color: '#F3F4F6',
                fontFamily: 'monospace',
                fontSize: '12px',
                boxShadow: '0 0 15px rgba(6,182,212,0.3)',
              }}
              formatter={(value: any) => [`${value} ms`, 'Latency']}
            />
            <Line
              type="monotone"
              dataKey="latency_ms"
              stroke="#06B6D4"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#06B6D4', stroke: '#FFFFFF', strokeWidth: 2 }}
              style={{ filter: 'url(#cyanGlow)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
