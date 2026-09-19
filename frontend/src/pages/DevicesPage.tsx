import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Device, DeviceType, DeviceStatus } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { DeviceTypeIcon } from '../components/common/DeviceTypeIcon';
import { DeviceModal } from '../components/devices/DeviceModal';
import {
  Plus,
  Search,
  Filter,
  Activity,
  Trash2,
  Edit2,
  Wrench,
  Play,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export const DevicesPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [devices, setDevices] = useState<Device[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Quick Ping State
  const [pingingId, setPingingId] = useState<number | null>(null);
  const [pingResult, setPingResult] = useState<{ id: number; rtt: number | null; output: string } | null>(null);

  const toggleSelectAll = () => {
    if (selectedIds.length === devices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(devices.map((d) => d.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (!window.confirm(`Hapus permanen ${count} perangkat yang dipilih beserta riwayat metriknya?`)) return;
    try {
      const res = await api.bulkDeleteDevices(selectedIds);
      setSelectedIds([]);
      toast.delete(res.message || `${count} perangkat berhasil dihapus dari sistem.`, 'Hapus Massal Berhasil');
      fetchDevices();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus perangkat terpilih', 'Hapus Gagal');
    }
  };

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const data = await api.listDevices({
        search: search || undefined,
        device_type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      setDevices(data);
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [typeFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDevices();
  };

  const handleSaveDevice = async (deviceData: any) => {
    try {
      if (selectedDevice) {
        await api.updateDevice(selectedDevice.id, deviceData);
        toast.success(`Konfigurasi perangkat "${deviceData.name || selectedDevice.name}" berhasil disimpan.`, 'Perangkat Diperbarui');
      } else {
        await api.createDevice(deviceData);
        toast.success(`Perangkat baru "${deviceData.name}" berhasil ditambahkan ke pemantauan.`, 'Perangkat Terdaftar');
      }
      fetchDevices();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan perangkat', 'Kesalahan Penyimpanan');
    }
  };

  const handleDeleteDevice = async (id: number, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus perangkat "${name}" dari NetScope?`)) {
      try {
        await api.deleteDevice(id);
        toast.delete(`Perangkat "${name}" berhasil dihapus dari monitoring.`, 'Perangkat Dihapus');
        fetchDevices();
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghapus perangkat', 'Kesalahan Hapus');
      }
    }
  };

  const handleToggleMaintenance = async (id: number) => {
    try {
      await api.toggleMaintenance(id);
      toast.info('Status pemeliharaan perangkat berhasil diperbarui.', 'Mode Pemeliharaan');
      fetchDevices();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui status perangkat');
    }
  };

  const handleLivePing = async (id: number) => {
    setPingingId(id);
    setPingResult(null);
    try {
      const res = await api.livePing(id);
      setPingResult({
        id,
        rtt: res.latency_ms,
        output: `${res.engine_used.toUpperCase()}: ${res.is_alive ? 'Online' : 'Unreachable'} (${res.latency_ms ?? 0}ms, ${res.packet_loss_pct}% loss)`,
      });
    } catch (_) {
      setPingResult({ id, rtt: null, output: 'Live ping failed' });
    } finally {
      setPingingId(null);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${seconds % 60}s`;
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-white tracking-tight">
            Device Management
          </h1>
          <p className="text-xs font-mono text-cyan-400 mt-0.5">
            Physical Network Hardware Inventory &amp; Interface Metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedDevice(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-gray-950 font-bold font-mono text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Device</span>
          </button>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="noc-card p-4 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, IP, or location..."
            className="w-full pl-9 pr-3 py-2 rounded-lg noc-input text-xs font-mono"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-gray-400">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="noc-input px-2.5 py-1.5 rounded-lg text-xs font-mono"
            >
              <option value="">All Types</option>
              <option value="ROUTER">Router</option>
              <option value="SWITCH">Switch</option>
              <option value="ACCESS_POINT">Access Point</option>
              <option value="SERVER">Server</option>
              <option value="PC">PC</option>
              <option value="PRINTER">Printer</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-gray-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="noc-input px-2.5 py-1.5 rounded-lg text-xs font-mono"
            >
              <option value="">All Statuses</option>
              <option value="UP">UP</option>
              <option value="DEGRADED">DEGRADED</option>
              <option value="DOWN">DOWN</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </div>

          <button
            onClick={fetchDevices}
            className="p-2 rounded-lg border border-gray-800 hover:border-cyan-500/40 text-gray-400 hover:text-cyan-400 transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && isAdmin && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-rose-300 font-bold">
              {selectedIds.length} device(s) selected for bulk action
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
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-lg"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected Devices ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Device Table */}
      <div className="noc-card rounded-xl overflow-hidden border border-gray-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0E1424] border-b border-gray-800 text-gray-400 uppercase tracking-wider text-[11px]">
              <tr>
                {isAdmin && (
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={devices.length > 0 && selectedIds.length === devices.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                  </th>
                )}
                <th className="py-3 px-4 font-medium">Device Name</th>
                <th className="py-3 px-4 font-medium">Type</th>
                <th className="py-3 px-4 font-medium">IP Address</th>
                <th className="py-3 px-4 font-medium">Protocols</th>
                <th className="py-3 px-4 font-medium">Latency</th>
                <th className="py-3 px-4 font-medium">Uptime</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-gray-400 font-mono">
                    No devices match the criteria. Click "Add Device" to register a node.
                  </td>
                </tr>
              ) : (
                devices.map((device) => {
                  const isSelected = selectedIds.includes(device.id);
                  return (
                  <tr
                    key={device.id}
                    className={`hover:bg-white/[0.02] transition group ${
                      isSelected ? 'bg-cyan-950/20' : ''
                    }`}
                  >
                    {isAdmin && (
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(device.id)}
                          className="rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/devices/${device.id}`}
                        className="flex items-center gap-3 text-white hover:text-cyan-400 transition"
                      >
                        <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                          <DeviceTypeIcon type={device.device_type} className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-sans font-semibold text-sm text-gray-100 group-hover:text-cyan-300">
                            {device.name}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono">
                            {device.location || 'Location unassigned'}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-gray-300">{device.device_type}</td>
                    <td className="py-3.5 px-4 text-cyan-300 font-bold">{device.ip_address}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {device.protocols?.map((p) => (
                          <span
                            key={p}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-gray-800 text-gray-300"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {device.current_latency_ms != null ? (
                        <span className="text-cyan-400 font-medium">
                          {device.current_latency_ms} ms
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-400">
                      {formatUptime(device.uptime_seconds)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={device.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Live Ping button */}
                        <button
                          onClick={() => handleLivePing(device.id)}
                          disabled={pingingId === device.id}
                          className="p-1.5 rounded hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400 transition"
                          title="Send Live ICMP Ping Now"
                        >
                          <Activity
                            className={`w-4 h-4 ${pingingId === device.id ? 'animate-spin text-cyan-400' : ''}`}
                          />
                        </button>

                        {/* Toggle Maintenance mode */}
                        <button
                          onClick={() => handleToggleMaintenance(device.id)}
                          className={`p-1.5 rounded transition ${
                            device.status === 'MAINTENANCE'
                              ? 'text-purple-400 bg-purple-500/20'
                              : 'text-gray-400 hover:text-purple-400 hover:bg-purple-500/10'
                          }`}
                          title="Toggle Maintenance Mode"
                        >
                          <Wrench className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => {
                            setSelectedDevice(device);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition"
                          title="Edit Device Configuration"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteDevice(device.id, device.name)}
                          className="p-1.5 rounded hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition"
                          title="Delete Device"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>

        {/* Live Ping Alert popup indicator if triggered */}
        {pingResult && (
          <div className="p-3 bg-black/60 border-t border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center justify-between">
            <span>Ping Result for Device #{pingResult.id}: {pingResult.output}</span>
            <button onClick={() => setPingResult(null)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
        )}
      </div>

      <DeviceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveDevice}
        initialDevice={selectedDevice}
      />
    </div>
  );
};
