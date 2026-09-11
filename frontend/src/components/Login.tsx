import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sprout, Shield, ChevronDown, KeyRound, X, CheckCircle2 } from 'lucide-react';
import type { Role } from './RoleContext';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
  role: Role;
  onChangeRole: () => void;
  onLogin?: (email: string, password: string) => Promise<void>;
  onSwitchToSignup?: () => void;
  /** kept in signature for AuthWrapper compat — unused since Guest skips Login */
  onGuestLogin?: () => void;
}

const ROLE_META: Record<Role, {
  icon: React.ReactNode;
  emoji: string;
  label: string;
  heading: string;
  subheading: string;
  buttonText: string;
  officerNote: boolean;
  cardIcon: React.ReactNode;
}> = {
  farmer: {
    icon: <Sprout className="w-3.5 h-3.5" />,
    emoji: '🌱',
    label: 'Farmer',
    heading: 'Welcome Back to AgriSense',
    subheading: 'Precision Agronomic Intelligence & Farm Management',
    buttonText: 'Sign In to Dashboard',
    officerNote: false,
    cardIcon: <Sprout className="w-6 h-6 text-slate-950" />,
  },
  officer: {
    icon: <Shield className="w-3.5 h-3.5" />,
    emoji: '🛡️',
    label: 'Officer',
    heading: 'Officer Portal Sign In',
    subheading: 'Administrative Access & Platform Operations',
    buttonText: 'Sign In to Officer Portal',
    officerNote: true,
    cardIcon: <Shield className="w-6 h-6 text-slate-950" />,
  },
};

export default function Login({ role, onChangeRole, onLogin, onSwitchToSignup }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Forgot / Reset Password state
  const { resetPassword } = useAuth();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const meta = ROLE_META[role];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (onLogin) await onLogin(cleanEmail, password);
    } catch (err: any) {
      setError(err.message || "Login failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResetModal = () => {
    setResetEmail(email.trim().toLowerCase());
    setNewPassword("");
    setConfirmResetPassword("");
    setResetError("");
    setResetSuccess("");
    setShowResetModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");
    setResetSuccess("");

    if (!resetEmail) {
      setResetError("Please enter your registered email address.");
      setResetLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters.");
      setResetLoading(false);
      return;
    }

    if (newPassword !== confirmResetPassword) {
      setResetError("Passwords do not match.");
      setResetLoading(false);
      return;
    }

    try {
      const res = await resetPassword(resetEmail.trim().toLowerCase(), newPassword);
      setResetSuccess(res.message || "Password reset successfully! You can now log in.");
      setEmail(resetEmail.trim().toLowerCase());
      setPassword(newPassword);
      setTimeout(() => {
        setShowResetModal(false);
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#070D0A] relative overflow-hidden select-none">
      {/* Aurora ambient background */}
      <div className="aurora-glow -top-24 -left-24 bg-emerald-600/20" />
      <div className="aurora-glow -bottom-24 -right-24 bg-sky-600/15" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="apple-glass-card p-8 sm:p-9 shadow-2xl">

          {/* Role Pill — clicking goes back to role selection */}
          <div className="flex justify-center mb-5">
            <button
              type="button"
              onClick={onChangeRole}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 hover:border-emerald-400/50 transition-all cursor-pointer group"
            >
              <span className={role === 'officer' ? 'text-sky-400' : 'text-emerald-400'}>
                {meta.icon}
              </span>
              <span>{meta.emoji} {meta.label}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-200 transition-colors" />
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-7">
            <div className={`w-13 h-13 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border ${
              role === 'officer'
                ? 'bg-gradient-to-tr from-sky-600 to-sky-400 shadow-sky-600/30 border-sky-300/40'
                : 'bg-gradient-to-tr from-emerald-600 to-emerald-400 shadow-emerald-600/30 border-emerald-300/40'
            }`}>
              {meta.cardIcon}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-display mb-1.5">
              <span className="apple-title-gradient">{meta.heading}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {meta.subheading}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-500/15 border border-rose-500/30 text-rose-300 px-3.5 py-2.5 rounded-xl mb-5 text-xs flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                {role === 'officer' ? 'Official Email Address' : 'Email Address'}
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  placeholder={role === 'officer' ? 'officer@gov.in' : 'name@agrisense.farm'}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleOpenResetModal}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full h-12 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 ${
                role === 'officer'
                  ? 'bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white shadow-sky-600/30'
                  : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 shadow-emerald-600/30'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{meta.buttonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Officer verification note */}
            {meta.officerNote && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-[11px] text-slate-500 mt-1 flex items-center justify-center gap-1"
              >
                <Shield className="w-3 h-3 text-sky-500/70 shrink-0" />
                Officer accounts require admin verification.
              </motion.p>
            )}
          </form>

          {/* Switch to Signup */}
          <div className="text-center mt-6 text-xs text-slate-400">
            <span>Don't have an account yet? </span>
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors cursor-pointer"
            >
              Sign up now
            </button>
          </div>

          {/* Change role hint */}
          <div className="text-center mt-3 text-xs text-slate-500">
            <span>Wrong role? </span>
            <button
              type="button"
              onClick={onChangeRole}
              className="text-slate-400 hover:text-slate-200 font-medium transition-colors cursor-pointer underline underline-offset-2"
            >
              Change role
            </button>
          </div>
        </div>
      </motion.div>

      {/* Forgot / Reset Password Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-[#0e1612] border border-emerald-500/30 rounded-2xl p-6 sm:p-7 shadow-2xl relative text-white"
            >
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Reset Password</h2>
                  <p className="text-xs text-slate-400">Set a new password for your account</p>
                </div>
              </div>

              {resetError && (
                <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 px-3.5 py-2 rounded-xl mb-4 text-xs">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3.5 py-2 rounded-xl mb-4 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registered Email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
                    placeholder="At least 6 characters"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmResetPassword}
                    onChange={(e) => setConfirmResetPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
                    placeholder="Re-enter new password"
                    required
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {resetLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}