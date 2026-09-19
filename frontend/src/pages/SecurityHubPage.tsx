import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Device,
  PortAuditReport,
  VulnerabilityItem,
  ConfigBackup,
  ConfigDiffResponse,
} from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  FileCode,
  GitCompare,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Eye,
  RefreshCw,
  Loader2,
  Server,
  Unlock,
  Copy,
  Check,
  X,
  FileText,
} from 'lucide-react';

type SecurityTab = 'vulnerability' | 'config';

export const SecurityHubPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as SecurityTab) || 'vulnerability';

  const setTab = (tab: SecurityTab) => {
    setSearchParams({ tab });
  };

  // --- Device list for quick selection ---
  const [devices, setDevices] = useState<Device[]>([]);

  // --- Tab 1: Port Audit State ---
  const [auditTargetIp, setAuditTargetIp] = useState<string>('192.168.1.1');
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<PortAuditReport | null>(null);
  const [auditError, setAuditError] = useState<string>('');

  // --- Tab 2: Config Backups State ---
  const [backups, setBackups] = useState<ConfigBackup[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const [backupError, setBackupError] = useState<string>('');

  // Create Backup Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newDeviceName, setNewDeviceName] = useState<string>('Core-Gateway-Router');
  const [newBackupName, setNewBackupName] = useState<string>('CCR2004-Backup-v1.rsc');
  const [newDescription, setNewDescription] = useState<string>('Baseline configuration snapshot');
  const [newContent, setNewContent] = useState<string>('');
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);

  // View Backup Content Modal
  const [viewingBackup, setViewingBackup] = useState<ConfigBackup | null>(null);
  const [copiedContent, setCopiedContent] = useState<boolean>(false);

  // Diff Viewer State
  const [backupAId, setBackupAId] = useState<number | ''>('');
  const [backupBId, setBackupBId] = useState<number | ''>('');
  const [isDiffing, setIsDiffing] = useState<boolean>(false);
  const [diffResult, setDiffResult] = useState<ConfigDiffResponse | null>(null);
  const [diffError, setDiffError] = useState<string>('');

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    api.listDevices().then((devs) => {
      setDevices(devs);
      if (devs.length > 0) {
        setAuditTargetIp(devs[0].ip_address);
      }
    });

    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setIsLoadingBackups(true);
    setBackupError('');
    try {
      const data = await api.listConfigBackups();
      setBackups(data);
      if (data.length >= 2) {
        setBackupAId(data[1].id);
        setBackupBId(data[0].id);
      } else if (data.length === 1) {
        setBackupAId(data[0].id);
        setBackupBId(data[0].id);
      }
    } catch (err: any) {
      setBackupError(err.message || 'Failed to load config backups.');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  // --- Run Port Audit ---
  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditTargetIp.trim()) return;
    setIsAuditing(true);
    setAuditReport(null);
    setAuditError('');

    try {
      const res = await api.auditDevicePorts(auditTargetIp.trim());
      setAuditReport(res);
      showNotification(`Audit completed for ${res.target_ip}. Verdict: ${res.overall_verdict}`);
    } catch (err: any) {
      setAuditError(err.message || 'Port audit probe failed.');
    } finally {
      setIsAuditing(false);
    }
  };

  // --- Create Backup ---
  const handleSaveBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName || !newBackupName || !newContent) {
      showNotification('Please fill in required fields and config content.', 'error');
      return;
    }
    setIsCreatingBackup(true);
    try {
      await api.createConfigBackup({
        backup_name: newBackupName,
        device_name: newDeviceName,
        config_content: newContent,
        description: newDescription,
      });
      showNotification(`Backup "${newBackupName}" registered successfully.`);
      setIsCreateModalOpen(false);
      setNewContent('');
      setNewDescription('');
      fetchBackups();
    } catch (err: any) {
      showNotification(err.message || 'Failed to create config backup.', 'error');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // --- Delete Backup ---
  const handleDeleteBackup = async (id: number, name: string) => {
    if (!window.confirm(`Delete configuration backup "${name}"?`)) return;
    try {
      await api.deleteConfigBackup(id);
      showNotification(`Backup "${name}" deleted.`);
      fetchBackups();
      if (diffResult && (backupAId === id || backupBId === id)) {
        setDiffResult(null);
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete backup.', 'error');
    }
  };

  // --- Run Diff ---
  const handleCompareDiff = async () => {
    if (!backupAId || !backupBId) {
      setDiffError('Please select both Baseline (A) and Comparison (B) backups.');
      return;
    }
    setIsDiffing(true);
    setDiffResult(null);
    setDiffError('');
    try {
      const res = await api.diffConfigBackups(Number(backupAId), Number(backupBId));
      setDiffResult(res);
    } catch (err: any) {
      setDiffError(err.message || 'Diff comparison failed.');
    } finally {
      setIsDiffing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-white tracking-tight flex items-center gap-2.5">
            Cyber Security &amp; Router Config Hub
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-widest">
              SecOps Shield
            </span>
          </h1>
          <p className="text-xs font-mono text-cyan-400 mt-0.5">
            LAN Vulnerability &amp; Port Risk Auditor &bull; RouterOS / Switch Config Snapshot Repository &amp; Unified Diff
          </p>
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

      {/* 2-Tab Navigation Bar */}
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setTab('vulnerability')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs transition ${
            currentTab === 'vulnerability'
              ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold shadow-[0_0_15px_rgba(244,63,94,0.4)]'
              : 'bg-[#111827] text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Vulnerability &amp; Port Risk Auditor</span>
        </button>

        <button
          onClick={() => setTab('config')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs transition ${
            currentTab === 'config'
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-gray-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'bg-[#111827] text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Router Configs &amp; Diff Viewer</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VULNERABILITY & PORT RISK AUDITOR                                   */}
      {/* ========================================================================= */}
      {currentTab === 'vulnerability' && (
        <div className="space-y-6">
          <form onSubmit={handleRunAudit} className="noc-card p-5 rounded-xl border border-gray-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-full sm:w-1/3">
                <span className="text-xs font-mono text-gray-400 block mb-1">Select Fleet Device:</span>
                <select
                  onChange={(e) => setAuditTargetIp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl noc-input text-xs font-mono"
                >
                  <option value="">-- Custom IP Address --</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.ip_address}>
                      {d.name} ({d.ip_address}) - {d.device_type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:flex-1">
                <span className="text-xs font-mono text-gray-400 block mb-1">Target Host or IP:</span>
                <input
                  type="text"
                  value={auditTargetIp}
                  onChange={(e) => setAuditTargetIp(e.target.value)}
                  placeholder="e.g. 192.168.1.1 or 10.0.0.1"
                  className="w-full px-3 py-2 rounded-xl noc-input text-xs font-mono"
                  required
                />
              </div>

              <div className="w-full sm:w-auto self-end pt-5">
                <button
                  type="submit"
                  disabled={isAuditing}
                  className="w-full sm:w-auto px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold font-mono text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                >
                  {isAuditing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Auditing Sockets...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>Execute Port Audit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {auditError && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono">
              {auditError}
            </div>
          )}

          {auditReport && (
            <div className="space-y-5">
              {/* Verdict Ribbon */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
                <div className="noc-card p-4 rounded-xl border border-gray-800 space-y-1">
                  <span className="text-[11px] text-gray-500 uppercase block">Audited Target</span>
                  <div className="text-white font-bold text-base flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-cyan-400" />
                    <span>{auditReport.target_ip}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Scanned {auditReport.total_ports_scanned} ports</span>
                </div>

                <div
                  className={`noc-card p-4 rounded-xl border space-y-1 ${
                    auditReport.overall_verdict === 'COMPROMISED'
                      ? 'border-rose-500/40 bg-rose-950/20'
                      : auditReport.overall_verdict === 'AT_RISK'
                      ? 'border-orange-500/40 bg-orange-950/20'
                      : auditReport.overall_verdict === 'WARNING'
                      ? 'border-amber-500/40 bg-amber-950/20'
                      : 'border-emerald-500/40 bg-emerald-950/20'
                  }`}
                >
                  <span className="text-[11px] text-gray-400 uppercase block">Risk Verdict</span>
                  <div
                    className={`text-xl font-bold ${
                      auditReport.overall_verdict === 'COMPROMISED'
                        ? 'text-rose-400'
                        : auditReport.overall_verdict === 'AT_RISK'
                        ? 'text-orange-400'
                        : auditReport.overall_verdict === 'WARNING'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {auditReport.overall_verdict}
                  </div>
                  <span className="text-[10px] text-gray-400">Duration: {auditReport.duration_seconds.toFixed(2)}s</span>
                </div>

                <div className="noc-card p-4 rounded-xl border border-gray-800 space-y-1">
                  <span className="text-[11px] text-gray-500 uppercase block">Security Risk Score</span>
                  <div className="text-2xl font-bold text-cyan-300">
                    {auditReport.security_score} / 100
                  </div>
                  <span className="text-[10px] text-gray-400">0=Safest, 100=Critical</span>
                </div>

                <div className="noc-card p-4 rounded-xl border border-gray-800 space-y-1">
                  <span className="text-[11px] text-gray-500 uppercase block">Open Ports Found</span>
                  <div className="text-2xl font-bold text-amber-300">
                    {auditReport.open_ports_count}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    Crit: {auditReport.critical_risk_count} | High: {auditReport.high_risk_count}
                  </span>
                </div>
              </div>

              {/* Open Ports Inventory Table */}
              <div className="noc-card rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <div className="text-xs font-bold font-sans text-white flex items-center gap-2">
                    <Unlock className="w-4 h-4 text-amber-400" />
                    <span>Reachable TCP Ports &amp; Exposure Analysis</span>
                  </div>
                  <span className="text-[11px] font-mono text-gray-400">
                    {auditReport.vulnerabilities.length} Services Evaluated
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#0E1424] border-b border-gray-800 text-gray-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4 w-20">Port #</th>
                        <th className="py-3 px-4 w-28">Service</th>
                        <th className="py-3 px-4 w-28">Risk Level</th>
                        <th className="py-3 px-4">Service Description</th>
                        <th className="py-3 px-4">Remediation Advisory</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/70">
                      {auditReport.vulnerabilities.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            No open ports detected in the tested range. Host is stealth or firewall is blocking probes.
                          </td>
                        </tr>
                      ) : (
                        auditReport.vulnerabilities.map((p: VulnerabilityItem) => (
                          <tr key={p.port} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-4 font-bold text-cyan-300">{p.port}</td>
                            <td className="py-3 px-4 font-bold text-white">{p.service_name}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  p.risk_level === 'CRITICAL'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : p.risk_level === 'HIGH'
                                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                    : p.risk_level === 'MEDIUM'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                }`}
                              >
                                {p.risk_level}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-300">{p.description}</td>
                            <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">{p.remediation_steps}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hardening Recommendations */}
              {auditReport.hardening_advisories.length > 0 && (
                <div className="noc-card p-5 rounded-xl border border-amber-500/30 space-y-2.5 font-mono text-xs">
                  <div className="text-amber-300 font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>NOC Hardening Recommendations ({auditReport.hardening_advisories.length})</span>
                  </div>
                  <ul className="space-y-1.5 text-gray-300 text-[11px]">
                    {auditReport.hardening_advisories.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400">&bull;</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROUTER CONFIG BACKUPS & UNIFIED DIFF VIEWER                         */}
      {/* ========================================================================= */}
      {currentTab === 'config' && (
        <div className="space-y-6">
          {/* Top Bar with Add and Refresh buttons */}
          <div className="noc-card p-4 rounded-xl border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold font-sans text-white">
                Router &amp; Switch Configuration Repository
              </h2>
              <p className="text-xs font-mono text-gray-400 mt-0.5">
                Versioned snapshots of MikroTik RouterOS (.rsc), Cisco (.cfg), and switch files.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchBackups}
                disabled={isLoadingBackups}
                className="px-3 py-2 rounded-xl border border-gray-800 bg-[#111827] hover:border-cyan-500/40 text-gray-300 text-xs font-mono flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-gray-950 font-bold font-mono text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Snapshot Config</span>
                </button>
              )}
            </div>
          </div>

          {backupError && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono">
              {backupError}
            </div>
          )}

          {/* Config Backups Table */}
          <div className="noc-card rounded-xl border border-gray-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0E1424] border-b border-gray-800 text-gray-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Device Name</th>
                    <th className="py-3 px-4">Backup Name</th>
                    <th className="py-3 px-4">File Size</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/70">
                  {backups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No config snapshots stored yet. Click "Snapshot Config" to store router configurations.
                      </td>
                    </tr>
                  ) : (
                    backups.map((b: ConfigBackup) => (
                      <tr key={b.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-sm">{b.device_name}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-cyan-300 flex items-center gap-1.5">
                          <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>{b.backup_name}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-400">
                          {Math.round(b.file_size_bytes / 1024)} KB
                        </td>
                        <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                          {new Date(b.created_at).toLocaleDateString()} {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 text-gray-400 max-w-xs truncate" title={b.description || ''}>
                          {b.description || '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingBackup(b)}
                              className="p-1.5 rounded hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400 transition"
                              title="View Full Config Content"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteBackup(b.id, b.backup_name)}
                                className="p-1.5 rounded hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition"
                                title="Delete Backup"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Configuration Unified Diff Section */}
          <div className="noc-card p-5 rounded-xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.06)] space-y-4 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold font-sans text-white">
                  Visual Configuration Diff Engine
                </h3>
              </div>
              <span className="text-[11px] text-gray-400">
                Audit precise parameter changes, added firewall rules, and removed interfaces
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-xs text-gray-400 block mb-1">Baseline Backup (A):</span>
                <select
                  value={backupAId}
                  onChange={(e) => setBackupAId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-xl noc-input text-xs"
                >
                  <option value="">-- Select Baseline --</option>
                  {backups.map((b: ConfigBackup) => (
                    <option key={b.id} value={b.id}>
                      {b.device_name} ({b.backup_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-xs text-gray-400 block mb-1">Compare Target (B):</span>
                <select
                  value={backupBId}
                  onChange={(e) => setBackupBId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-xl noc-input text-xs"
                >
                  <option value="">-- Select Target --</option>
                  {backups.map((b: ConfigBackup) => (
                    <option key={b.id} value={b.id}>
                      {b.device_name} ({b.backup_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="self-end pt-5">
                <button
                  onClick={handleCompareDiff}
                  disabled={isDiffing || !backupAId || !backupBId}
                  className="w-full px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-mono text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  {isDiffing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Computing Diff...</span>
                    </>
                  ) : (
                    <>
                      <GitCompare className="w-4 h-4" />
                      <span>Compare Diffs</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {diffError && (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
                {diffError}
              </div>
            )}

            {diffResult && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-black/40 border border-gray-800 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400">
                      Comparing: <span className="text-white font-bold">{diffResult.backup_a_name}</span> vs{' '}
                      <span className="text-cyan-300 font-bold">{diffResult.backup_b_name}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-bold">
                      +{diffResult.added_lines_count} lines added
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-950/40 border border-rose-500/30 text-rose-400 font-bold">
                      -{diffResult.removed_lines_count} lines removed
                    </span>
                  </div>
                </div>

                {/* Unified Diff Box */}
                <div className="rounded-xl border border-gray-800 bg-[#060A12] p-3 max-h-[500px] overflow-y-auto font-mono text-xs">
                  {diffResult.diff_lines.length === 0 ? (
                    <div className="py-6 text-center text-gray-500 italic">
                      Configurations are completely identical. 0 differences found.
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {diffResult.diff_lines.map((line: string, idx: number) => {
                        let color = 'text-gray-300';
                        let bg = '';
                        if (line.startsWith('+') && !line.startsWith('+++')) {
                          color = 'text-emerald-300';
                          bg = 'bg-emerald-950/30 border-l-2 border-emerald-500 pl-2';
                        } else if (line.startsWith('-') && !line.startsWith('---')) {
                          color = 'text-rose-300';
                          bg = 'bg-rose-950/30 border-l-2 border-rose-500 pl-2';
                        } else if (line.startsWith('@@')) {
                          color = 'text-purple-300 font-bold';
                          bg = 'bg-purple-950/30 px-2 py-0.5 my-1 rounded';
                        }
                        return (
                          <div key={idx} className={`${color} ${bg} font-mono text-[11px] whitespace-pre select-all`}>
                            {line || ' '}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / UPLOAD CONFIG SNAPSHOT                                    */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm font-mono text-xs">
          <div className="noc-card rounded-2xl w-full max-w-lg p-6 border border-cyan-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold font-sans text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-cyan-400" />
                <span>Save Router Config Snapshot</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBackup} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 mb-1">Device Name *</label>
                  <input
                    type="text"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg noc-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Backup Name *</label>
                  <input
                    type="text"
                    value={newBackupName}
                    onChange={(e) => setNewBackupName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg noc-input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Hardened firewall rule snapshot before firmware upgrade"
                  className="w-full px-3 py-2 rounded-lg noc-input"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Configuration Script / RSC Content *</label>
                <textarea
                  rows={8}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="/ip firewall filter add chain=input action=accept protocol=tcp dst-port=22"
                  className="w-full p-3 rounded-lg noc-input font-mono text-[11px]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-800 hover:bg-gray-800 text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBackup}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold transition disabled:opacity-50"
                >
                  {isCreatingBackup ? 'Saving Snapshot...' : 'Save Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW FULL BACKUP CONTENT                                           */}
      {/* ========================================================================= */}
      {viewingBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm font-mono text-xs">
          <div className="noc-card rounded-2xl w-full max-w-2xl p-6 border border-cyan-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-base font-bold font-sans text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <span>{viewingBackup.backup_name}</span>
                </h3>
                <span className="text-gray-400 text-[11px]">
                  {viewingBackup.device_name} &bull; {Math.round(viewingBackup.file_size_bytes / 1024)} KB
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(viewingBackup.config_content)}
                  className="p-2 rounded-lg border border-gray-800 hover:bg-gray-800 text-gray-300 flex items-center gap-1.5 transition"
                  title="Copy Configuration Content"
                >
                  {copiedContent ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedContent ? 'Copied' : 'Copy'}</span>
                </button>
                <button onClick={() => setViewingBackup(null)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-[#060A12] p-3 max-h-[450px] overflow-y-auto text-[11px] font-mono text-gray-300 select-all whitespace-pre">
              {viewingBackup.config_content}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingBackup(null)}
                className="px-4 py-1.5 rounded-lg border border-gray-800 hover:bg-gray-800 text-gray-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
