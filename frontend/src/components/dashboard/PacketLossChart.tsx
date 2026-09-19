import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface PacketLossChartProps {
  currentLoss: number;
  data: { time_str: string; loss_pct: number }[];
}

export const PacketLossChart: React.FC<PacketLossChartProps> = ({ currentLoss, data }) => {
  const chartData =
    data.length >= 2
      ? data
      : Array.from({ length: 15 }, (_, i) => ({
          time_str: `${10 + i}:00`,
          loss_pct: Math.max(0, currentLoss + (Math.random() < 0.2 ? Math.random() * 0.05 : 0)),
        }));

  return (
    <div className="noc-card p-4 rounded-xl flex flex-col justify-between h-[155px] relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
          Global Packet Loss
        </span>
        <span
          className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
            currentLoss > 5.0
              ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          {currentLoss.toFixed(2)}%
        </span>
      </div>

      <div className="flex-1 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time_str" hide />
            <YAxis hide domain={[0, 10]} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                borderColor: '#1F2937',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
              formatter={(val: any) => [`${val}%`, 'Loss']}
            />
            <Area
              type="monotone"
              dataKey="loss_pct"
              stroke="#06B6D4"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#lossGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
