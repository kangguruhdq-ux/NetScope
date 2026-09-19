import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { WebTarget, WebScanReport, WebStatus } from '../types';
import {
  ShieldCheck,
  Globe,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Search,
  ExternalLink,
  Zap,
  Activity,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Server,
  ArrowRight,
  Code,
  Eye,
  History,
  Clock,
  Shield,
  FileText,
} from 'lucide-react';

export const WebSentinelPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'ADMIN';

  // Targets state
  const [targets, setTargets] = useState<WebTarget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedTargetId, setExpandedTargetId] = useState<number | null>(null);

  // Probing individual target state
  const [probingId, setProbingId] = useState<number | null>(null);

  // Quick Live URL Audit state
  const [scanUrl, setScanUrl] = useState('https://dns.google');
  const [isScanning, setIsScanning] = useState(false);
  const [scanReport, setScanReport] = useState<WebScanReport | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showScanHeaders, setShowScanHeaders] = useState(false);

  // Target Modal (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<WebTarget | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalUrl, setModalUrl] = useState('');
  const [modalInterval, setModalInterval] = useState(60);
  const [modalExpectedCode, setModalExpectedCode] = useState(200);
  const [modalTimeout, setModalTimeout] = useState(10);
  const [isSavingTarget, setIsSavingTarget] = useState(false);

  // Dedicated Target Deep View Detail Modal
  const [detailTarget, setDetailTarget] = useState<WebTarget | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'security' | 'history'>('overview');

  // Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    if (type === 'error') {
      toast.error(text);
    } else {
      toast.success(text);
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchTargets = async () => {
    setIsLoading(true);
    try {
      const data = await api.listWebTargets();
      setTargets(data);
    } catch (err: any) {
      showNotification(err.message || 'Failed to load web targets', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  // Handle single probe
  const handleProbe = async (targetId: number) => {
    setProbingId(targetId);
    try {
      const res = await api.probeWebTarget(targetId);
      // Update target latest_result in state
      setTargets((prev) =>
        prev.map((t) => (t.id === targetId ? { ...t, latest_result: res } : t))
      );
      toast.info(`Target #${targetId} diperiksa: Status ${res.status} (${res.response_time_ms}ms)`, 'Probe Selesai');
    } catch (err: any) {
      toast.error(err.message || 'Probe gagal dilakukan');
    } finally {
      setProbingId(null);
    }
  };

  // Handle single delete
  const handleDeleteTarget = async (id: number, name: string) => {
    if (!window.confirm(`Hapus target monitoring "${name}"?`)) return;
    try {
      await api.deleteWebTarget(id);
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      toast.delete(`Target monitoring "${name}" berhasil dihapus.`, 'Target Dihapus');
      fetchTargets();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus target');
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (!window.confirm(`Hapus ${count} target monitoring yang dipilih?`)) return;
    try {
      const res = await api.bulkDeleteWebTargets(selectedIds);
      setSelectedIds([]);
      toast.delete(res.message || `${count} target berhasil dihapus.`, 'Target Massal Dihapus');
      fetchTargets();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus target terpilih');
    }
  };

  const canModifyTarget = (t: WebTarget) => {
    if (isAdmin) return true;
    if (!t.user_id) return true;
    return t.user_id === user?.id;
  };

  const openDetailModal = async (target: WebTarget) => {
    setDetailTarget(target);
    setIsDetailLoading(true);
    setDetailTab('overview');
    try {
      const fullTarget = await api.getWebTarget(target.id);
      setDetailTarget(fullTarget);
    } catch (err: any) {
      console.error('Failed to load target details:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleDetailProbe = async (id: number) => {
    setProbingId(id);
    try {
      const res = await api.probeWebTarget(id);
      setTargets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, latest_result: res } : t))
      );
      const full = await api.getWebTarget(id);
      setDetailTarget(full);
      showNotification(`Target #${id} probed: Status ${res.status} (${res.response_time_ms}ms)`);
    } catch (err: any) {
      showNotification(err.message || 'Probe failed', 'error');
    } finally {
      setProbingId(null);
    }
  };

  // Select all toggle
  const toggleSelectAll = () => {
    const modifiable = filteredTargets.filter(canModifyTarget).map((t) => t.id);
    if (selectedIds.length > 0 && selectedIds.length === modifiable.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(modifiable);
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Handle live URL scan
  const handleExecuteScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanUrl.trim()) return;
    setIsScanning(true);
    setScanError(null);
    setScanReport(null);
    try {
      const report = await api.scanUrlLive(scanUrl.trim());
      setScanReport(report);
    } catch (err: any) {
      setScanError(err.message || 'Cyber security scan failed to reach target host');
    } finally {
      setIsScanning(false);
    }
  };

  // Modal open helpers
  const openCreateModal = () => {
    setEditingTarget(null);
    setModalName('');
    setModalUrl('https://');
    setModalInterval(60);
    setModalExpectedCode(200);
    setModalTimeout(10);
    setIsModalOpen(true);
  };

  const openEditModal = (target: WebTarget) => {
    setEditingTarget(target);
    setModalName(target.name);
    setModalUrl(target.url);
    setModalInterval(target.check_interval_seconds);
    setModalExpectedCode(target.expected_status_code);
    setModalTimeout(target.timeout_seconds);
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTarget(true);
    try {
      if (editingTarget) {
        await api.updateWebTarget(editingTarget.id, {
          name: modalName,
          url: modalUrl,
          check_interval_seconds: modalInterval,
          expected_status_code: modalExpectedCode,
          timeout_seconds: modalTimeout,
        });
        showNotification(`Target "${modalName}" updated successfully.`);
      } else {
        await api.createWebTarget({
          name: modalName,
          url: modalUrl,
          check_interval_seconds: modalInterval,
          expected_status_code: modalExpectedCode,
          timeout_seconds: modalTimeout,
        });
        showNotification(`Target "${modalName}" added to Sentinel monitoring.`);
      }
      setIsModalOpen(false);
      fetchTargets();
    } catch (err: any) {
      showNotification(err.message || 'Failed to save web target', 'error');
    } finally {
      setIsSavingTarget(false);
    }
  };

  const filteredTargets = targets.filter(
    (t) =>
      t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.url.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const onlineCount = targets.filter((t) => t.latest_result?.status === 'ONLINE').length;
  const degradedCount = targets.filter((t) => t.latest_result?.status === 'DEGRADED').length;
  const downCount = targets.filter((t) => t.latest_result?.status === 'DOWN').length;

  const getScoreBadge = (score?: string | null) => {
    if (!score) return <span className="text-gray-500 font-mono text-xs">-</span>;
    let color = 'bg-gray-800 text-gray-300 border-gray-700';
    if (score === 'A+' || score === 'A') {
      color = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
    } else if (score === 'B') {
      color = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    } else if (score === 'C') {
      color = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    } else {
      color = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-mono border ${color}`}>
        {score}
      </span>
    );
  };

  const getStatusBadge = (status?: WebStatus | null) => {
    if (status === 'ONLINE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ONLINE
        </span>
      );
    }
    if (status === 'DEGRADED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          DEGRADED
        </span>
      );
    }
    if (status === 'DOWN') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          DOWN
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-gray-500 bg-gray-900 border border-gray-800">
        PENDING
      </span>
    );
  };

  return (
    <div className="space-y-6 page-fade-enter">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-sans text-white tracking-tight flex items-center gap-2">
                Web &amp; Cyber Sentinel
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-widest">
                  Live Engine
                </span>
              </h1>
              <p className="text-xs font-mono text-cyan-400 mt-0.5">
                Real-Time HTTP/S Availability &bull; Cyber Security Headers Audit &bull; X.509 SSL Telemetry
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchTargets}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-800 bg-[#111827] hover:border-cyan-500/40 text-gray-300 text-xs font-mono transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-gray-950 font-bold font-mono text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Web Monitor</span>
          </button>
        </div>
      </div>

      {/* Global Notification Banner */}
      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* NOC Quick Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="noc-card p-4 rounded-xl border border-gray-800">
          <div className="text-[11px] font-mono text-gray-400 uppercase">Monitored Web Services</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{targets.length}</div>
          <div className="text-[10px] font-mono text-gray-500 mt-1">Endpoints active</div>
        </div>

        <div className="noc-card p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10">
          <div className="text-[11px] font-mono text-emerald-400 uppercase">Online &amp; Healthy</div>
          <div className="text-2xl font-bold font-mono text-emerald-300 mt-1">{onlineCount}</div>
          <div className="text-[10px] font-mono text-emerald-500/80 mt-1">Expected HTTP codes</div>
        </div>

        <div className="noc-card p-4 rounded-xl border border-amber-500/20 bg-amber-950/10">
          <div className="text-[11px] font-mono text-amber-400 uppercase">Degraded / High Latency</div>
          <div className="text-2xl font-bold font-mono text-amber-300 mt-1">{degradedCount}</div>
          <div className="text-[10px] font-mono text-amber-500/80 mt-1">&gt; 1,500ms or SSL issues</div>
        </div>

        <div className="noc-card p-4 rounded-xl border border-rose-500/20 bg-rose-950/10">
          <div className="text-[11px] font-mono text-rose-400 uppercase">Down / Unreachable</div>
          <div className="text-2xl font-bold font-mono text-rose-300 mt-1">{downCount}</div>
          <div className="text-[10px] font-mono text-rose-500/80 mt-1">Connection refused or timeout</div>
        </div>
      </div>

      {/* SECTION 1: INSTANT CYBER AUDIT & URL SCANNER */}
      <div className="noc-card p-5 rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.08)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="font-sans font-bold text-white text-sm">
              Instant On-Demand Cyber Security &amp; Web Condition Audit
            </span>
          </div>
          <span className="text-[11px] font-mono text-gray-400">
            Audit any internal or public URL in real-time with zero simulation
          </span>
        </div>

        <form onSubmit={handleExecuteScan} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={scanUrl}
              onChange={(e) => setScanUrl(e.target.value)}
              placeholder="https://your-school-portal.edu or http://192.168.1.1"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl noc-input text-xs font-mono text-white placeholder-gray-600 focus:border-cyan-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isScanning}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-mono text-xs flex items-center justify-center gap-2 transition shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Auditing Socket &amp; Headers...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Execute Real Cyber Audit</span>
              </>
            )}
          </button>
        </form>

        {scanError && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-start gap-2.5">
            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Target Audit Failed</div>
              <div className="text-gray-400 text-[11px] mt-0.5">{scanError}</div>
            </div>
          </div>
        )}

        {/* Scan Report Result View */}
        {scanReport && (
          <div className="mt-4 p-4 rounded-xl bg-[#090D16] border border-gray-800 space-y-4 text-xs font-mono">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                {getStatusBadge(scanReport.status)}
                <span className="font-bold text-white text-sm">{scanReport.url}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400">Cyber Security Grade:</span>
                {getScoreBadge(scanReport.security_score)}
              </div>
            </div>

            {/* Network & Protocol Telemetry Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-lg bg-[#0c1220] border border-cyan-500/20">
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 uppercase flex items-center gap-1">
                  <Server className="w-3 h-3 text-cyan-400" /> Resolved IP
                </span>
                <span className="text-white font-mono font-bold text-xs">
                  {scanReport.resolved_ip || 'Unresolved'}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 uppercase">HTTP Protocol</span>
                <span className="text-cyan-300 font-mono font-bold text-xs">
                  {scanReport.http_version || 'HTTP/1.1'}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 uppercase">TLS Version</span>
                <span className="text-emerald-300 font-mono font-bold text-xs">
                  {scanReport.tls_version || 'Plain HTTP'}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 uppercase">Cipher Suite</span>
                <span className="text-purple-300 font-mono text-[11px] truncate block" title={scanReport.cipher_suite || 'N/A'}>
                  {scanReport.cipher_suite || 'N/A'}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 uppercase">Payload Size</span>
                <span className="text-amber-300 font-mono font-bold text-xs">
                  {scanReport.payload_size_kb != null ? `${scanReport.payload_size_kb} KB` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Redirect Chain Visualization */}
            {scanReport.redirect_chain && scanReport.redirect_chain.length > 1 && (
              <div className="p-3 rounded-lg bg-black/40 border border-purple-500/30 text-xs">
                <div className="text-[10px] uppercase font-bold text-purple-400 mb-1.5 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>HTTP Redirection Chain ({scanReport.redirect_chain.length} Hops)</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {scanReport.redirect_chain.map((url, idx) => (
                    <React.Fragment key={idx}>
                      <span className="px-2 py-0.5 rounded bg-gray-900 border border-gray-700 text-gray-300 font-mono">
                        {url}
                      </span>
                      {idx < (scanReport.redirect_chain?.length ?? 0) - 1 && (
                        <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800">
                <span className="text-gray-400 block text-[10px] uppercase">HTTP Status Code</span>
                <span className="text-white font-bold text-sm">
                  {scanReport.http_status ?? 'No Response'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800">
                <span className="text-gray-400 block text-[10px] uppercase">TTFB Latency</span>
                <span className="text-cyan-400 font-bold text-sm">
                  {scanReport.response_time_ms != null ? `${scanReport.response_time_ms} ms` : '-'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800">
                <span className="text-gray-400 block text-[10px] uppercase">DNS Lookup Time</span>
                <span className="text-purple-400 font-bold text-sm">
                  {scanReport.dns_lookup_ms != null ? `${scanReport.dns_lookup_ms} ms` : '-'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 border border-gray-800">
                <span className="text-gray-400 block text-[10px] uppercase">Server Banner</span>
                <span className="text-gray-300 font-medium truncate block">
                  {scanReport.server_header || 'Masked / Undisclosed'}
                </span>
              </div>
            </div>

            {/* SSL / TLS Telemetry */}
            <div className="p-3 rounded-lg bg-black/30 border border-gray-800">
              <div className="flex items-center gap-2 text-cyan-400 font-bold mb-2">
                <Lock className="w-3.5 h-3.5" />
                <span>X.509 SSL/TLS Certificate Telemetry</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-500">Certificate Status: </span>
                  <span className={scanReport.ssl_valid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {scanReport.ssl_valid ? 'Valid & Trusted' : 'Invalid / Expired / Self-Signed'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Certificate Issuer: </span>
                  <span className="text-gray-300 font-mono truncate">{scanReport.ssl_issuer || 'None'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Expiry Days Remaining: </span>
                  <span
                    className={`font-bold ${
                      (scanReport.ssl_days_remaining ?? 0) < 15
                        ? 'text-rose-400'
                        : (scanReport.ssl_days_remaining ?? 0) < 30
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {scanReport.ssl_days_remaining != null ? `${scanReport.ssl_days_remaining} Days` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Critical Security Headers */}
            <div>
              <div className="text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2">
                Defense-in-Depth Security Headers Audit
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(scanReport.security_headers || {}).map(([hKey, hVal]: [string, any]) => (
                  <div
                    key={hKey}
                    className={`p-2 rounded border flex items-center justify-between text-[11px] ${
                      hVal?.present
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/10 border-rose-500/20 text-gray-400'
                    }`}
                  >
                    <span className="font-mono truncate">{hKey}</span>
                    {hVal?.present ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations / Threats */}
            {((scanReport.threat_indicators && scanReport.threat_indicators.length > 0) ||
              (scanReport.recommendations && scanReport.recommendations.length > 0)) && (
              <div className="p-3 rounded-lg bg-black/40 border border-amber-500/30 text-[11px] space-y-1.5">
                <div className="text-amber-300 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Security Hardening Advisories ({scanReport.recommendations?.length || 0})</span>
                </div>
                <ul className="list-disc list-inside text-gray-300 space-y-0.5">
                  {scanReport.recommendations?.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Expandable Raw HTTP Response Headers */}
            {scanReport.raw_headers && Object.keys(scanReport.raw_headers).length > 0 && (
              <div className="border border-gray-800 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowScanHeaders(!showScanHeaders)}
                  className="w-full flex items-center justify-between p-2.5 bg-black/40 hover:bg-black/60 text-[11px] font-mono text-gray-300 transition"
                >
                  <div className="flex items-center gap-2">
                    <Code className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-bold">Raw HTTP Response Headers</span>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px]">
                      {Object.keys(scanReport.raw_headers).length} headers received
                    </span>
                  </div>
                  {showScanHeaders ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {showScanHeaders && (
                  <div className="p-3 bg-[#070a12] border-t border-gray-800 max-h-64 overflow-y-auto font-mono text-[11px]">
                    <table className="w-full text-left">
                      <thead className="text-[10px] text-gray-500 uppercase border-b border-gray-800">
                        <tr>
                          <th className="pb-1.5 w-1/3">Header Key</th>
                          <th className="pb-1.5">Raw Header Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-900">
                        {Object.entries(scanReport.raw_headers).map(([key, val]) => (
                          <tr key={key} className="hover:bg-white/[0.02]">
                            <td className="py-1 text-cyan-300 font-bold pr-2 align-top">{key}</td>
                            <td className="py-1 text-gray-300 break-all select-all">{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: MONITORED TARGETS INVENTORY TABLE */}
      <div className="space-y-4">
        {/* Search & Bulk Actions toolbar */}
        <div className="noc-card p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter targets by name or URL..."
              className="w-full pl-9 pr-3 py-2 rounded-lg noc-input text-xs font-mono"
            />
          </div>

          {/* Bulk delete action */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 w-full sm:w-auto bg-rose-950/30 border border-rose-500/40 px-3.5 py-1.5 rounded-xl">
              <span className="text-xs font-mono text-rose-300 font-bold">
                {selectedIds.length} target(s) selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs shadow-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="noc-card rounded-xl overflow-hidden border border-gray-800 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0E1424] border-b border-gray-800 text-gray-400 uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredTargets.filter(canModifyTarget).length > 0 &&
                        selectedIds.length === filteredTargets.filter(canModifyTarget).length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Target Name &amp; URL</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">HTTP &amp; TTFB</th>
                  <th className="py-3 px-4">SSL Validity</th>
                  <th className="py-3 px-4">Cyber Grade</th>
                  <th className="py-3 px-4">Last Audited</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {filteredTargets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 8 : 7}
                      className="py-12 text-center text-gray-500 font-mono"
                    >
                      No web monitoring targets found. Click "Add Web Monitor" to configure an endpoint.
                    </td>
                  </tr>
                ) : (
                  filteredTargets.map((target) => {
                    const result = target.latest_result;
                    const isSelected = selectedIds.includes(target.id);
                    const isProbing = probingId === target.id;

                    return (
                      <React.Fragment key={target.id}>
                        <tr
                          className={`hover:bg-white/[0.02] transition ${
                            isSelected ? 'bg-cyan-950/20' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            {canModifyTarget(target) ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectOne(target.id)}
                                className="rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-0 cursor-pointer"
                              />
                            ) : (
                              <span className="text-gray-700 select-none block text-center">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => openDetailModal(target)}
                              className="font-sans font-bold text-white text-sm hover:text-cyan-400 text-left transition block"
                              title="Klik untuk melihat detail & telemetri web"
                            >
                              {target.name}
                            </button>
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-cyan-400 font-mono mt-0.5">
                              <a
                                href={target.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 hover:underline text-cyan-400"
                              >
                                <span>{target.url}</span>
                                <ExternalLink className="w-3 h-3 text-gray-500" />
                              </a>
                              {(result?.resolved_ip || target.resolved_ip) && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] shadow-sm">
                                  <Server className="w-2.5 h-2.5 text-cyan-400" />
                                  {result?.resolved_ip || target.resolved_ip}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {getStatusBadge(result?.status)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white flex items-center gap-1">
                              <span>HTTP {result?.http_status ?? '-'}</span>
                              {result?.http_version && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-gray-800 text-gray-400">
                                  {result.http_version}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-cyan-400">
                              {result?.response_time_ms != null ? `${result.response_time_ms} ms` : '-'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {result?.ssl_valid ? (
                              <div>
                                <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  {result.ssl_days_remaining != null
                                    ? `${result.ssl_days_remaining}d left`
                                    : 'Valid'}
                                </span>
                                <span className="text-[10px] text-gray-400 block truncate max-w-[130px]">
                                  {result.tls_version || result.ssl_issuer || 'Standard CA'}
                                </span>
                              </div>
                            ) : result?.ssl_valid === false ? (
                              <span className="text-rose-400 font-bold text-[11px] flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Invalid / Plain HTTP
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {getScoreBadge(result?.security_score)}
                          </td>
                          <td className="py-3.5 px-4 text-gray-400 whitespace-nowrap">
                            {result?.timestamp
                              ? new Date(result.timestamp).toLocaleTimeString()
                              : 'Never'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Dedicated View Detail Button */}
                              <button
                                onClick={() => openDetailModal(target)}
                                className="p-1.5 rounded hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 transition"
                                title="Lihat View Detail Web Sentinel"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Inspect Details & Headers Button */}
                              <button
                                onClick={() => setExpandedTargetId(expandedTargetId === target.id ? null : target.id)}
                                className={`p-1.5 rounded transition ${
                                  expandedTargetId === target.id
                                    ? 'bg-cyan-500/20 text-cyan-300'
                                    : 'hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400'
                                }`}
                                title={expandedTargetId === target.id ? "Close Telemetry Deck" : "Inspect Deep HTTP/TLS Telemetry"}
                              >
                                <Code className="w-4 h-4" />
                              </button>

                              {/* Probe Now Button */}
                              <button
                                onClick={() => handleProbe(target.id)}
                                disabled={isProbing}
                                className="p-1.5 rounded hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400 transition"
                                title="Probe Target Now"
                              >
                                <Activity
                                  className={`w-4 h-4 ${isProbing ? 'animate-spin text-cyan-400' : ''}`}
                                />
                              </button>

                              {/* Edit Button */}
                              {canModifyTarget(target) && (
                                <button
                                  onClick={() => openEditModal(target)}
                                  className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition"
                                  title="Edit Target Configuration"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete Button */}
                              {canModifyTarget(target) && (
                                <button
                                  onClick={() => handleDeleteTarget(target.id, target.name)}
                                  className="p-1.5 rounded hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition"
                                  title="Delete Target"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedTargetId === target.id && (
                          <tr key={`${target.id}-expanded`} className="bg-[#090D18] border-b border-cyan-500/20">
                            <td colSpan={8} className="p-4">
                            <div className="rounded-xl border border-gray-800 bg-[#060A12] p-4 space-y-3 font-mono text-xs">
                              <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                                  <ShieldCheck className="w-4 h-4" />
                                  <span>Deep Protocol &amp; Security Header Telemetry: {target.name}</span>
                                </div>
                                <span className="text-[11px] text-gray-500">{target.url}</span>
                              </div>

                              {/* Strip */}
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-2.5 rounded-lg bg-[#0d1424] border border-gray-800">
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase block">Resolved Socket IP</span>
                                  <span className="text-cyan-400 font-bold">{result?.resolved_ip || target.resolved_ip || 'Resolving...'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase block">HTTP Protocol</span>
                                  <span className="text-cyan-300 font-bold">{result?.http_version || 'HTTP/1.1'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase block">TLS Protocol</span>
                                  <span className="text-emerald-300 font-bold">{result?.tls_version || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase block">Cipher Suite</span>
                                  <span className="text-purple-300 truncate block max-w-[160px]" title={result?.cipher_suite || 'N/A'}>
                                    {result?.cipher_suite || 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase block">Payload Size</span>
                                  <span className="text-amber-300 font-bold">{result?.payload_size_kb != null ? `${result.payload_size_kb} KB` : 'N/A'}</span>
                                </div>
                              </div>

                              {/* Redirect chain if present */}
                              {result?.redirect_chain && result.redirect_chain.length > 1 && (
                                <div className="p-2.5 rounded bg-black/40 border border-purple-500/20 text-[11px]">
                                  <span className="text-purple-400 font-bold block mb-1">Redirect Sequence:</span>
                                  <div className="flex flex-wrap items-center gap-1.5 text-gray-300">
                                    {result.redirect_chain.map((step, sIdx) => (
                                      <React.Fragment key={sIdx}>
                                        <span className="bg-gray-900 px-2 py-0.5 rounded border border-gray-800">{step}</span>
                                        {sIdx < (result.redirect_chain?.length ?? 0) - 1 && <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />}
                                      </React.Fragment>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Raw HTTP response headers */}
                              {result?.raw_headers && Object.keys(result.raw_headers).length > 0 ? (
                                <div>
                                  <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <Code className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Raw Response Headers ({Object.keys(result.raw_headers).length})</span>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto rounded border border-gray-800 bg-black/60 p-2 text-[11px]">
                                    <table className="w-full text-left">
                                      <thead>
                                        <tr className="text-gray-500 border-b border-gray-800">
                                          <th className="pb-1 w-1/3">Header</th>
                                          <th className="pb-1">Value</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-900">
                                        {Object.entries(result.raw_headers).map(([k, v]) => (
                                          <tr key={k}>
                                            <td className="py-0.5 text-cyan-300 pr-2 align-top">{k}</td>
                                            <td className="py-0.5 text-gray-300 break-all select-all">{v}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-gray-500 italic text-[11px]">
                                  No headers captured yet. Click the "Probe" icon to send an immediate real-time request.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Target Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="noc-card rounded-2xl w-full max-w-md p-6 border border-cyan-500/30 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
              <h3 className="text-base font-bold font-sans text-white">
                {editingTarget ? 'Edit Web Target' : 'Register Web Monitor Target'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block text-gray-300 mb-1">Target Name *</label>
                <input
                  type="text"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="e.g. Core LMS Portal or Gateway Auth"
                  required
                  className="w-full noc-input px-3 py-2 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Target URL *</label>
                <input
                  type="url"
                  value={modalUrl}
                  onChange={(e) => setModalUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                  className="w-full noc-input px-3 py-2 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 mb-1">Expected HTTP Code</label>
                  <input
                    type="number"
                    value={modalExpectedCode}
                    onChange={(e) => setModalExpectedCode(parseInt(e.target.value) || 200)}
                    min={100}
                    max={599}
                    className="w-full noc-input px-3 py-2 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-1">Timeout (seconds)</label>
                  <input
                    type="number"
                    value={modalTimeout}
                    onChange={(e) => setModalTimeout(parseInt(e.target.value) || 10)}
                    min={1}
                    max={60}
                    className="w-full noc-input px-3 py-2 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Check Interval (seconds)</label>
                <select
                  value={modalInterval}
                  onChange={(e) => setModalInterval(parseInt(e.target.value))}
                  className="w-full noc-input px-3 py-2 rounded-lg text-white"
                >
                  <option value={30}>Every 30 seconds</option>
                  <option value={60}>Every 60 seconds (1 minute)</option>
                  <option value={300}>Every 300 seconds (5 minutes)</option>
                  <option value={600}>Every 600 seconds (10 minutes)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTarget}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-mono text-xs transition shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {isSavingTarget ? 'Saving...' : editingTarget ? 'Update Target' : 'Register Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Web Target Deep Detail Modal */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="noc-card rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-cyan-500/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 bg-[#0E1424] border-b border-gray-800 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold font-sans text-white tracking-tight">
                        {detailTarget.name}
                      </h2>
                      {getStatusBadge(detailTarget.latest_result?.status)}
                      {getScoreBadge(detailTarget.latest_result?.security_score)}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mt-0.5">
                      <a
                        href={detailTarget.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline flex items-center gap-1"
                      >
                        <span>{detailTarget.url}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="text-gray-600">&bull;</span>
                      <span className="text-gray-400">
                        Interval: Every {detailTarget.check_interval_seconds}s
                      </span>
                      <span className="text-gray-600">&bull;</span>
                      <span className="text-gray-400">
                        Timeout: {detailTarget.timeout_seconds}s
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDetailProbe(detailTarget.id)}
                  disabled={probingId === detailTarget.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-mono text-xs transition shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-50"
                  title="Kirim probe audit real-time sekarang"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${probingId === detailTarget.id ? 'animate-spin' : ''}`} />
                  <span>{probingId === detailTarget.id ? 'Probing...' : 'Probe Now'}</span>
                </button>

                <button
                  onClick={() => setDetailTarget(null)}
                  className="p-1.5 rounded-lg border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-5 pt-3 bg-[#0B0F19] border-b border-gray-800 flex items-center gap-2 text-xs font-mono">
              <button
                onClick={() => setDetailTab('overview')}
                className={`px-3 py-2 border-b-2 font-bold transition flex items-center gap-2 ${
                  detailTab === 'overview'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>Overview &amp; SSL Telemetry</span>
              </button>
              <button
                onClick={() => setDetailTab('security')}
                className={`px-3 py-2 border-b-2 font-bold transition flex items-center gap-2 ${
                  detailTab === 'security'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Security Headers ({Object.keys(detailTarget.latest_result?.security_headers || {}).length})</span>
              </button>
              <button
                onClick={() => setDetailTab('history')}
                className={`px-3 py-2 border-b-2 font-bold transition flex items-center gap-2 ${
                  detailTab === 'history'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Historical Probes ({detailTarget.history?.length || 0})</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-xs">
              {detailTab === 'overview' && (
                <div className="space-y-4">
                  {/* Socket Metrics Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-xl bg-[#090D18] border border-cyan-500/20">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Socket IP</span>
                      <span className="text-cyan-400 font-bold text-sm">
                        {detailTarget.latest_result?.resolved_ip || detailTarget.resolved_ip || 'Resolving...'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">HTTP Protocol</span>
                      <span className="text-cyan-300 font-bold text-sm">
                        {detailTarget.latest_result?.http_version || 'HTTP/1.1'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Response TTFB</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {detailTarget.latest_result?.response_time_ms != null ? `${detailTarget.latest_result.response_time_ms} ms` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">HTTP Status</span>
                      <span className="text-purple-300 font-bold text-sm">
                        {detailTarget.latest_result?.http_status ?? 'No Response'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">DNS Resolution</span>
                      <span className="text-amber-400 font-bold text-sm">
                        {detailTarget.latest_result?.dns_lookup_ms != null ? `${detailTarget.latest_result.dns_lookup_ms} ms` : '-'}
                      </span>
                    </div>
                  </div>

                  {/* SSL / TLS Certificate Detailed Box */}
                  <div className="p-4 rounded-xl bg-[#090D18] border border-gray-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold">
                        <Lock className="w-4 h-4" />
                        <span>X.509 Cryptographic Certificate Telemetry</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        detailTarget.latest_result?.ssl_valid
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                      }`}>
                        {detailTarget.latest_result?.ssl_valid ? 'TRUSTED & ACTIVE' : 'INSECURE / PLAIN HTTP'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase">Certificate Authority</span>
                        <span className="text-gray-200 font-bold truncate block">
                          {detailTarget.latest_result?.ssl_issuer || 'None (Plaintext HTTP)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase">TLS Protocol Version</span>
                        <span className="text-emerald-300 font-bold block">
                          {detailTarget.latest_result?.tls_version || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase">Expiry Countdown</span>
                        <span className={`font-bold block ${
                          (detailTarget.latest_result?.ssl_days_remaining ?? 0) < 15
                            ? 'text-rose-400'
                            : (detailTarget.latest_result?.ssl_days_remaining ?? 0) < 30
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}>
                          {detailTarget.latest_result?.ssl_days_remaining != null
                            ? `${detailTarget.latest_result.ssl_days_remaining} Days Remaining`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {detailTarget.latest_result?.cipher_suite && (
                      <div className="pt-2 border-t border-gray-800/80 text-[11px]">
                        <span className="text-gray-500">Negotiated Cipher Suite: </span>
                        <span className="text-purple-300 font-mono select-all">
                          {detailTarget.latest_result.cipher_suite}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Redirection Chain */}
                  {detailTarget.latest_result?.redirect_chain && detailTarget.latest_result.redirect_chain.length > 1 && (
                    <div className="p-3.5 rounded-xl bg-[#090D18] border border-purple-500/30 text-xs">
                      <div className="text-[10px] uppercase font-bold text-purple-400 mb-2 flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Redirect Hop Sequences ({detailTarget.latest_result.redirect_chain.length} Hops)</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {detailTarget.latest_result.redirect_chain.map((hop, hIdx) => (
                          <React.Fragment key={hIdx}>
                            <span className="px-2 py-0.5 rounded bg-black/60 border border-gray-700 text-gray-200 font-mono text-[11px]">
                              {hop}
                            </span>
                            {hIdx < (detailTarget.latest_result?.redirect_chain?.length ?? 0) - 1 && (
                              <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Advisories & Recommendations */}
                  {((detailTarget.latest_result?.recommendations && detailTarget.latest_result.recommendations.length > 0) ||
                    (detailTarget.latest_result?.threat_indicators && detailTarget.latest_result.threat_indicators.length > 0)) && (
                    <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                      <div className="text-amber-300 font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>NOC Cyber Hardening Advisories</span>
                      </div>
                      <ul className="list-disc list-inside text-gray-300 space-y-1 text-[11px]">
                        {detailTarget.latest_result?.recommendations?.map((r, rIdx) => (
                          <li key={rIdx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'security' && (
                <div className="space-y-3">
                  <div className="text-gray-400 text-[11px]">
                    Defense-in-Depth HTTP Security Headers evaluation performed against target server response:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {Object.entries(detailTarget.latest_result?.security_headers || {}).map(([secKey, secVal]: [string, any]) => (
                      <div
                        key={secKey}
                        className={`p-3 rounded-xl border flex flex-col justify-between gap-1.5 ${
                          secVal?.present
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : 'bg-rose-950/10 border-rose-500/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white font-mono">{secKey}</span>
                          {secVal?.present ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                              <Check className="w-3 h-3" /> PRESENT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                              <X className="w-3 h-3" /> MISSING
                            </span>
                          )}
                        </div>
                        {secVal?.value ? (
                          <span className="text-[10px] text-gray-400 font-mono truncate select-all" title={secVal.value}>
                            Value: {secVal.value}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500 italic">
                            Header omitted from HTTP response
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Raw HTTP Response Headers */}
                  {detailTarget.latest_result?.raw_headers && Object.keys(detailTarget.latest_result.raw_headers).length > 0 && (
                    <div className="pt-3 border-t border-gray-800 space-y-2">
                      <div className="font-bold text-gray-300 flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5 text-cyan-400" />
                        <span>All Raw HTTP Response Headers ({Object.keys(detailTarget.latest_result.raw_headers).length})</span>
                      </div>
                      <div className="rounded-xl border border-gray-800 bg-[#060A12] max-h-56 overflow-y-auto p-3">
                        <table className="w-full text-left text-[11px]">
                          <thead className="text-gray-500 border-b border-gray-800 uppercase text-[10px]">
                            <tr>
                              <th className="pb-1.5 w-1/3">Header Key</th>
                              <th className="pb-1.5">Header Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-900">
                            {Object.entries(detailTarget.latest_result.raw_headers).map(([k, v]) => (
                              <tr key={k} className="hover:bg-white/[0.02]">
                                <td className="py-1 text-cyan-300 font-bold pr-2 align-top">{k}</td>
                                <td className="py-1 text-gray-300 break-all select-all">{v}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'history' && (
                <div className="space-y-3">
                  <div className="text-gray-400 text-[11px]">
                    Recorded telemetry history for target <strong>{detailTarget.name}</strong> (most recent checks):
                  </div>

                  {detailTarget.history && detailTarget.history.length > 0 ? (
                    <div className="rounded-xl border border-gray-800 overflow-hidden bg-[#060A12]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0E1424] border-b border-gray-800 text-gray-400 uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Audit Time</th>
                            <th className="py-2.5 px-3">Socket IP</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">HTTP Code</th>
                            <th className="py-2.5 px-3">TTFB Latency</th>
                            <th className="py-2.5 px-3">SSL Valid</th>
                            <th className="py-2.5 px-3">Details / Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-900 font-mono">
                          {detailTarget.history.map((h, hIdx) => (
                            <tr key={hIdx} className="hover:bg-white/[0.02]">
                              <td className="py-2 px-3 text-gray-300 whitespace-nowrap text-[11px]">
                                {new Date(h.timestamp).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-cyan-300 font-bold whitespace-nowrap text-[11px]">
                                {h.resolved_ip || detailTarget.resolved_ip || '-'}
                              </td>
                              <td className="py-2 px-3">
                                {getStatusBadge(h.status)}
                              </td>
                              <td className="py-2 px-3 font-bold text-white">
                                {h.http_status ?? '-'}
                              </td>
                              <td className="py-2 px-3 text-cyan-400">
                                {h.response_time_ms != null ? `${h.response_time_ms}ms` : '-'}
                              </td>
                              <td className="py-2 px-3">
                                {h.ssl_valid ? (
                                  <span className="text-emerald-400 font-bold text-[10px]">VALID</span>
                                ) : h.ssl_valid === false ? (
                                  <span className="text-rose-400 font-bold text-[10px]">INVALID</span>
                                ) : (
                                  <span className="text-gray-500 text-[10px]">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-gray-400 text-[10px] truncate max-w-xs" title={h.error_message || ''}>
                                {h.error_message || 'OK'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 italic">
                      No historical probes found yet. Click "Probe Now" to run an immediate check.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#0E1424] border-t border-gray-800 flex items-center justify-between">
              <div className="text-[11px] text-gray-500 font-mono">
                Target ID: <span className="text-gray-300 font-bold">#{detailTarget.id}</span>
              </div>

              <div className="flex items-center gap-2">
                {canModifyTarget(detailTarget) && (
                  <button
                    onClick={() => {
                      const t = detailTarget;
                      setDetailTarget(null);
                      openEditModal(t);
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-mono font-bold transition"
                  >
                    Edit Config
                  </button>
                )}
                <button
                  onClick={() => setDetailTarget(null)}
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 text-xs font-mono font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSentinelPage;
