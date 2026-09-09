import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sprout, Shield, ChevronDown } from 'lucide-react';
import type { Role } from './RoleContext';

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

  const meta = ROLE_META[role];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (onLogin) await onLogin(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed. Please check credentials.");
    } finally {
      setLoading(false);
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
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  placeholder={role === 'officer' ? 'officer@gov.in' : 'name@agrisense.farm'}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Password
              </label>
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
    </div>
  );
}