import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface ThroughputAreaChartProps {
  currentRx: number; // bps
  currentTx: number; // bps
  data: { time_str: string; rx_kbps: number; tx_kbps: number }[];
}

export const ThroughputAreaChart: React.FC<ThroughputAreaChartProps> = ({
  currentRx,
  currentTx,
  data,
}) => {
  const formatSpeed = (bps: number) => {
    if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(2)} Gbps`;
    if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
    if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} Kbps`;
    return `${bps.toFixed(0)} bps`;
  };

  const chartData =
    data.length >= 2
      ? data
      : Array.from({ length: 15 }, (_, i) => ({
          time_str: `${10 + i}:00`,
          rx_kbps: 45000 + Math.sin(i / 2) * 15000 + Math.random() * 3000,
          tx_kbps: 18000 + Math.cos(i / 2) * 8000 + Math.random() * 2000,
        }));

  return (
    <div className="noc-card p-5 rounded-xl flex flex-col justify-between h-[320px] relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs font-mono text-gray-400 uppercase tracking-wider">
            Live Interface Throughput
          </div>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono text-gray-400">RX:</span>
              <span className="text-lg font-bold font-mono text-cyan-400">
                {formatSpeed(currentRx)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono text-gray-400">TX:</span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                {formatSpeed(currentTx)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-gray-300">Inbound (RX)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-gray-300">Outbound (TX)</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
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
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}M`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                borderColor: '#1F2937',
                borderRadius: '8px',
                color: '#F3F4F6',
                fontFamily: 'monospace',
                fontSize: '12px',
              }}
              formatter={(value: any, name: string) => [
                `${(Number(value) / 1000).toFixed(2)} Mbps`,
                name === 'rx_kbps' ? 'Inbound RX' : 'Outbound TX',
              ]}
            />
            <Area
              type="monotone"
              dataKey="rx_kbps"
              stroke="#06B6D4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#rxGradient)"
            />
            <Area
              type="monotone"
              dataKey="tx_kbps"
              stroke="#10B981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#txGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
