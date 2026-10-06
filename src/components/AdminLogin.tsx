import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  User,
  ArrowLeft,
  AlertCircle,
  Clock,
  CheckCircle2,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

export const ADMIN_USERNAME = 'admin';
export const ADMIN_PASSWORD = 'admin@123';

const LOCKOUT_KEY = 'roadwatch_admin_lockout_until';
const FAILED_COUNT_KEY = 'roadwatch_admin_failed_count';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToLanding: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToLanding
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState<number>(0);

  // Check remaining lockout time
  useEffect(() => {
    const checkLockout = () => {
      const lockoutUntil = localStorage.getItem(LOCKOUT_KEY);
      if (lockoutUntil) {
        const remaining = Math.ceil((parseInt(lockoutUntil, 10) - Date.now()) / 1000);
        if (remaining > 0) {
          setLockoutSecondsLeft(remaining);
        } else {
          setLockoutSecondsLeft(0);
          localStorage.removeItem(LOCKOUT_KEY);
          localStorage.removeItem(FAILED_COUNT_KEY);
        }
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutSecondsLeft > 0) return;

    if (username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Clear failed counts and lockout
      localStorage.removeItem(FAILED_COUNT_KEY);
      localStorage.removeItem(LOCKOUT_KEY);
      setErrorMessage('');
      onLoginSuccess();
    } else {
      // Handle failed attempt
      const prevCount = parseInt(localStorage.getItem(FAILED_COUNT_KEY) || '0', 10);
      const newCount = prevCount + 1;
      localStorage.setItem(FAILED_COUNT_KEY, newCount.toString());

      if (newCount >= 3) {
        // Lock for 30 seconds
        const lockoutUntil = Date.now() + 30 * 1000;
        localStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString());
        setLockoutSecondsLeft(30);
        setErrorMessage('Too many failed attempts. Form locked for 30 seconds.');
      } else {
        setErrorMessage(`Invalid credentials. (${3 - newCount} attempt${3 - newCount === 1 ? '' : 's'} remaining)`);
      }
    }
  };

  const handleFillDemoCredentials = () => {
    setUsername(ADMIN_USERNAME);
    setPassword(ADMIN_PASSWORD);
    setErrorMessage('');
  };

  const isLocked = lockoutSecondsLeft > 0;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 p-6 text-white text-center flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-900 border border-blue-700/60 flex items-center justify-center text-amber-400 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-blue-900/60 px-2.5 py-0.5 rounded-full border border-blue-800">
              Admin Access Only
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight mt-1">
              Municipal Portal Login
            </h2>
            <p className="text-xs text-blue-300 mt-1">
              Public Works Department & Ward Operations Dashboard
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 md:p-8 flex flex-col gap-5">
          {/* Lockout Warning */}
          {isLocked && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center gap-3">
              <Clock className="w-5 h-5 text-red-600 animate-spin shrink-0" />
              <div>
                <p className="font-bold">Account temporarily locked</p>
                <p className="text-[11px] text-red-700">
                  Please wait <b>{lockoutSecondsLeft}s</b> before retrying login.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && !isLocked && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Username Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Admin Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLocked}
                  placeholder="Enter admin username"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-1 focus:ring-blue-900 outline-none text-xs font-medium text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLocked}
                  placeholder="Enter password"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-1 focus:ring-blue-900 outline-none text-xs font-medium text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLocked}
              className="mt-2 w-full py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-900/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{isLocked ? `Locked (${lockoutSecondsLeft}s)` : 'Login to Admin Dashboard'}</span>
            </button>
          </form>

          {/* Demo Credentials Helper Pill */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Demo Credentials:</span>
              <button
                type="button"
                onClick={handleFillDemoCredentials}
                disabled={isLocked}
                className="text-[11px] font-bold text-blue-900 hover:underline cursor-pointer disabled:opacity-50"
              >
                Auto-fill
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[9px] uppercase">User</span>
                <span className="font-bold text-slate-800">{ADMIN_USERNAME}</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[9px] uppercase">Pass</span>
                <span className="font-bold text-slate-800">{ADMIN_PASSWORD}</span>
              </div>
            </div>
          </div>

          {/* Back to Citizen Button */}
          <button
            type="button"
            onClick={onBackToLanding}
            className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Portal Home</span>
          </button>
        </div>

      </div>
    </div>
  );
};
