import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, UserPlus, Sprout, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SignupProps {
  onSignup?: (email: string, password: string, name: string) => Promise<void>;
  onSwitchToLogin: () => void;
  onGuestLogin?: () => void;
}

export function Signup({ onSignup, onSwitchToLogin, onGuestLogin }: SignupProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signup: authSignup, continueAsGuest } = useAuth();
  const doSignup = onSignup || authSignup;

  const handleSignup = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await doSignup(email, password, name);
      setSuccess('Account created successfully! Redirecting...');
    } catch (error: any) {
      setError(error.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onGuestLogin) {
      onGuestLogin();
    } else {
      continueAsGuest();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 agri-canvas relative overflow-hidden select-none">
      {/* Aurora Ambient Background */}
      <div className="aurora-glow -top-24 -right-24 bg-emerald-600/30" />
      <div className="aurora-glow -bottom-24 -left-24 bg-teal-600/20" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-action-card p-8 sm:p-9 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-13 h-13 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-emerald-600/30 border border-emerald-300/40">
              <UserPlus className="w-6 h-6 text-slate-950" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-display mb-1">
              Create Your Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Join the AgriSense Agronomic Intelligence Platform
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-500/15 border border-rose-500/30 text-rose-300 px-3.5 py-2.5 rounded-xl mb-4 text-xs flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3.5 py-2.5 rounded-xl mb-4 text-xs flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  placeholder="Farmer Name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  placeholder="name@agrisense.farm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  placeholder="At least 6 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  placeholder="Re-enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Guest Access CTA */}
          <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full h-10 bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span>Continue as Guest</span>
            </button>

            <div className="text-center text-xs text-slate-400">
              <span>Already registered? </span>
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors cursor-pointer"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
