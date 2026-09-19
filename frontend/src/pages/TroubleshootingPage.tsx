import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import {
  Device,
  TroubleshootingReport,
  TracerouteReport,
  TracerouteHop,
  DNSBenchmarkReport,
  SpeedtestReport,
  InterfaceStatsReport,
  InterfaceStat,
} from '../types';
import {
  Wrench,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  Info,
  Zap,
  Search,
  Network,
  ArrowRight,
  ShieldCheck,
  Radio,
  Gauge,
  RefreshCw,
} from 'lucide-react';

type TabType = 'automated' | 'traceroute' | 'dns' | 'speedtest' | 'interfaces';

export const TroubleshootingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TabType) || 'automated';

  const setTab = (tab: TabType) => {
    setSearchParams({ tab });
  };

  // --- Automated Diagnostic State ---
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | ''>('');
  const [report, setReport] = useState<TroubleshootingReport | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // --- Traceroute State ---
  const [traceTarget, setTraceTarget] = useState<string>('8.8.8.8');
  const [traceMaxHops, setTraceMaxHops] = useState<number>(20);
  const [isTracing, setIsTracing] = useState<boolean>(false);
  const [traceReport, setTraceReport] = useState<TracerouteReport | null>(null);
  const [traceError, setTraceError] = useState<string>('');

  // --- DNS Benchmark State ---
  const [dnsDomain, setDnsDomain] = useState<string>('google.com');
  const [isDnsTesting, setIsDnsTesting] = useState<boolean>(false);
  const [dnsReport, setDnsReport] = useState<DNSBenchmarkReport | null>(null);
  const [dnsError, setDnsError] = useState<string>('');

  // --- Speedtest State ---
  const [isSpeedtesting, setIsSpeedtesting] = useState<boolean>(false);
  const [speedtestReport, setSpeedtestReport] = useState<SpeedtestReport | null>(null);
  const [speedtestError, setSpeedtestError] = useState<string>('');

  // --- Interface Stats State ---
  const [isRefreshingIfaces, setIsRefreshingIfaces] = useState<boolean>(false);
  const [ifaceReport, setIfaceReport] = useState<InterfaceStatsReport | null>(null);
  const [ifaceError, setIfaceError] = useState<string>('');

  useEffect(() => {
    api.listDevices().then((devs) => {
      setDevices(devs);
      if (devs.length > 0) {
        setSelectedDeviceId(devs[0].id);
      }
    });

    if (currentTab === 'interfaces') {
      fetchInterfaceStats();
    }
  }, [currentTab]);

  // --- Automated Diagnostic Execution ---
  const handleRunDiagnostics = async () => {
    if (!selectedDeviceId) return;
    setIsRunning(true);
    setReport(null);
    setErrorMsg('');

    try {
      const res = await api.runTroubleshooting(Number(selectedDeviceId));
      setReport(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Diagnostic execution encountered an error.');
    } finally {
      setIsRunning(false);
    }
  };

  // --- Traceroute Execution ---
  const handleRunTraceroute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traceTarget.trim()) return;
    setIsTracing(true);
    setTraceReport(null);
    setTraceError('');

    try {
      const res = await api.runTraceroute(traceTarget.trim(), traceMaxHops);
      setTraceReport(res);
    } catch (err: any) {
      setTraceError(err.message || 'Traceroute execution failed.');
    } finally {
      setIsTracing(false);
    }
  };

  // --- DNS Benchmark Execution ---
  const handleRunDNSBenchmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dnsDomain.trim()) return;
    setIsDnsTesting(true);
    setDnsReport(null);
    setDnsError('');

    try {
      const res = await api.runDNSBenchmark(dnsDomain.trim());
      setDnsReport(res);
    } catch (err: any) {
      setDnsError(err.message || 'DNS benchmark execution failed.');
    } finally {
      setIsDnsTesting(false);
    }
  };

  // --- Speedtest Execution ---
  const handleRunSpeedtest = async () => {
    setIsSpeedtesting(true);
    setSpeedtestReport(null);
    setSpeedtestError('');

    try {
      const res = await api.runSpeedtest();
      setSpeedtestReport(res);
    } catch (err: any) {
      setSpeedtestError(err.message || 'ISP speedtest execution failed.');
    } finally {
      setIsSpeedtesting(false);
    }
  };

  // --- Interface Stats Execution ---
  const fetchInterfaceStats = async () => {
    setIsRefreshingIfaces(true);
    setIfaceError('');

    try {
      const res = await api.getInterfaceStats();
      setIfaceReport(res);
    } catch (err: any) {
      setIfaceError(err.message || 'Failed to capture interface telemetry.');
    } finally {
      setIsRefreshingIfaces(false);
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-gray-400 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-white tracking-tight flex items-center gap-2.5">
            Cyber Diagnostics Hub
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-widest">
              Live Network Suite
            </span>
          </h1>
          <p className="text-xs font-mono text-cyan-400 mt-0.5">
            Traceroute &bull; DNS Sentinel &bull; ISP Speedtest &bull; Storm Monitor &bull; Automated Stack Verification
          </p>
        </div>
      </div>

      {/* 5-Tab Navigation Bar */}
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setTab('automated')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs transition ${
            currentTab === 'automated'
              ? 'bg-cyan-500 text-gray-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'bg-[#111827] text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Automated Troubleshooter</span>
        </button>

        <button
          onClick={() => setTab('traceroute')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs transition ${
            currentTab === 'traceroute'
              ? 'bg-cyan-500 text-gray-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'bg-[#111827] text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Hop-by-Hop Traceroute</span>
        </button>

        <button
          onClick={() => setTab('dns')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs transition ${
            currentTab === 'dns'
              ? 'bg-cyan-500 text-gray-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'bg-[#111827] text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>DNS Sentinel &amp; Benchmark</span>
        </button>

        <button
          onClick={() => setTab('speedtest')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs transition ${
            currentTab === 'speedtest'
              ? 'bg-cyan-500 text-gray-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'bg-[#111827] text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>ISP Speedtest &amp; Quality</span>
        </button>

        <button
          onClick={() => setTab('interfaces')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs transition ${
            currentTab === 'interfaces'
              ? 'bg-cyan-500 text-gray-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'bg-[#111827] text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Interface Storm Monitor</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AUTOMATED TROUBLESHOOTER                                            */}
      {/* ========================================================================= */}
      {currentTab === 'automated' && (
        <div className="space-y-6">
          <div className="noc-card p-5 rounded-xl border border-gray-800 flex flex-col sm:flex-row items-center gap-4 justify-between">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-mono text-gray-400 whitespace-nowrap">
                Target Device:
              </label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(Number(e.target.value))}
                className="w-full sm:w-80 noc-input px-3 py-2 rounded-xl text-xs font-mono"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.ip_address}) - {d.device_type}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRunDiagnostics}
              disabled={isRunning || !selectedDeviceId}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-gray-950 font-bold font-mono text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Executing 4-Step Stack Test...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run Full Diagnostics</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono">
              {errorMsg}
            </div>
          )}

          {report && (
            <div className="space-y-6">
              <div
                className={`noc-card p-5 rounded-xl border flex items-center justify-between ${
                  report.overall_verdict === 'HEALTHY'
                    ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : report.overall_verdict === 'DEGRADED'
                    ? 'border-amber-500/40 bg-amber-950/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                    : 'border-rose-500/40 bg-rose-950/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                }`}
              >
                <div>
                  <span className="text-xs font-mono text-gray-400 uppercase tracking-wider block">
                    Overall Diagnostic Verdict
                  </span>
                  <span
                    className={`text-2xl font-bold font-mono ${
                      report.overall_verdict === 'HEALTHY'
                        ? 'text-emerald-400'
                        : report.overall_verdict === 'DEGRADED'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {report.overall_verdict}
                  </span>
                </div>
                <div className="text-right text-xs font-mono text-gray-400">
                  <div>Device: {report.device_name} ({report.ip_address})</div>
                  <div>Executed: {new Date(report.executed_at).toLocaleTimeString()}</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold font-sans text-gray-200">
                  Sequential Test Results
                </h3>
                {report.steps.map((step) => (
                  <div
                    key={step.step_id}
                    className="noc-card p-4 rounded-xl border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      {getStepIcon(step.status)}
                      <div>
                        <div className="font-sans font-semibold text-sm text-white">
                          {step.title}
                        </div>
                        <div className="text-xs font-mono text-gray-400 mt-0.5">
                          {step.message}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center text-xs font-mono">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {step.duration_ms}ms
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded font-bold ${
                          step.status === 'PASSED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : step.status === 'WARNING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : step.status === 'FAILED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="noc-card p-5 rounded-xl border border-gray-800 space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                    Root Cause Analysis
                  </h4>
                  <p className="text-xs font-mono text-gray-300 leading-relaxed">
                    {report.root_cause_analysis}
                  </p>
                </div>

                <div className="noc-card p-5 rounded-xl border border-gray-800 space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                    Actionable Remediation Checklist
                  </h4>
                  <ul className="space-y-1.5 text-xs font-mono text-gray-300">
                    {report.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400">&bull;</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VISUAL HOP-BY-HOP TRACEROUTE                                        */}
      {/* ========================================================================= */}
      {currentTab === 'traceroute' && (
        <div className="space-y-6">
          <form onSubmit={handleRunTraceroute} className="noc-card p-5 rounded-xl border border-gray-800 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <span className="text-xs font-mono text-gray-400 block mb-1">Target Host or IP:</span>
              <input
                type="text"
                value={traceTarget}
                onChange={(e) => setTraceTarget(e.target.value)}
                placeholder="e.g. 8.8.8.8, 1.1.1.1, or google.com"
                className="w-full px-3 py-2 rounded-xl noc-input text-xs font-mono"
                required
              />
            </div>

            <div className="w-full sm:w-32">
              <span className="text-xs font-mono text-gray-400 block mb-1">Max Hops:</span>
              <input
                type="number"
                min={1}
                max={30}
                value={traceMaxHops}
                onChange={(e) => setTraceMaxHops(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl noc-input text-xs font-mono"
              />
            </div>

            <div className="w-full sm:w-auto self-end pt-5">
              <button
                type="submit"
                disabled={isTracing}
                className="w-full sm:w-auto px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-mono text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                {isTracing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Tracing Path...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Run Traceroute</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {traceError && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono">
              {traceError}
            </div>
          )}

          {traceReport && (
            <div className="space-y-5">
              {/* Summary Banner */}
              <div className="noc-card p-4 rounded-xl border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Target:</span>
                  <span className="text-white font-bold">{traceReport.target}</span>
                  {traceReport.target_ip && (
                    <span className="text-cyan-400">({traceReport.target_ip})</span>
                  )}
                  <span className="text-gray-600">&bull;</span>
                  <span className="text-cyan-400 font-bold">{traceReport.total_hops} Hops Recorded</span>
                </div>
                <div className="flex items-center gap-2">
                  {traceReport.destination_reached ? (
                    <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      REACHED DESTINATION
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      INCOMPLETE / TIMEOUT
                    </span>
                  )}
                  <span className="text-gray-400">{traceReport.total_time_ms} ms</span>
                </div>
              </div>

              {/* Interactive Visual Hop Node Chain */}
              <div className="noc-card p-5 rounded-xl border border-gray-800 space-y-3">
                <div className="text-xs font-bold font-sans text-white flex items-center gap-2">
                  <Network className="w-4 h-4 text-cyan-400" />
                  <span>Interactive Hop-by-Hop Topology Path</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-2">
                  {traceReport.hops.map((hop: TracerouteHop, idx: number) => (
                    <React.Fragment key={hop.hop}>
                      <div className="shrink-0 p-3 rounded-xl bg-[#090E1A] border border-gray-800 min-w-[140px] text-center font-mono text-xs space-y-1 hover:border-cyan-500/40 transition">
                        <div className="text-[10px] text-gray-500 font-bold">HOP #{hop.hop}</div>
                        <div className="text-white font-bold truncate" title={hop.ip_address || 'Timeout'}>
                          {hop.ip_address || '*'}
                        </div>
                        <div
                          className={`text-xs font-bold ${
                            hop.rtt_ms == null
                              ? 'text-rose-400'
                              : hop.rtt_ms < 30
                              ? 'text-emerald-400'
                              : hop.rtt_ms < 100
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {hop.rtt_ms != null ? `${hop.rtt_ms} ms` : 'Timed Out'}
                        </div>
                      </div>
                      {idx < traceReport.hops.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Hop Detail Table */}
              <div className="noc-card rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0E1424] border-b border-gray-800 text-gray-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4 w-16">Hop #</th>
                      <th className="py-2.5 px-4">Node IP Address</th>
                      <th className="py-2.5 px-4">Hostname</th>
                      <th className="py-2.5 px-4">RTT Latency</th>
                      <th className="py-2.5 px-4">Packet Loss</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {traceReport.hops.map((h: TracerouteHop) => (
                      <tr key={h.hop} className="hover:bg-white/[0.02]">
                        <td className="py-2 px-4 text-gray-400 font-bold">{h.hop}</td>
                        <td className="py-2 px-4 text-white font-bold">{h.ip_address || '*'}</td>
                        <td className="py-2 px-4 text-gray-400">{h.hostname || '-'}</td>
                        <td className="py-2 px-4 text-cyan-300 font-bold">
                          {h.rtt_ms != null ? `${h.rtt_ms} ms` : '*'}
                        </td>
                        <td className="py-2 px-4 text-gray-400">{h.packet_loss_pct}%</td>
                        <td className="py-2 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              h.status === 'REACHABLE'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DNS HEALTH & ANTI-SPOOFING SENTINEL                                 */}
      {/* ========================================================================= */}
      {currentTab === 'dns' && (
        <div className="space-y-6">
          <form onSubmit={handleRunDNSBenchmark} className="noc-card p-5 rounded-xl border border-gray-800 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <span className="text-xs font-mono text-gray-400 block mb-1">Domain to Benchmark:</span>
              <input
                type="text"
                value={dnsDomain}
                onChange={(e) => setDnsDomain(e.target.value)}
                placeholder="e.g. google.com, cloudflare.com, or your-school.edu"
                className="w-full px-3 py-2 rounded-xl noc-input text-xs font-mono"
                required
              />
            </div>

            <div className="w-full sm:w-auto self-end pt-5">
              <button
                type="submit"
                disabled={isDnsTesting}
                className="w-full sm:w-auto px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-mono text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                {isDnsTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Benchmarking Resolvers...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Run DNS Benchmark</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {dnsError && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono">
              {dnsError}
            </div>
          )}

          {dnsReport && (
            <div className="space-y-5">
              {/* Verdict Ribbon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="noc-card p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-gray-400 block uppercase">Benchmark Resolvers</span>
                    <span className="text-lg font-bold font-mono text-cyan-300">
                      {dnsReport.resolver_benchmarks.find((r) => r.status === 'HEALTHY')?.resolver_name || 'Multi-Tier'}
                    </span>
                  </div>
                  <Zap className="w-6 h-6 text-cyan-400" />
                </div>

                <div className="noc-card p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-gray-400 block uppercase">Anti-Spoofing Integrity</span>
                    <span
                      className={`text-lg font-bold font-mono ${
                        dnsReport.anti_spoofing_status === 'VERIFIED'
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {dnsReport.anti_spoofing_status}
                    </span>
                  </div>
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
              </div>

              {/* Multi-Resolver Performance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                {dnsReport.resolver_benchmarks.map((r) => (
                  <div key={r.resolver_ip} className="noc-card p-4 rounded-xl border border-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{r.resolver_name}</span>
                      <span
                        className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                          r.status === 'HEALTHY'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500">{r.resolver_ip}</div>
                    <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
                      <span className="text-gray-400">Latency:</span>
                      <span className="text-cyan-300 font-bold text-sm">
                        {r.latency_ms != null ? `${r.latency_ms.toFixed(1)} ms` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Resolved Socket IP:</span>
                      <div className="text-[11px] text-gray-300 truncate">
                        {r.resolved_ip || 'None'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DNS Records Table */}
              <div className="noc-card p-5 rounded-xl border border-gray-800 space-y-3 font-mono text-xs">
                <div className="font-bold font-sans text-white text-sm">
                  DNS Resource Records for {dnsReport.domain}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {dnsReport.records.map((item) => (
                    <div key={item.record_type} className="p-3 rounded-lg bg-black/40 border border-gray-800 space-y-1">
                      <span className="text-cyan-400 font-bold uppercase text-xs">{item.record_type} Records</span>
                      <ul className="text-[11px] text-gray-300 space-y-0.5">
                        {item.values.length > 0 ? (
                          item.values.map((val: string, vIdx: number) => (
                            <li key={vIdx} className="truncate select-all" title={val}>
                              &bull; {val}
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-600 italic">None found</li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ISP SPEEDTEST & BANDWIDTH QUALITY BENCHMARK                          */}
      {/* ========================================================================= */}
      {currentTab === 'speedtest' && (
        <div className="space-y-6">
          <div className="noc-card p-5 rounded-xl border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold font-sans text-white">
                ISP WAN Uplink Speedtest &amp; Quality Benchmark
              </h2>
              <p className="text-xs font-mono text-gray-400 mt-0.5">
                Measures real socket throughput, jitter, and bufferbloat under load.
              </p>
            </div>

            <button
              onClick={handleRunSpeedtest}
              disabled={isSpeedtesting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-400 hover:to-cyan-300 text-gray-950 font-bold font-mono text-xs shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center gap-2 transition disabled:opacity-50"
            >
              {isSpeedtesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Measuring Bandwidth Throughput...</span>
                </>
              ) : (
                <>
                  <Gauge className="w-4 h-4" />
                  <span>Start Speedtest Benchmark</span>
                </>
              )}
            </button>
          </div>

          {speedtestError && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono">
              {speedtestError}
            </div>
          )}

          {speedtestReport && (
            <div className="space-y-5">
              {/* Gauges Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
                <div className="noc-card p-5 rounded-xl border border-cyan-500/30 bg-cyan-950/10 text-center space-y-1">
                  <span className="text-xs text-gray-400 uppercase">Download Throughput</span>
                  <div className="text-3xl font-bold text-cyan-300">
                    {speedtestReport.download_mbps.toFixed(1)}
                  </div>
                  <span className="text-[11px] text-cyan-400">Mbps</span>
                </div>

                <div className="noc-card p-5 rounded-xl border border-purple-500/30 bg-purple-950/10 text-center space-y-1">
                  <span className="text-xs text-gray-400 uppercase">Upload Throughput</span>
                  <div className="text-3xl font-bold text-purple-300">
                    {speedtestReport.upload_mbps.toFixed(1)}
                  </div>
                  <span className="text-[11px] text-purple-400">Mbps</span>
                </div>

                <div className="noc-card p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/10 text-center space-y-1">
                  <span className="text-xs text-gray-400 uppercase">Latency &amp; Jitter</span>
                  <div className="text-3xl font-bold text-emerald-300">
                    {speedtestReport.latency_ms.toFixed(1)}
                  </div>
                  <span className="text-[11px] text-gray-400">
                    ms (Jitter: &plusmn;{speedtestReport.jitter_ms.toFixed(1)}ms)
                  </span>
                </div>

                <div className="noc-card p-5 rounded-xl border border-amber-500/30 bg-amber-950/10 text-center space-y-1">
                  <span className="text-xs text-gray-400 uppercase">Bufferbloat Grade</span>
                  <div className="text-3xl font-bold text-amber-300">
                    {speedtestReport.bufferbloat_grade}
                  </div>
                  <span className="text-[11px] text-gray-400">Network Queueing</span>
                </div>
              </div>

              {/* Server Details */}
              <div className="noc-card p-4 rounded-xl border border-gray-800 text-xs font-mono text-gray-400 flex items-center justify-between">
                <div>ISP Uplink Rating: <span className="text-white font-bold">{speedtestReport.isp_rating}</span></div>
                <div>Duration: {speedtestReport.duration_seconds.toFixed(2)}s ({speedtestReport.bytes_transferred_mb.toFixed(1)} MB)</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: NETWORK INTERFACE & STORM MONITOR LITE                             */}
      {/* ========================================================================= */}
      {currentTab === 'interfaces' && (
        <div className="space-y-6">
          <div className="noc-card p-5 rounded-xl border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold font-sans text-white">
                Network Interface Traffic &amp; Broadcast Storm Monitor
              </h2>
              <p className="text-xs font-mono text-gray-400 mt-0.5">
                Physical host NIC statistics, real-time packet counters, and loop/storm detection.
              </p>
            </div>

            <button
              onClick={fetchInterfaceStats}
              disabled={isRefreshingIfaces}
              className="px-4 py-2 rounded-xl border border-gray-800 bg-[#111827] hover:border-cyan-500/40 text-gray-300 text-xs font-mono flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshingIfaces ? 'animate-spin' : ''}`} />
              <span>Refresh NIC Telemetry</span>
            </button>
          </div>

          {ifaceError && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono">
              {ifaceError}
            </div>
          )}

          {ifaceReport && (
            <div className="space-y-5">
              {/* Broadcast Storm Alert Banner */}
              {ifaceReport.global_storm_alert ? (
                <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500 text-rose-200 text-xs font-mono flex items-center gap-3 animate-pulse shadow-[0_0_25px_rgba(244,63,94,0.3)]">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <div className="font-bold text-sm">POTENTIAL BROADCAST STORM DETECTED!</div>
                    <div className="text-[11px] text-rose-300 mt-0.5">
                      An interface is exhibiting excessive packet rates (&gt; 5,000 pps). Inspect loop prevention (STP/RSTP) immediately.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Interface rates normal. No broadcast storms or packet flooding detected.</span>
                </div>
              )}

              {/* Bandwidth Aggregates Ribbon */}
              <div className="grid grid-cols-2 gap-4 font-mono">
                <div className="noc-card p-4 rounded-xl border border-gray-800">
                  <span className="text-gray-400 text-xs uppercase block">Total Aggregated Ingress (RX)</span>
                  <span className="text-2xl font-bold text-cyan-400">
                    {(ifaceReport.interfaces.reduce((acc, i) => acc + i.bytes_recv_rate_kbps, 0) / 1000).toFixed(2)} Mbps
                  </span>
                </div>
                <div className="noc-card p-4 rounded-xl border border-gray-800">
                  <span className="text-gray-400 text-xs uppercase block">Total Aggregated Egress (TX)</span>
                  <span className="text-2xl font-bold text-purple-400">
                    {(ifaceReport.interfaces.reduce((acc, i) => acc + i.bytes_sent_rate_kbps, 0) / 1000).toFixed(2)} Mbps
                  </span>
                </div>
              </div>

              {/* Interfaces Table */}
              <div className="noc-card rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0E1424] border-b border-gray-800 text-gray-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Interface Name</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">RX Rate (Mbps)</th>
                        <th className="py-3 px-4">TX Rate (Mbps)</th>
                        <th className="py-3 px-4">Packets / Sec</th>
                        <th className="py-3 px-4">Drops (In/Out)</th>
                        <th className="py-3 px-4">Errors (In/Out)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/70">
                      {ifaceReport.interfaces.map((iface: InterfaceStat) => (
                        <tr key={iface.interface_name} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 font-bold text-white">{iface.interface_name}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                iface.is_up
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-gray-800 text-gray-400'
                              }`}
                            >
                              {iface.is_up ? 'UP' : 'DOWN'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-cyan-300 font-bold">
                            {(iface.bytes_recv_rate_kbps / 1000).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-purple-300 font-bold">
                            {(iface.bytes_sent_rate_kbps / 1000).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            RX: {iface.packets_recv_rate_pps.toFixed(0)} | TX: {iface.packets_sent_rate_pps.toFixed(0)}
                          </td>
                          <td className="py-3 px-4 text-gray-400">
                            {iface.drop_in_total} / {iface.drop_out_total}
                          </td>
                          <td className="py-3 px-4 text-gray-400">
                            {iface.error_in_total} / {iface.error_out_total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
