import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Device, LiveDashboardMetrics, Alert, HostSystemStats } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { LatencyWaveformChart } from '../components/dashboard/LatencyWaveformChart';
import { ThroughputAreaChart } from '../components/dashboard/ThroughputAreaChart';
import { PacketLossChart } from '../components/dashboard/PacketLossChart';
import { DynamicNodeUptime } from '../components/dashboard/DynamicNodeUptime';
import { IncidentAlertTicker } from '../components/dashboard/IncidentAlertTicker';
import { QuickStatusGrid } from '../components/dashboard/QuickStatusGrid';
import { ActivityLogDeck } from '../components/dashboard/ActivityLogDeck';
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Wrench,
  Percent,
  RefreshCw,
  Cpu,
  HardDrive,
  Activity,
  Zap,
  ShieldCheck,
  Search,
  ArrowRight,
  Database,
  Radio,
  Layers,
  Terminal,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [metrics, setMetrics] = useState<LiveDashboardMetrics | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [throughputHistory, setThroughputHistory] = useState<any[]>([]);
  const [hostStats, setHostStats] = useState<HostSystemStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const { registerHandler } = useWebSocket();

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [m, d, a, th, hs] = await Promise.all([
        api.getDashboardMetrics(),
        api.listDevices(),
        api.listAlerts({ status: 'ACTIVE' }),
        api.getThroughputHistory(),
        api.getHostSystemStats().catch(() => null),
      ]);
      setMetrics(m);
      setDevices(d);
      setAlerts(a);
      setThroughputHistory(th);
      if (hs) setHostStats(hs);
    } catch (_) {
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen to real-time WebSocket updates
    const unregister = registerHandler((type, data) => {
      if (type === 'METRIC_UPDATE') {
        // Update device in state
        setDevices((prev) =>
          prev.map((dev) =>
            dev.id === data.device_id
              ? {
                  ...dev,
                  status: data.status,
                  current_latency_ms: data.latency_ms,
                  current_packet_loss_pct: data.packet_loss_pct,
                  uptime_seconds: data.uptime_seconds ?? dev.uptime_seconds,
                }
              : dev
          )
        );

        // Append to throughput history
        setThroughputHistory((prev) => {
          const nowStr = new Date().toLocaleTimeString();
          const next = [
            ...prev.slice(-19),
            {
              time_str: nowStr,
              rx_kbps: (data.rx_bps || 0) / 1000.0,
              tx_kbps: (data.tx_bps || 0) / 1000.0,
              latency_ms: data.latency_ms || 1,
              loss_pct: data.packet_loss_pct || 0,
            },
          ];
          return next;
        });
      } else if (type === 'ALERT_TRIGGERED') {
        api.listAlerts().then(setAlerts).catch(() => {});
      }
    });

    // Background interval sync every 20s
    const interval = setInterval(loadData, 20000);
    return () => {
      unregister();
      clearInterval(interval);
    };
  }, [loadData, registerHandler]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Row with Refresh and Cluster Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-white tracking-tight">
            Network Operations Center
          </h1>
          <p className="text-xs font-mono text-cyan-400 mt-0.5">
            Real-Time Network Diagnostics &amp; Physical Infrastructure Telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-800 bg-[#111827] hover:border-cyan-500/40 text-gray-300 text-xs font-mono transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Top Status Counters matching media_1789774822979.png */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <MetricCard
          label="Total Devices"
          value={metrics?.total_devices ?? devices.length}
          statusColor="cyan"
          icon={<Server className="w-4 h-4 text-cyan-400" />}
          subtitle="Monitored Fleet"
        />
        <MetricCard
          label="UP (Healthy)"
          value={metrics?.devices_up ?? devices.filter((d) => d.status === 'UP').length}
          statusColor="emerald"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          subtitle="Online &amp; Stable"
        />
        <MetricCard
          label="Degraded"
          value={metrics?.devices_degraded ?? devices.filter((d) => d.status === 'DEGRADED').length}
          statusColor="amber"
          icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
          subtitle="High RTT / Loss"
        />
        <MetricCard
          label="Down"
          value={metrics?.devices_down ?? devices.filter((d) => d.status === 'DOWN').length}
          statusColor="rose"
          icon={<AlertOctagon className="w-4 h-4 text-rose-400" />}
          subtitle="Unreachable Nodes"
        />
        <MetricCard
          label="Maintenance"
          value={metrics?.devices_maintenance ?? devices.filter((d) => d.status === 'MAINTENANCE').length}
          statusColor="purple"
          icon={<Wrench className="w-4 h-4 text-purple-400" />}
          subtitle="Alerts Suppressed"
        />
        <MetricCard
          label="Availability SLA"
          value={`${metrics?.sla_uptime_pct ?? 99.9}%`}
          statusColor="cyan"
          icon={<Percent className="w-4 h-4 text-cyan-400" />}
          subtitle="30-Day Target 99.9%"
        />
      </div>

      {/* Fleet Device Composition Breakdown */}
      <div className="noc-card p-4 rounded-xl border border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold font-sans text-white uppercase tracking-wider">
            Fleet Hardware Composition
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {[
            { label: 'Routers', type: 'ROUTER', count: devices.filter(d => d.device_type === 'ROUTER').length, color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30' },
            { label: 'Switches', type: 'SWITCH', count: devices.filter(d => d.device_type === 'SWITCH').length, color: 'text-blue-400 bg-blue-950/40 border-blue-500/30' },
            { label: 'Access Points', type: 'ACCESS_POINT', count: devices.filter(d => d.device_type === 'ACCESS_POINT').length, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30' },
            { label: 'Servers', type: 'SERVER', count: devices.filter(d => d.device_type === 'SERVER').length, color: 'text-purple-400 bg-purple-950/40 border-purple-500/30' },
            { label: 'Workstations', type: 'PC', count: devices.filter(d => d.device_type === 'PC').length, color: 'text-amber-400 bg-amber-950/40 border-amber-500/30' },
            { label: 'Printers', type: 'PRINTER', count: devices.filter(d => d.device_type === 'PRINTER').length, color: 'text-gray-300 bg-gray-900 border-gray-700' },
          ].map((item) => (
            <div
              key={item.label}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${item.color}`}
            >
              <span className="font-semibold text-gray-300">{item.label}:</span>
              <span className="font-bold text-white text-sm">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Physical Host Server Resource Telemetry Deck (Real psutil Data) */}
      {hostStats && (
        <div className="noc-card p-5 rounded-xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.06)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold font-sans text-white flex items-center gap-2">
                  Physical Host Server Telemetry
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono">
                    LIVE PSUTIL ENGINE
                  </span>
                </h2>
                <p className="text-[11px] font-mono text-gray-400">
                  {hostStats.os_name} &bull; {hostStats.cpu_cores_count} Logical CPU Cores
                </p>
              </div>
            </div>
            <div className="text-xs font-mono text-gray-400">
              Host Uptime:{' '}
              <span className="text-cyan-300 font-bold">
                {Math.floor(hostStats.host_uptime_seconds / 86400)}d {Math.floor((hostStats.host_uptime_seconds % 86400) / 3600)}h {Math.floor((hostStats.host_uptime_seconds % 3600) / 60)}m
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
            {/* CPU Utilization */}
            <div className="p-3.5 rounded-lg bg-black/40 border border-gray-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" /> CPU Load
                </span>
                <span className="text-white font-bold">{hostStats.cpu_percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    hostStats.cpu_percent > 80 ? 'bg-rose-500' : hostStats.cpu_percent > 50 ? 'bg-amber-500' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${Math.min(hostStats.cpu_percent, 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-gray-500 flex justify-between">
                <span>{hostStats.cpu_cores_count} Hardware Cores</span>
                <span>Active Scheduler</span>
              </div>
            </div>

            {/* RAM Utilization */}
            <div className="p-3.5 rounded-lg bg-black/40 border border-gray-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" /> RAM Memory
                </span>
                <span className="text-white font-bold">{hostStats.ram_percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    hostStats.ram_percent > 85 ? 'bg-rose-500' : hostStats.ram_percent > 65 ? 'bg-amber-500' : 'bg-purple-400'
                  }`}
                  style={{ width: `${Math.min(hostStats.ram_percent, 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-gray-500 flex justify-between">
                <span>Used: {(hostStats.ram_used_mb / 1024).toFixed(1)} GB</span>
                <span>Total: {(hostStats.ram_total_mb / 1024).toFixed(1)} GB</span>
              </div>
            </div>

            {/* Disk Utilization */}
            <div className="p-3.5 rounded-lg bg-black/40 border border-gray-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Disk Storage
                </span>
                <span className="text-white font-bold">{hostStats.disk_percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    hostStats.disk_percent > 90 ? 'bg-rose-500' : hostStats.disk_percent > 75 ? 'bg-amber-500' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(hostStats.disk_percent, 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-gray-500 flex justify-between">
                <span>Free: {hostStats.disk_free_gb.toFixed(1)} GB</span>
                <span>Total: {hostStats.disk_total_gb.toFixed(1)} GB</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action NOC Command Center */}
      <div className="noc-card p-5 rounded-xl border border-gray-800 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold font-sans text-white">
              NOC Quick Action Command Center
            </h2>
          </div>
          <span className="text-[11px] font-mono text-gray-500">
            Instant 1-Click Cyber &amp; Diagnostic Shortcuts
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
          <button
            onClick={() => navigate('/troubleshooting?tab=traceroute')}
            className="p-3 rounded-lg bg-[#0E1526] hover:bg-[#141f38] border border-cyan-500/20 hover:border-cyan-500/50 text-left transition group"
          >
            <Zap className="w-4 h-4 text-cyan-400 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white group-hover:text-cyan-300">Traceroute</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Hop-by-hop RTT</div>
          </button>

          <button
            onClick={() => navigate('/security-hub?tab=vulnerability')}
            className="p-3 rounded-lg bg-[#0E1526] hover:bg-[#141f38] border border-rose-500/20 hover:border-rose-500/50 text-left transition group"
          >
            <ShieldCheck className="w-4 h-4 text-rose-400 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white group-hover:text-rose-300">Port Audit</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Vulnerability scan</div>
          </button>

          <button
            onClick={() => navigate('/troubleshooting?tab=speedtest')}
            className="p-3 rounded-lg bg-[#0E1526] hover:bg-[#141f38] border border-purple-500/20 hover:border-purple-500/50 text-left transition group"
          >
            <Activity className="w-4 h-4 text-purple-400 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white group-hover:text-purple-300">Speedtest</div>
            <div className="text-[10px] text-gray-400 mt-0.5">ISP throughput</div>
          </button>

          <button
            onClick={() => navigate('/troubleshooting?tab=dns')}
            className="p-3 rounded-lg bg-[#0E1526] hover:bg-[#141f38] border border-blue-500/20 hover:border-blue-500/50 text-left transition group"
          >
            <Search className="w-4 h-4 text-blue-400 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white group-hover:text-blue-300">DNS Sentinel</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Multi-resolver test</div>
          </button>

          <button
            onClick={() => navigate('/web-sentinel')}
            className="p-3 rounded-lg bg-[#0E1526] hover:bg-[#141f38] border border-emerald-500/20 hover:border-emerald-500/50 text-left transition group"
          >
            <Radio className="w-4 h-4 text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white group-hover:text-emerald-300">Web Sentinel</div>
            <div className="text-[10px] text-gray-400 mt-0.5">SSL &amp; HTTP audit</div>
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="p-3 rounded-lg bg-[#0E1526] hover:bg-[#141f38] border border-amber-500/20 hover:border-amber-500/50 text-left transition group"
          >
            <Database className="w-4 h-4 text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white group-hover:text-amber-300">Storage Deck</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Vacuum &amp; cleanup</div>
          </button>
        </div>
      </div>

      {/* Waveform & Bandwidth Area Charts matching Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <LatencyWaveformChart
          currentLatency={metrics?.fleet_avg_latency_ms || 14}
          data={throughputHistory}
        />
        <ThroughputAreaChart
          currentRx={metrics?.total_rx_bps || 45200000}
          currentTx={metrics?.total_tx_bps || 18400000}
          data={throughputHistory}
        />
      </div>

      {/* Dynamic Uptime & Lower Deck Grid matching media_1789774822979.png */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-5">
          <PacketLossChart
            currentLoss={metrics?.global_packet_loss_pct || 0.01}
            data={throughputHistory}
          />
          <IncidentAlertTicker alerts={alerts} />
        </div>

        <div className="lg:col-span-2 space-y-5">
          <DynamicNodeUptime devices={devices} />
          <QuickStatusGrid devices={devices} />
        </div>
      </div>

      {/* Admin Exclusive: Live Platform Activity & Audit Trail Deck */}
      {isAdmin && <ActivityLogDeck />}
    </div>
  );
};

