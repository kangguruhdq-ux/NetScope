import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { User, AlertThresholdsConfig, UserRole, StorageInfo } from '../types';
import {
  Settings,
  Users,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Key,
  X,
  Search,
  Shield,
  UserCheck,
  UserX,
  HardDrive,
  Database,
  RefreshCw,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'thresholds' | 'storage'>('users');

  // Users state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Storage state
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);
  const [isVacuuming, setIsVacuuming] = useState(false);

  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isResetPwdOpen, setIsResetPwdOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Add User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('OPERATOR');
  const [newPassword, setNewPassword] = useState('');

  // Edit User Form State
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('OPERATOR');
  const [editIsActive, setEditIsActive] = useState(true);

  // Reset Password State
  const [adminResetPwd, setAdminResetPwd] = useState('');

  // Thresholds state
  const [thresholds, setThresholds] = useState<AlertThresholdsConfig>({
    consecutive_failures_down: 3,
    high_latency_threshold_ms: 100.0,
    high_packet_loss_pct: 5.0,
    high_cpu_threshold_pct: 85.0,
    high_memory_threshold_pct: 85.0,
  });

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

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await api.listUsers();
      setUsersList(data);
    } catch (err: any) {
      showNotification(err.message || 'Failed to fetch users', 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchThresholds = async () => {
    try {
      const th = await api.getAlertThresholds();
      setThresholds(th);
    } catch (_) {}
  };

  const fetchStorageInfo = async () => {
    setIsLoadingStorage(true);
    try {
      const data = await api.getStorageInfo();
      setStorageInfo(data);
    } catch (err: any) {
      showNotification(err.message || 'Failed to fetch storage info', 'error');
    } finally {
      setIsLoadingStorage(false);
    }
  };

  const handlePurgeSamples = async (days: number = 7, purgeAll: boolean = false) => {
    const promptMsg = purgeAll
      ? 'Purge ALL historical metric samples (latency, packet loss)? Real-time polling will continue immediately.'
      : `Purge metric samples older than ${days} days?`;
    if (!window.confirm(promptMsg)) return;
    try {
      const res = await api.purgeSamples(days, purgeAll);
      showNotification(res.message);
      fetchStorageInfo();
    } catch (err: any) {
      showNotification(err.message || 'Purge failed', 'error');
    }
  };

  const handlePurgeAlerts = async (onlyResolved: boolean = true) => {
    if (!window.confirm(onlyResolved ? 'Purge all resolved alerts from database storage?' : 'Purge alerts?')) return;
    try {
      const res = await api.purgeAlerts(onlyResolved);
      showNotification(res.message);
      fetchStorageInfo();
    } catch (err: any) {
      showNotification(err.message || 'Purge alerts failed', 'error');
    }
  };

  const handlePurgeEvents = async (days: number = 14) => {
    if (!window.confirm(`Purge historical network events older than ${days} days?`)) return;
    try {
      const res = await api.purgeEvents(days);
      showNotification(res.message);
      fetchStorageInfo();
    } catch (err: any) {
      showNotification(err.message || 'Purge events failed', 'error');
    }
  };

  const handleVacuumDatabase = async () => {
    if (!window.confirm('Run SQLite VACUUM now? This will compact database pages and reclaim free disk space.')) return;
    setIsVacuuming(true);
    try {
      const res = await api.vacuumDatabase();
      showNotification(res.message);
      fetchStorageInfo();
    } catch (err: any) {
      showNotification(err.message || 'Database VACUUM failed', 'error');
    } finally {
      setIsVacuuming(false);
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUserIds.length === 0) return;
    const count = selectedUserIds.length;
    if (!window.confirm(`Hapus permanen ${count} akun pengguna yang dipilih?`)) return;
    try {
      const res = await api.bulkDeleteUsers(selectedUserIds);
      setSelectedUserIds([]);
      toast.delete(res.message || `${count} pengguna berhasil dihapus.`, 'Pengguna Massal Dihapus');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus pengguna terpilih');
    }
  };

  const toggleSelectAllUsers = (filtered: User[]) => {
    const selectable = filtered.filter((u) => u.id !== currentUser?.id);
    if (selectedUserIds.length === selectable.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(selectable.map((u) => u.id));
    }
  };

  const toggleSelectOneUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      fetchUsers();
      fetchThresholds();
      fetchStorageInfo();
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'storage' && currentUser?.role === 'ADMIN') {
      fetchStorageInfo();
    }
  }, [activeTab]);

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="text-center py-16 text-xs font-mono text-rose-400">
        Access Denied: Platform Administration requires Administrator privileges.
      </div>
    );
  }

  // Handle Add User
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        username: newUsername,
        full_name: newFullName,
        email: newEmail,
        role: newRole,
        password: newPassword,
      });
      showNotification(`User @${newUsername} created successfully.`);
      setIsAddUserOpen(false);
      setNewUsername('');
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      fetchUsers();
    } catch (err: any) {
      showNotification(err.message || 'Failed to create user', 'error');
    }
  };

  // Open Edit User
  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setEditFullName(user.full_name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditIsActive(user.is_active);
    setIsEditUserOpen(true);
  };

  // Handle Edit User
  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await api.updateUser(selectedUser.id, {
        full_name: editFullName,
        email: editEmail,
        role: editRole,
        is_active: editIsActive,
      });
      showNotification(`User @${selectedUser.username} updated successfully.`);
      setIsEditUserOpen(false);
      fetchUsers();
    } catch (err: any) {
      showNotification(err.message || 'Failed to update user', 'error');
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('Tidak dapat menghapus akun administrator yang sedang aktif digunakan.');
      return;
    }
    if (window.confirm(`Apakah Anda yakin ingin menghapus akun pengguna "@${user.username}"?`)) {
      try {
        await api.deleteUser(user.id);
        toast.delete(`Akun pengguna "@${user.username}" berhasil dihapus dari sistem.`, 'Pengguna Dihapus');
        fetchUsers();
      } catch (err: any) {
        toast.error(err.message || 'Gagal menghapus akun pengguna');
      }
    }
  };

  // Handle Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (adminResetPwd.length < 6) {
      showNotification('Password must be at least 6 characters.', 'error');
      return;
    }
    try {
      await api.resetUserPassword(selectedUser.id, adminResetPwd);
      showNotification(`Password for @${selectedUser.username} reset successfully.`);
      setIsResetPwdOpen(false);
      setAdminResetPwd('');
    } catch (err: any) {
      showNotification(err.message || 'Failed to reset password', 'error');
    }
  };

  // Handle Save Thresholds
  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateAlertThresholds(thresholds);
      showNotification('Global threshold configurations saved to database.');
    } catch (err: any) {
      showNotification(err.message || 'Failed to save thresholds', 'error');
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl pb-16 page-fade-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-white tracking-tight">
            Platform Configuration &amp; Administration
          </h1>
          <p className="text-xs font-mono text-cyan-400 mt-0.5">
            Full Operations Governance &bull; Complete User CRUD &bull; Hardware Thresholds
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-black/40 border border-gray-800 rounded-xl p-1 text-xs font-mono">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'users'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Management ({usersList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('thresholds')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'thresholds'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Alert Thresholds</span>
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'storage'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Storage &amp; Retention</span>
          </button>
        </div>
      </div>

      {/* Global Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: USER MANAGEMENT CRUD */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="noc-card p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search username, email, name, role..."
                className="w-full pl-9 pr-3 py-2 rounded-lg noc-input text-xs font-mono"
              />
            </div>

            <button
              onClick={() => setIsAddUserOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-gray-950 font-bold font-mono text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create New User</span>
            </button>
          </div>

          {/* Bulk delete bar for users */}
          {selectedUserIds.length > 0 && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-rose-300 font-bold">
                  {selectedUserIds.length} user account(s) selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedUserIds([])}
                  className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white transition"
                >
                  Deselect All
                </button>
                <button
                  onClick={handleBulkDeleteUsers}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected Accounts ({selectedUserIds.length})</span>
                </button>
              </div>
            </div>
          )}

          <div className="noc-card rounded-xl overflow-hidden border border-gray-800 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0E1424] border-b border-gray-800 text-gray-400 uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredUsers.filter((u) => u.id !== currentUser?.id).length > 0 &&
                          selectedUserIds.length ===
                            filteredUsers.filter((u) => u.id !== currentUser?.id).length
                        }
                        onChange={() => toggleSelectAllUsers(filteredUsers)}
                        className="rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400 font-mono">
                        No users found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-white/[0.02] transition ${
                            isSelected ? 'bg-cyan-950/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            {!isSelf ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectOneUser(u.id)}
                                className="rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-0 cursor-pointer"
                              />
                            ) : (
                              <span className="text-gray-600 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-sans font-semibold text-white">
                            {u.full_name}
                            {isSelf && (
                              <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                You
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-cyan-300 font-bold">@{u.username}</td>
                          <td className="py-3 px-4 text-gray-300">{u.email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                                u.role === 'ADMIN'
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                  : u.role === 'OPERATOR'
                                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                  : 'bg-gray-800 text-gray-300 border-gray-700'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] ${
                                u.is_active ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'
                              }`}
                            >
                              {u.is_active ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                              <span>{u.is_active ? 'Active' : 'Disabled'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-400">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEdit(u)}
                                className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition"
                                title="Edit User Details & Role"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setAdminResetPwd('');
                                  setIsResetPwdOpen(true);
                                }}
                                className="p-1.5 rounded hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400 transition"
                                title="Reset User Password"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>

                              {!isSelf && (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 rounded hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition"
                                  title="Delete User Permanently"
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
        </div>
      )}

      {/* TAB 2: ALERT THRESHOLDS */}
      {activeTab === 'thresholds' && (
        <div className="noc-card p-6 rounded-2xl border border-gray-800 space-y-6">
          <div className="flex items-center gap-2.5 border-b border-gray-800 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold font-sans text-white">
              Real Network Incident Thresholds
            </h2>
          </div>

          <form onSubmit={handleSaveThresholds} className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-mono">
            <div>
              <label className="block text-gray-300 mb-1">
                Consecutive Failures for DOWN Status:
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={thresholds.consecutive_failures_down}
                onChange={(e) =>
                  setThresholds({ ...thresholds, consecutive_failures_down: parseInt(e.target.value) || 3 })
                }
                className="w-full noc-input p-2.5 rounded-xl"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Prevents false-alarms by verifying packet drops over multiple poll cycles.
              </span>
            </div>

            <div>
              <label className="block text-gray-300 mb-1">
                High Latency Threshold (ms):
              </label>
              <input
                type="number"
                value={thresholds.high_latency_threshold_ms}
                onChange={(e) =>
                  setThresholds({ ...thresholds, high_latency_threshold_ms: parseFloat(e.target.value) || 100 })
                }
                className="w-full noc-input p-2.5 rounded-xl"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Triggers WARNING status when ping RTT exceeds this threshold.
              </span>
            </div>

            <div>
              <label className="block text-gray-300 mb-1">
                Packet Loss Warning Threshold (%):
              </label>
              <input
                type="number"
                value={thresholds.high_packet_loss_pct}
                onChange={(e) =>
                  setThresholds({ ...thresholds, high_packet_loss_pct: parseFloat(e.target.value) || 5 })
                }
                className="w-full noc-input p-2.5 rounded-xl"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Triggers DEGRADED performance alerts when ICMP loss exceeds limit.
              </span>
            </div>

            <div>
              <label className="block text-gray-300 mb-1">
                High CPU / Memory Threshold (%):
              </label>
              <input
                type="number"
                value={thresholds.high_cpu_threshold_pct}
                onChange={(e) =>
                  setThresholds({ ...thresholds, high_cpu_threshold_pct: parseFloat(e.target.value) || 85 })
                }
                className="w-full noc-input p-2.5 rounded-xl"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                SNMP threshold for device processor and memory stress.
              </span>
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-bold font-mono text-xs hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition"
              >
                Save Threshold Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: STORAGE & RETENTION MAINTENANCE */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          {/* Top summary card */}
          <div className="noc-card p-6 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-5 h-5 text-cyan-400" />
                <div>
                  <h2 className="text-base font-bold font-sans text-white">
                    SQLite Database Storage Telemetry &amp; Capacity
                  </h2>
                  <p className="text-xs font-mono text-gray-400">
                    Live disk usage, row counts, and storage defragmentation tools
                  </p>
                </div>
              </div>
              <button
                onClick={fetchStorageInfo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-800 bg-[#111827] hover:border-cyan-500/40 text-gray-300 text-xs font-mono transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStorage ? 'animate-spin text-cyan-400' : ''}`} />
                <span>Refresh Storage Stats</span>
              </button>
            </div>

            {/* Storage stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs font-mono">
              <div className="p-4 rounded-xl bg-black/40 border border-gray-800">
                <div className="text-gray-400 uppercase text-[10px]">Database Disk Footprint</div>
                <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">
                  {storageInfo ? `${storageInfo.db_size_mb} MB` : '...'}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">Physical SQLite file</div>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-gray-800">
                <div className="text-gray-400 uppercase text-[10px]">Metric Samples</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {storageInfo ? storageInfo.samples_count.toLocaleString() : '...'}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">Latency / Loss data points</div>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-gray-800">
                <div className="text-gray-400 uppercase text-[10px]">Total Alerts</div>
                <div className="text-2xl font-bold font-mono text-amber-300 mt-1">
                  {storageInfo ? storageInfo.alerts_count.toLocaleString() : '...'}
                </div>
                <div className="text-[10px] text-emerald-400 mt-1">
                  {storageInfo ? `${storageInfo.resolved_alerts_count} resolved` : '...'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-gray-800">
                <div className="text-gray-400 uppercase text-[10px]">Diagnostic Events</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {storageInfo ? storageInfo.events_count.toLocaleString() : '...'}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">Historical state transitions</div>
              </div>
            </div>
          </div>

          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
            {/* Action 1: Prune Metric Samples */}
            <div className="noc-card p-5 rounded-2xl border border-gray-800 space-y-3">
              <div className="flex items-center gap-2 text-cyan-300 font-bold border-b border-gray-800 pb-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>1. Prune High-Frequency Metric Samples</span>
              </div>
              <p className="text-gray-400 text-[11px]">
                NetScope continuously polls ICMP latency and packet loss. Older samples can be pruned to save megabytes of storage while preserving current monitoring.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handlePurgeSamples(7)}
                  className="px-3 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-white transition border border-gray-700"
                >
                  Prune &gt; 7 Days Old
                </button>
                <button
                  onClick={() => handlePurgeSamples(14)}
                  className="px-3 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-white transition border border-gray-700"
                >
                  Prune &gt; 14 Days Old
                </button>
                <button
                  onClick={() => handlePurgeSamples(30)}
                  className="px-3 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-white transition border border-gray-700"
                >
                  Prune &gt; 30 Days Old
                </button>
                <button
                  onClick={() => handlePurgeSamples(0, true)}
                  className="px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 transition border border-rose-500/40"
                >
                  Purge All Samples
                </button>
              </div>
            </div>

            {/* Action 2: Purge Resolved Alerts */}
            <div className="noc-card p-5 rounded-2xl border border-gray-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold border-b border-gray-800 pb-2">
                <Trash2 className="w-4 h-4 text-amber-400" />
                <span>2. Clean Resolved Alerts History</span>
              </div>
              <p className="text-gray-400 text-[11px]">
                Remove old acknowledged and resolved incident records from database storage. Active unresolved alerts will remain untouched.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => handlePurgeAlerts(true)}
                  className="w-full py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 transition"
                >
                  Purge All Resolved Alerts ({storageInfo?.resolved_alerts_count ?? 0})
                </button>
              </div>
            </div>

            {/* Action 3: Purge Diagnostic Events */}
            <div className="noc-card p-5 rounded-2xl border border-gray-800 space-y-3">
              <div className="flex items-center gap-2 text-purple-300 font-bold border-b border-gray-800 pb-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>3. Prune Network Diagnostic Events</span>
              </div>
              <p className="text-gray-400 text-[11px]">
                Clear operational logs and device up/down transition logs older than 14 days to keep event tables lean and query speeds optimal.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => handlePurgeEvents(14)}
                  className="w-full py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition"
                >
                  Prune Events Older Than 14 Days
                </button>
              </div>
            </div>

            {/* Action 4: SQLite VACUUM */}
            <div className="noc-card p-5 rounded-2xl border border-cyan-500/40 bg-cyan-950/10 space-y-3 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              <div className="flex items-center gap-2 text-cyan-300 font-bold border-b border-cyan-500/20 pb-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span>4. Compact Storage (SQLite VACUUM)</span>
              </div>
              <p className="text-gray-300 text-[11px]">
                In SQLite, row deletions mark database pages as free but do NOT shrink the file size automatically. Executing <span className="text-cyan-300 font-bold font-mono">VACUUM</span> rebuilds the database file and physically releases free space back to Windows disk storage.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleVacuumDatabase}
                  disabled={isVacuuming}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-gray-950 font-bold font-mono text-xs transition shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isVacuuming ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Defragmenting Database Pages...</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Run SQLite VACUUM (Reclaim Disk Space)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD USER */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="noc-card rounded-2xl w-full max-w-md p-6 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold font-sans text-white">Create New User</h3>
              <button onClick={() => setIsAddUserOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-gray-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Operator Name"
                  required
                  className="w-full noc-input p-2 rounded-lg text-sm font-sans"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Username *</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="username"
                  required
                  className="w-full noc-input p-2 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="operator@school.net"
                  required
                  className="w-full noc-input p-2 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Role *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full noc-input p-2 rounded-lg"
                >
                  <option value="OPERATOR">OPERATOR (Monitor &amp; Acknowledge)</option>
                  <option value="VIEWER">VIEWER (Read-Only)</option>
                  <option value="ADMIN">ADMIN (Full Control)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Initial Password *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full noc-input p-2 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 rounded border border-gray-700 text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {isEditUserOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="noc-card rounded-2xl w-full max-w-md p-6 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold font-sans text-white">
                Edit User @{selectedUser.username}
              </h3>
              <button onClick={() => setIsEditUserOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                  className="w-full noc-input p-2 rounded-lg text-sm font-sans"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full noc-input p-2 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full noc-input p-2 rounded-lg"
                >
                  <option value="OPERATOR">OPERATOR</option>
                  <option value="VIEWER">VIEWER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editActiveCheckbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded bg-[#0B0F19] border-gray-700 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="editActiveCheckbox" className="text-gray-300 cursor-pointer">
                  Account Enabled &amp; Active
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(false)}
                  className="px-3 py-1.5 rounded border border-gray-700 text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {isResetPwdOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="noc-card rounded-2xl w-full max-w-md p-6 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold font-sans text-white">
                Reset Password for @{selectedUser.username}
              </h3>
              <button onClick={() => setIsResetPwdOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3 text-xs font-mono">
              <p className="text-gray-400">
                As SuperAdmin, you can overwrite and set a new password for this user immediately:
              </p>
              <div>
                <label className="block text-gray-300 mb-1">New Password (min 6 characters)</label>
                <input
                  type="password"
                  value={adminResetPwd}
                  onChange={(e) => setAdminResetPwd(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full noc-input p-2 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsResetPwdOpen(false)}
                  className="px-3 py-1.5 rounded border border-gray-700 text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-amber-500 text-black font-bold hover:bg-amber-400 transition"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
