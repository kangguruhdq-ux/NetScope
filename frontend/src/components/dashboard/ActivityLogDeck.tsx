import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { AuditLogItem } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  History,
  Trash2,
  RefreshCw,
  Search,
  User,
  Activity,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Server,
  Filter,
} from 'lucide-react';

export const ActivityLogDeck: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const toast = useToast();

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.listAuditLogs(
        searchTerm || undefined,
        actionFilter !== 'ALL' ? actionFilter : undefined,
        50,
        0
      );
      setLogs(res.logs);
      setTotalCount(res.total);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleDeleteLog = async (id: number) => {
    setDeletingId(id);
    try {
      await api.deleteAuditLog(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      toast.delete(`Log aktivitas #${id} berhasil dihapus dari sistem.`, 'Log Dihapus');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus log aktivitas.', 'Gagal');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAllLogs = async () => {
    setIsClearing(true);
    try {
      const res = await api.clearAuditLogs();
      setLogs([]);
      setTotalCount(0);
      setShowClearConfirm(false);
      toast.delete(
        `Berhasil membersihkan ${res.deleted_count} rekaman log aktivitas.`,
        'Seluruh Log Dibersihkan'
      );
    } catch (err: any) {
      toast.error(err.message || 'Gagal membersihkan log aktivitas.', 'Gagal');
    } finally {
      setIsClearing(false);
    }
  };

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('PURGE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-rose-950/70 border border-rose-500/40 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.2)]">
          <Trash2 className="w-2.5 h-2.5" />
          {act}
        </span>
      );
    }
    if (act.includes('CREATE') || act.includes('SEED')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="w-2.5 h-2.5" />
          {act}
        </span>
      );
    }
    if (act.includes('AUTH') || act.includes('LOGIN')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
          <Shield className="w-2.5 h-2.5" />
          {act}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-amber-950/70 border border-amber-500/40 text-amber-300">
        <Activity className="w-2.5 h-2.5" />
        {act}
      </span>
    );
  };

  return (
    <div className="noc-card rounded-xl p-4 sm:p-5 border border-cyan-500/30 bg-[#0E1526]/95 space-y-4 shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold font-sans text-white tracking-wide">
                Live Platform Activity &amp; Audit Trail
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                {totalCount} Events
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Rekaman jejak aktivitas seluruh pengguna &amp; operasi sistem secara real-time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-gray-800 hover:border-cyan-500/40 bg-[#0B0F19] text-gray-400 hover:text-cyan-300 transition"
            title="Refresh Activity Logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-950/30 hover:bg-rose-950/60 text-rose-300 hover:text-white font-mono text-xs transition disabled:opacity-40"
            title="Bersihkan seluruh riwayat audit log"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Hapus Semua Log</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 font-mono text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari user, deskripsi, action, atau IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#080D18] border border-gray-800 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#080D18] border border-gray-800 text-gray-300 focus:outline-none focus:border-cyan-500/50 text-xs"
          >
            <option value="ALL">Semua Aksi (All Actions)</option>
            <option value="AUTH_LOGIN">Login User</option>
            <option value="AUTH_REGISTER">Register User</option>
            <option value="DELETE_DEVICE">Hapus Perangkat</option>
            <option value="DELETE_LINK">Hapus Jalur Topologi</option>
            <option value="DELETE_WEB_TARGET">Hapus Target Web</option>
            <option value="CREATE_BACKUP">Buat Backup Config</option>
            <option value="DELETE_BACKUP">Hapus Backup Config</option>
          </select>
        </div>
      </div>

      {/* Activity Table with responsive overflow wrapper */}
      <div className="rounded-xl border border-gray-800 overflow-x-auto bg-[#070B14]">
        <table className="w-full text-left text-xs min-w-[700px]">
          <thead className="bg-[#0A101D] border-b border-gray-800 text-gray-400 uppercase text-[10px] font-mono">
            <tr>
              <th className="py-2.5 px-3">Waktu</th>
              <th className="py-2.5 px-3">Pengguna</th>
              <th className="py-2.5 px-3">Aksi</th>
              <th className="py-2.5 px-3">Entitas</th>
              <th className="py-2.5 px-3">Deskripsi Aktivitas</th>
              <th className="py-2.5 px-3">IP Soket</th>
              <th className="py-2.5 px-3 text-right">Opsi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900 font-mono">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500 italic">
                  {isLoading ? 'Memuat log aktivitas...' : 'Tidak ada catatan aktivitas yang cocok.'}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-2 px-3 text-gray-400 whitespace-nowrap text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-gray-500 shrink-0" />
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className="text-cyan-300 font-bold flex items-center gap-1">
                      <User className="w-3 h-3 text-cyan-400" />
                      @{log.username || 'System'}
                    </span>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap text-[10px] text-gray-400 uppercase">
                    {log.entity}
                  </td>
                  <td className="py-2 px-3 text-gray-200 text-xs font-sans max-w-sm break-words">
                    {log.description || '-'}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap text-[11px] text-gray-400">
                    <span className="px-1.5 py-0.5 rounded bg-black/40 border border-gray-800">
                      {log.ip_address || '127.0.0.1'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      disabled={deletingId === log.id}
                      className="p-1.5 rounded-lg border border-transparent hover:border-rose-500/40 hover:bg-rose-950/40 text-gray-500 hover:text-rose-400 transition"
                      title="Hapus log ini"
                      aria-label="Hapus Log"
                    >
                      <Trash2 className={`w-3.5 h-3.5 ${deletingId === log.id ? 'animate-spin' : ''}`} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal for Clearing All Logs */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="noc-card rounded-2xl w-full max-w-md p-5 border border-rose-500/40 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-rose-400 border-b border-gray-800 pb-3">
              <div className="p-2 rounded-xl bg-rose-950 border border-rose-500/40">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold font-sans text-white">Konfirmasi Pembersihan Log</h4>
                <p className="text-[11px] text-gray-400">Aksi ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-gray-300 font-sans text-xs leading-relaxed">
              Apakah Anda yakin ingin menghapus seluruh riwayat audit log aktivitas ({totalCount} rekaman)?
              Seluruh catatan aktivitas lama akan dihapus permanen dari basis data.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-800">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white transition"
              >
                Batal
              </button>
              <button
                onClick={handleClearAllLogs}
                disabled={isClearing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-lg disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearing ? 'Membersihkan...' : 'Ya, Bersihkan Semua'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
