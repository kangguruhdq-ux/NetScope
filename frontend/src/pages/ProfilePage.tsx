import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UserCheck, Key, Shield, CheckCircle2, AlertCircle, Camera, Upload } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshUserData } = useAuth();

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [avatarError, setAvatarError] = useState('');

  // Profile fields
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setEmail(user.email);
    }
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image file size must be less than 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarMsg('');
    setAvatarError('');

    try {
      await api.uploadAvatar(file);
      await refreshUserData();
      setAvatarMsg('Profile photo successfully uploaded and updated.');
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileError('');
    setIsUpdatingProfile(true);

    try {
      await api.updateProfile({ full_name: fullName, email });
      await refreshUserData();
      setProfileMsg('Profile credentials successfully updated.');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg('');
    setPwdError('');

    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError('Password must be at least 6 characters.');
      return;
    }

    setIsChangingPwd(true);
    try {
      await api.changePassword({ old_password: oldPassword, new_password: newPassword });
      setPwdMsg('Password updated successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'Failed to change password.');
    } finally {
      setIsChangingPwd(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h1 className="text-2xl font-bold font-sans text-white tracking-tight">
          User Account &amp; Security Settings
        </h1>
        <p className="text-xs font-mono text-cyan-400 mt-0.5">
          Manage Personal Profile &bull; Credential Authentication &bull; Accessible for All Roles
        </p>
      </div>

      {/* Role Authority Banner */}
      <div className={`p-4 rounded-2xl border text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        user?.role === 'ADMIN'
          ? 'bg-purple-950/20 border-purple-500/40 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
          : 'bg-cyan-950/20 border-cyan-500/40 text-cyan-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${
            user?.role === 'ADMIN'
              ? 'bg-purple-900/40 border-purple-500/40 text-purple-300'
              : 'bg-cyan-900/40 border-cyan-500/40 text-cyan-300'
          }`}>
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-white flex items-center gap-2">
              {user?.role === 'ADMIN' ? 'SUPERADMIN / NOC CHIEF' : `${user?.role} OPERATOR`}
              <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 border border-white/10 uppercase tracking-widest text-emerald-400">
                ACTIVE ACCOUNT
              </span>
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {user?.role === 'ADMIN'
                ? 'Full system privileges: User Management, Network Hardware CRUD, Storage VACUUM, and Web Sentinel.'
                : 'Operational privileges: Monitor devices, acknowledge/resolve alerts, and run diagnostics.'}
            </div>
          </div>
        </div>

        <div className="text-right text-[11px] text-gray-400 font-mono">
          <div>User ID: <span className="text-gray-200 font-bold">{user?.id}</span></div>
          <div>Handle: <span className="text-cyan-300 font-bold">@{user?.username}</span></div>
        </div>
      </div>

      {/* Profile Picture & Identity Card */}
      <div className="noc-card p-6 rounded-2xl border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-cyan-950/80 border-2 border-cyan-500/40 overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-center">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-2xl font-bold font-mono text-cyan-300">
                  {user?.username ? user.username.slice(0, 2).toUpperCase() : 'NS'}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold shadow-lg transition border border-black/40 disabled:opacity-50"
              title="Upload photo from storage"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-lg font-bold font-sans text-white">{user?.full_name}</h2>
            <div className="text-xs font-mono text-cyan-400">@{user?.username} &bull; {user?.email}</div>
            <p className="text-[11px] text-gray-400 font-mono">
              Upload an avatar image from local storage (PNG, JPG, WEBP, GIF up to 5MB).
            </p>
            {avatarMsg && (
              <p className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {avatarMsg}
              </p>
            )}
            {avatarError && (
              <p className="text-xs font-mono text-rose-400 flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {avatarError}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition shadow-[0_0_15px_rgba(6,182,212,0.15)] disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{isUploadingAvatar ? 'Uploading Image...' : 'Upload From Storage'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details Form */}
        <div className="noc-card p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-gray-800 pb-3">
            <UserCheck className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold font-sans text-white">Personal Profile</h2>
          </div>

          {profileMsg && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{profileMsg}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2 rounded-lg">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-3.5 text-xs font-mono">
            <div>
              <label className="block text-gray-400 mb-1">Username (Fixed):</label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="w-full noc-input px-3 py-2 rounded-lg bg-gray-900/50 text-gray-400 cursor-not-allowed border-gray-800"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Assigned Role:</label>
              <div className="px-3 py-2 rounded-lg bg-black/40 border border-gray-800 text-cyan-400 font-bold">
                {user?.role}
              </div>
            </div>

            <div>
              <label className="block text-gray-300 mb-1">Full Name:</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full noc-input px-3 py-2 rounded-lg text-white font-sans text-sm"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-1">Email Address:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full noc-input px-3 py-2 rounded-lg text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="mt-2 w-full py-2.5 rounded-xl bg-cyan-500 text-black font-bold hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition disabled:opacity-50"
            >
              {isUpdatingProfile ? 'Saving...' : 'Update Profile'}
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="noc-card p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-gray-800 pb-3">
            <Key className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold font-sans text-white">Change Password</h2>
          </div>

          {pwdMsg && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{pwdMsg}</span>
            </div>
          )}

          {pwdError && (
            <div className="p-3 bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2 rounded-lg">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{pwdError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs font-mono">
            <div>
              <label className="block text-gray-300 mb-1">Current Password *</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full noc-input px-3 py-2 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-1">New Password *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full noc-input px-3 py-2 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-1">Confirm New Password *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full noc-input px-3 py-2 rounded-lg text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPwd}
              className="mt-2 w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold border border-gray-700 transition disabled:opacity-50"
            >
              {isChangingPwd ? 'Updating Password...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
