import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Device, MonitoringSample } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { DeviceTypeIcon } from '../components/common/DeviceTypeIcon';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  ArrowLeft,
  Activity,
  Server,
  Layers,
  BarChart2,
  Clock,
  HardDrive,
  Cpu,
  Radio,
  Play,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const DeviceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const deviceId = parseInt(id || '0');

  const [device, setDevice] = useState<Device | null>(null);
  const [samples, setSamples] = useState<MonitoringSample[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'interfaces' | 'outages'>('overview');
  const [chartRange, setChartRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Live Diagnostic Ping
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<any | null>(null);

  const fetchDeviceData = async () => {
    if (!deviceId) return;
    try {
      const [dev, samp, evts] = await Promise.all([
        api.getDevice(deviceId),
        api.getDeviceSamples(deviceId, chartRange),
        api.getNetworkEvents(deviceId),
      ]);
      setDevice(dev);
      setSamples(samp);
      setEvents(evts);
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceData();
    const interval = setInterval(fetchDeviceData, 15000);
    return () => clearInterval(interval);
  }, [deviceId, chartRange]);

  const handleLivePing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await api.livePing(deviceId);
      setPingResult(res);
    } catch (err: any) {
      setPingResult({ error: err.message || 'Live ping failed' });
    } finally {
      setIsPinging(false);
    }
  };

  const formatSpeed = (bps: number) => {
    if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(2)} Gbps`;
    if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
    if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} Kbps`;
    return `${bps.toFixed(0)} bps`;
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  if (isLoading && !device) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-xs font-mono text-cyan-400">
        <Activity className="w-5 h-5 animate-spin mr-2" /> Loading Device Specifications...
      </div>
    );
  }

  if (!device) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-mono text-white mb-2">Device Not Found</h2>
        <Link to="/devices" className="text-cyan-400 font-mono text-xs hover:underline">
          Return to Devices List
        </Link>
      </div>
    );
  }

  const chartData = samples.map((s) => ({
    time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    latency: s.latency_ms,
    loss: s.packet_loss_pct,
    cpu: s.cpu_usage_pct,
    memory: s.memory_usage_pct,
    rx: s.rx_bps_total / 1000.0,
    tx: s.tx_bps_total / 1000.0,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Back button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/devices"
            className="p-2 rounded-lg border border-gray-800 hover:border-cyan-500/40 text-gray-400 hover:text-cyan-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <DeviceTypeIcon type={device.device_type} className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-sans text-white">{device.name}</h1>
                <StatusBadge status={device.status} size="sm" />
              </div>
              <p className="text-xs font-mono text-gray-400">
                {device.ip_address} &bull; {device.location || 'Location unassigned'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLivePing}
            disabled={isPinging}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono transition shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 text-cyan-400 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{isPinging ? 'Executing Ping...' : 'Live Diagnostic Ping Now'}</span>
          </button>
        </div>
      </div>

      {/* Live Ping Output Banner if active */}
      {pingResult && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-start justify-between ${
            pingResult.is_alive
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold">
              {pingResult.is_alive ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
              <span>{pingResult.is_alive ? 'Host Reachable' : 'Host Unreachable'}</span>
              <span className="text-[10px] text-gray-400">({pingResult.engine_used})</span>
            </div>
            <div>RTT: {pingResult.latency_ms ?? 0} ms | Packet Loss: {pingResult.packet_loss_pct}%</div>
            <div className="text-[11px] text-gray-400 whitespace-pre-wrap">{pingResult.output}</div>
          </div>
          <button onClick={() => setPingResult(null)} className="text-gray-400 hover:text-white ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-800 flex gap-6 text-xs font-mono">
        {[
          { id: 'overview', label: 'Hardware Overview', icon: Server },
          { id: 'performance', label: 'Performance Charts', icon: BarChart2 },
          { id: 'interfaces', label: `Interfaces (${device.interfaces?.length || 0})`, icon: Layers },
          { id: 'outages', label: `Outage History (${events.length})`, icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 flex items-center gap-2 border-b-2 transition ${
                active
                  ? 'border-cyan-400 text-cyan-400 font-semibold'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="noc-card p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold font-sans text-white border-b border-gray-800 pb-2">
              System &amp; Network Identification
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-gray-400 block mb-0.5">IP Address:</span>
                <span className="text-cyan-300 font-bold">{device.ip_address}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Hostname:</span>
                <span className="text-gray-200">{device.hostname || 'None'}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Device Type:</span>
                <span className="text-gray-200">{device.device_type}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">System Uptime:</span>
                <span className="text-emerald-400">{formatUptime(device.uptime_seconds)}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Polling Interval:</span>
                <span className="text-gray-200">{device.monitoring_interval_seconds} seconds</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Consecutive Failures:</span>
                <span className={device.consecutive_failures > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                  {device.consecutive_failures}
                </span>
              </div>
            </div>
          </div>

          <div className="noc-card p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold font-sans text-white border-b border-gray-800 pb-2">
              Protocol Configuration &amp; Telemetry
            </h3>
            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-gray-400 block mb-1">Active Protocols:</span>
                <div className="flex gap-1.5">
                  {device.protocols?.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              {device.protocols?.includes('SNMP') && (
                <div className="p-3 bg-black/40 rounded-lg border border-gray-800 space-y-1">
                  <div className="text-gray-300 font-semibold">SNMP Agent Settings</div>
                  <div className="text-gray-400 text-[11px]">
                    Version: {device.snmp_version} &bull; Port: {device.snmp_port} &bull; Community: {device.snmp_community}
                  </div>
                </div>
              )}
              {device.tcp_check_ports && device.tcp_check_ports.length > 0 && (
                <div>
                  <span className="text-gray-400 block mb-1">Monitored TCP Ports:</span>
                  <div className="flex gap-1.5">
                    {device.tcp_check_ports.map((port) => (
                      <span key={port} className="px-2 py-0.5 rounded bg-black/50 border border-gray-800 text-gray-300">
                        {port}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {device.http_health_url && (
                <div>
                  <span className="text-gray-400 block mb-1">HTTP Health Probe URL:</span>
                  <span className="text-cyan-400">{device.http_health_url}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Performance Charts */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Time range selector */}
          <div className="flex justify-end gap-2 text-xs font-mono">
            {(['1h', '6h', '24h', '7d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setChartRange(r)}
                className={`px-3 py-1 rounded border transition ${
                  chartRange === r
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                    : 'bg-black/30 text-gray-400 border-gray-800 hover:border-gray-700'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Latency & Loss Chart */}
            <div className="noc-card p-5 rounded-xl h-[300px]">
              <div className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">
                Latency RTT &amp; Packet Loss Trend
              </div>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="time" stroke="#4B5563" fontSize={10} />
                  <YAxis stroke="#4B5563" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#FFF' }} />
                  <Line type="monotone" dataKey="latency" stroke="#06B6D4" strokeWidth={2} dot={false} name="RTT (ms)" />
                  <Line type="monotone" dataKey="loss" stroke="#F43F5E" strokeWidth={2} dot={false} name="Loss (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Throughput RX/TX Chart */}
            <div className="noc-card p-5 rounded-xl h-[300px]">
              <div className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">
                Bandwidth Throughput (RX / TX)
              </div>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="time" stroke="#4B5563" fontSize={10} />
                  <YAxis stroke="#4B5563" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}M`} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#FFF' }} />
                  <Line type="monotone" dataKey="rx" stroke="#06B6D4" strokeWidth={2} dot={false} name="Inbound RX (Kbps)" />
                  <Line type="monotone" dataKey="tx" stroke="#10B981" strokeWidth={2} dot={false} name="Outbound TX (Kbps)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Interfaces Table */}
      {activeTab === 'interfaces' && (
        <div className="noc-card rounded-xl overflow-hidden border border-gray-800">
          <div className="p-4 bg-[#0E1424] border-b border-gray-800 flex items-center justify-between text-xs font-mono">
            <span className="text-gray-300 font-semibold">Physical Port Interfaces</span>
            <span className="text-cyan-400">Formula: ((curr_octets - prev_octets) * 8) / delta_sec</span>
          </div>
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-gray-800 text-gray-400 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Index</th>
                <th className="py-3 px-4">Interface Name</th>
                <th className="py-3 px-4">Port Status</th>
                <th className="py-3 px-4">Negotiated Speed</th>
                <th className="py-3 px-4">RX Bandwidth (Live)</th>
                <th className="py-3 px-4">TX Bandwidth (Live)</th>
                <th className="py-3 px-4">Total Octets (In / Out)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {device.interfaces?.map((iface) => (
                <tr key={iface.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-3 px-4 text-gray-400">{iface.if_index}</td>
                  <td className="py-3 px-4 text-white font-bold">{iface.name}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={iface.oper_status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-gray-300">{formatSpeed(iface.speed_bps)}</td>
                  <td className="py-3 px-4 text-cyan-400 font-bold">{formatSpeed(iface.rx_bps)}</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">{formatSpeed(iface.tx_bps)}</td>
                  <td className="py-3 px-4 text-gray-400 text-[11px]">
                    {(iface.curr_in_octets / 1_000_000).toFixed(1)}MB / {(iface.curr_out_octets / 1_000_000).toFixed(1)}MB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Outage History */}
      {activeTab === 'outages' && (
        <div className="noc-card p-5 rounded-xl space-y-4">
          <h3 className="text-sm font-bold font-sans text-white border-b border-gray-800 pb-2">
            Status Transition &amp; Incident History
          </h3>
          {events.length === 0 ? (
            <div className="text-xs font-mono text-gray-400 py-6 text-center">
              No outage or transition events recorded for this device.
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 bg-black/40 rounded-lg border border-gray-800 text-xs font-mono flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge status={evt.new_status} size="sm" />
                    <div>
                      <span className="text-gray-200">{evt.description}</span>
                      <span className="text-gray-400 text-[11px] block">
                        Transition from {evt.old_status} to {evt.new_status}
                      </span>
                    </div>
                  </div>
                  <span className="text-gray-400 text-[11px]">
                    {new Date(evt.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
