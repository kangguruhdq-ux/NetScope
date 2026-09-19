import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { NetScopeLogo } from '../components/common/NetScopeLogo';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  User,
  AtSign,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode }) => {
  const location = useLocation();
  const isRegisterInitial = initialMode === 'register' || location.pathname.includes('register');
  const [isRegister, setIsRegister] = useState<boolean>(isRegisterInitial);

  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register State
  const [fullName, setFullName] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Shared state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Password strength calculator (0 to 4)
  const passwordStrength = useMemo(() => {
    if (!registerPassword) return 0;
    let score = 0;
    if (registerPassword.length >= 8) score++;
    if (/[A-Z]/.test(registerPassword)) score++;
    if (/[0-9]/.test(registerPassword)) score++;
    if (/[^A-Za-z0-9]/.test(registerPassword)) score++;
    return score;
  }, [registerPassword]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !loginPassword) {
      setError('Please provide your username or email and password.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await login(loginIdentifier, loginPassword);
      toast.success('Selamat datang kembali di NetScope NOC!', 'Login Berhasil');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Username/email atau password tidak valid.';
      toast.error(msg, 'Gagal Masuk');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !registerUsername || !registerEmail || !registerPassword || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (registerPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (registerPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await register(fullName, registerUsername, registerEmail, registerPassword);
      toast.success(`Akun '${registerUsername}' berhasil didaftarkan! Selamat datang di NetScope.`, 'Pendaftaran Berhasil');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Pendaftaran gagal. Silakan coba lagi.';
      toast.error(msg, 'Gagal Mendaftar');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const setMode = (toRegister: boolean) => {
    setError('');
    setIsRegister(toRegister);
    window.history.replaceState(null, '', toRegister ? '/register' : '/login');
  };

  return (
    <div className="min-h-screen cyber-circuit-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic ambient glowing network nodes */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none animate-pulse-slow" />

      {/* Brand Header */}
      <div className="mb-6 text-center z-10 transition-all duration-300">
        <NetScopeLogo size="lg" showTagline={true} />
      </div>

      {/* Mode Switcher Pill Tabs */}
      <div className="mb-4 z-10 flex bg-[#0E1424] p-1 rounded-xl border border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <button
          type="button"
          onClick={() => setMode(false)}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-mono font-semibold transition-all duration-200 ${
            !isRegister
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </button>
        <button
          type="button"
          onClick={() => setMode(true)}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-mono font-semibold transition-all duration-200 ${
            isRegister
              ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Create Account</span>
        </button>
      </div>

      {/* Main 3D Card Container */}
      <div className="w-full max-w-md perspective-1000 z-10">
        {/* LOGIN CARD */}
        {!isRegister ? (
          <div
            key="login-card"
            className="w-full bg-[#111827]/95 border border-gray-800 hover:border-cyan-500/40 p-8 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition duration-300 card-swap-left"
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold font-sans text-white">Welcome Back</h1>
              <p className="text-xs font-mono text-gray-400 mt-1">
                Sign in to access your NetScope operations console
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Username or email"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl noc-input text-sm font-mono placeholder:text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl noc-input text-sm font-mono placeholder:text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 transition"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Secure SSL &amp; JWT</span>
                </span>
                <span className="text-gray-400 hover:text-cyan-400 cursor-pointer transition">
                  Forgot Password?
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 active:scale-[0.98] text-gray-950 font-bold font-mono text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition duration-200 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
              </button>
            </form>

            {/* Bottom Card Swap link */}
            <div className="mt-6 pt-4 border-t border-gray-800 text-center text-xs font-mono text-gray-400">
              <span>Don't have an account? </span>
              <button
                onClick={() => setMode(true)}
                className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 transition ml-1"
              >
                <span>Register</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* REGISTER CARD */
          <div
            key="register-card"
            className="w-full bg-[#111827]/95 border border-gray-800 hover:border-cyan-500/40 p-8 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition duration-300 card-swap-right"
          >
            <div className="text-center mb-5">
              <h1 className="text-2xl font-bold font-sans text-white">Create Account</h1>
              <p className="text-xs font-mono text-gray-400 mt-1">
                Register as a Network Operations Operator
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name"
                    required
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl noc-input text-sm font-sans placeholder:text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <AtSign className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    placeholder="Username"
                    required
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl noc-input text-sm font-mono placeholder:text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl noc-input text-sm font-mono placeholder:text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2 rounded-xl noc-input text-sm font-mono placeholder:text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300 transition"
                  >
                    {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength segments */}
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      passwordStrength >= 1 ? 'bg-rose-500' : 'bg-gray-800'
                    }`}
                  />
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      passwordStrength >= 2 ? 'bg-amber-500' : 'bg-gray-800'
                    }`}
                  />
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      passwordStrength >= 3 ? 'bg-cyan-400' : 'bg-gray-800'
                    }`}
                  />
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      passwordStrength >= 4 ? 'bg-emerald-400' : 'bg-gray-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl noc-input text-sm font-mono placeholder:text-gray-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 active:scale-[0.98] text-gray-950 font-bold font-mono text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition duration-200 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
              </button>
            </form>

            <div className="mt-5 pt-3 border-t border-gray-800 text-center text-xs font-mono text-gray-400">
              <span>Already have an account? </span>
              <button
                onClick={() => setMode(false)}
                className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 transition ml-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
