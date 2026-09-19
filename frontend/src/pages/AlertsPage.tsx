import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Alert, AlertSeverity, AlertStatus, AlertThresholdsConfig } from '../types';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  VolumeX,
  Settings,
  X,
  MessageSquare,
  ShieldAlert,
  Sliders,
  Trash2,
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = user?.role === 'ADMIN' || user?.role === 'OPERATOR';

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Acknowledge Modal
  const [ackAlert, setAckAlert] = useState<Alert | null>(null);
  const [ackNote, setAckNote] = useState<string>('');

  const toggleSelectAll = () => {
    if (selectedIds.length === alerts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(alerts.map((a) => a.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDeleteAlert = async (id: number) => {
    if (!window.confirm(`Hapus permanen peringatan #${id}?`)) return;
    try {
      await api.deleteAlert(id);
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      toast.delete(`Peringatan #${id} berhasil dihapus dari database.`, 'Peringatan Dihapus');
      fetchAlerts();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus peringatan', 'Kesalahan Hapus');
    }
  };

  const handleBulkDeleteAlerts = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (!window.confirm(`Hapus permanen ${count} peringatan yang dipilih?`)) return;
    try {
      const res = await api.bulkDeleteAlerts(selectedIds);
      setSelectedIds([]);
      toast.delete(res.message || `${count} peringatan berhasil dihapus.`, 'Peringatan Massal Dihapus');
      fetchAlerts();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus peringatan terpilih', 'Hapus Gagal');
    }
  };

  const handlePurgeResolved = async () => {
    if (!window.confirm('Bersihkan semua peringatan berstatus RESOLVED dari database?')) return;
    try {
      const res = await api.purgeResolvedAlerts();
      toast.delete(res.message || 'Semua peringatan terselesaikan berhasil dibersihkan.', 'Pembersihan Selesai');
      fetchAlerts();
    } catch (err: any) {
      toast.error(err.message || 'Gagal membersihkan peringatan', 'Pembersihan Gagal');
    }
  };

  // Threshold Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [thresholds, setThresholds] = useState<AlertThresholdsConfig>({
    consecutive_failures_down: 3,
    high_latency_threshold_ms: 100.0,
    high_packet_loss_pct: 5.0,
    high_cpu_threshold_pct: 85.0,
    high_memory_threshold_pct: 85.0,
  });

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await api.listAlerts({
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
      });
      setAlerts(data);
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  };

  const fetchThresholds = async () => {
    try {
      const th = await api.getAlertThresholds();
      setThresholds(th);
    } catch (_) {}
  };

  useEffect(() => {
    fetchAlerts();
    fetchThresholds();
  }, [severityFilter, statusFilter]);

  const handleAcknowledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ackAlert) return;
    try {
      await api.acknowledgeAlert(ackAlert.id, ackNote);
      toast.info(`Peringatan #${ackAlert.id} berhasil di-acknowledge.`, 'Status Diperbarui');
      setAckAlert(null);
      setAckNote('');
      fetchAlerts();
    } catch (err: any) {
      toast.error(err.message || 'Gagal merespons alert');
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await api.resolveAlert(id);
      toast.success(`Peringatan #${id} berhasil diselesaikan (Resolved).`, 'Insiden Ditutup');
      fetchAlerts();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyelesaikan peringatan');
    }
  };

  const handleMute = async (id: number) => {
    try {
      await api.muteAlert(id);
      toast.info(`Peringatan #${id} disenyapkan (Muted).`, 'Alert Disenyapkan');
      fetchAlerts();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mendiamkan alert');
    }
  };

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateAlertThresholds(thresholds);
      toast.success('Ambang batas alert sistem berhasil diperbarui.', 'Konfigurasi Disimpan');
      setIsSettingsOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan konfigurasi');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-white tracking-tight">
            Alerts Management Center
          </h1>
          <p className="text-xs font-mono text-cyan-400 mt-0.5">
            Real-Time Threshold Event Processing &amp; Incident Dispatch
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canManage && (
            <button
              onClick={handlePurgeResolved}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 text-xs font-mono transition"
              title="Permanently remove all resolved alerts from database storage"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Purge Resolved Alerts</span>
            </button>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-800 bg-[#111827] hover:border-cyan-500/40 text-gray-300 text-xs font-mono transition"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Configure Thresholds</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="noc-card p-4 rounded-xl flex flex-wrap items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="noc-input px-2.5 py-1.5 rounded-lg"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
            <option value="RECOVERY">Recovery</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="noc-input px-2.5 py-1.5 rounded-lg"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
            <option value="MUTED">Muted</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && canManage && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-rose-300 font-bold">
              {selectedIds.length} alert(s) selected for deletion
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white transition"
            >
              Deselect All
            </button>
            <button
              onClick={handleBulkDeleteAlerts}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-lg"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected Alerts ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="noc-card rounded-xl overflow-hidden border border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0E1424] border-b border-gray-800 text-gray-400 uppercase text-[11px]">
              <tr>
                {canManage && (
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={alerts.length > 0 && selectedIds.length === alerts.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                  </th>
                )}
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Device</th>
                <th className="py-3 px-4">Title &amp; Message</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="py-12 text-center text-gray-400">
                    No alerts found matching filter criteria.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => {
                  const isCrit = alert.severity === 'CRITICAL';
                  const isWarn = alert.severity === 'WARNING';
                  const isRec = alert.severity === 'RECOVERY';
                  const isSelected = selectedIds.includes(alert.id);

                  return (
                    <tr
                      key={alert.id}
                      className={`hover:bg-white/[0.02] transition ${
                        isSelected ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      {canManage && (
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(alert.id)}
                            className="rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-0 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                            isCrit
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : isWarn
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : isRec
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-white font-bold">
                        {alert.device_name || `Device #${alert.device_id}`}
                        <span className="block text-[10px] text-gray-400 font-normal">
                          {alert.device_ip}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-sans font-semibold text-gray-100">{alert.title}</div>
                        <div className="text-gray-400 text-[11px] mt-0.5 whitespace-pre-wrap line-clamp-2">
                          {alert.message}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 whitespace-nowrap">
                        {new Date(alert.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-gray-300 font-semibold">{alert.status}</span>
                        {alert.acknowledged_by && (
                          <span className="block text-[10px] text-gray-400">
                            by {alert.acknowledged_by}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {alert.status === 'ACTIVE' && (
                            <button
                              onClick={() => {
                                setAckAlert(alert);
                                setAckNote('');
                              }}
                              className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-[11px] transition"
                            >
                              Acknowledge
                            </button>
                          )}

                          {alert.status !== 'RESOLVED' && (
                            <button
                              onClick={() => handleResolve(alert.id)}
                              className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-[11px] transition"
                            >
                              Resolve
                            </button>
                          )}

                          {alert.status !== 'MUTED' && alert.status !== 'RESOLVED' && (
                            <button
                              onClick={() => handleMute(alert.id)}
                              className="p-1 rounded text-gray-400 hover:text-gray-200"
                              title="Mute Alert"
                            >
                              <VolumeX className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canManage && (
                            <button
                              onClick={() => handleDeleteAlert(alert.id)}
                              className="p-1 rounded text-gray-400 hover:text-rose-400 transition"
                              title="Delete Alert"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Acknowledge Note Modal */}
      {ackAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="noc-card rounded-2xl w-full max-w-md p-6 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold font-sans text-white">
                Acknowledge Incident Alert #{ackAlert.id}
              </h3>
              <button onClick={() => setAckAlert(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAcknowledgeSubmit} className="space-y-4 text-xs font-mono">
              <p className="text-gray-300">{ackAlert.title}</p>
              <div>
                <label className="block text-gray-400 mb-1">Operator Notes / Action Taken:</label>
                <textarea
                  rows={3}
                  value={ackNote}
                  onChange={(e) => setAckNote(e.target.value)}
                  placeholder="e.g. Checking fiber patch cable on rack 2..."
                  className="w-full noc-input p-2.5 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAckAlert(null)}
                  className="px-3 py-1.5 rounded border border-gray-700 text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-amber-500 text-black font-bold hover:bg-amber-400 transition"
                >
                  Confirm Acknowledge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Threshold Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="noc-card rounded-2xl w-full max-w-lg p-6 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold font-sans text-white">
                System Threshold Configuration
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveThresholds} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-gray-300 mb-1">
                  Down Threshold (Consecutive Failed Polls)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={thresholds.consecutive_failures_down}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, consecutive_failures_down: parseInt(e.target.value) || 3 })
                  }
                  className="w-full noc-input p-2 rounded text-xs"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Prevents false positives: device must fail N times consecutively before marking DOWN.
                </span>
              </div>

              <div>
                <label className="block text-gray-300 mb-1">
                  High Latency Threshold (ms)
                </label>
                <input
                  type="number"
                  value={thresholds.high_latency_threshold_ms}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, high_latency_threshold_ms: parseFloat(e.target.value) || 100 })
                  }
                  className="w-full noc-input p-2 rounded text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">
                  High Packet Loss Threshold (%)
                </label>
                <input
                  type="number"
                  value={thresholds.high_packet_loss_pct}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, high_packet_loss_pct: parseFloat(e.target.value) || 5 })
                  }
                  className="w-full noc-input p-2 rounded text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">
                  High CPU Usage Threshold (%)
                </label>
                <input
                  type="number"
                  value={thresholds.high_cpu_threshold_pct}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, high_cpu_threshold_pct: parseFloat(e.target.value) || 85 })
                  }
                  className="w-full noc-input p-2 rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-3 py-1.5 rounded border border-gray-700 text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition"
                >
                  Save Thresholds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
