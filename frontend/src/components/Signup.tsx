import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, UserPlus, Shield, ChevronDown, Phone, MapPin, Hash, Building2 } from 'lucide-react';
import type { Role } from './RoleContext';

interface SignupProps {
  role: Role;
  onChangeRole: () => void;
  onSignup?: (
    email: string,
    password: string,
    name: string,
    role: Role,
    extraFields?: Record<string, string>
  ) => Promise<void>;
  onSwitchToLogin: () => void;
  /** kept for AuthWrapper compat — unused since Guest skips Signup */
  onGuestLogin?: () => void;
}

export function Signup({ role, onChangeRole, onSignup, onSwitchToLogin }: SignupProps) {
  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Farmer-specific
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');

  // Officer-specific
  const [officerId, setOfficerId] = useState('');
  const [department, setDepartment] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [officerPending, setOfficerPending] = useState(false);

  const isFarmer = role === 'farmer';
  const isOfficer = role === 'officer';

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setOfficerPending(false);

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
      const extraFields: Record<string, string> = {};
      if (isFarmer) {
        extraFields.phone = phone;
        extraFields.district = district;
      }
      if (isOfficer) {
        extraFields.officerId = officerId;
        extraFields.department = department;
      }

      if (onSignup) {
        await onSignup(email, password, name, role, extraFields);
      }

      if (isOfficer) {
        // Officer signup does NOT auto-login; show pending message
        setOfficerPending(true);
      } else {
        setSuccess('Account created successfully! Redirecting...');
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 agri-canvas relative overflow-hidden select-none">
      {/* Aurora ambient */}
      <div className="aurora-glow -top-24 -right-24 bg-emerald-600/30" />
      <div className="aurora-glow -bottom-24 -left-24 bg-teal-600/20" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-action-card p-8 sm:p-9 shadow-2xl">

          {/* Officer pending screen */}
          {officerPending ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 bg-gradient-to-tr from-sky-600 to-sky-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-sky-600/30 border border-sky-300/40">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight font-display mb-3">
                Application Submitted
              </h2>
              <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl px-4 py-4 mb-6">
                <p className="text-sm text-sky-200 leading-relaxed">
                  Your officer account is <span className="font-semibold text-sky-300">pending admin approval</span>.
                  You will receive an email once your account is verified.
                </p>
              </div>
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-sm text-emerald-400 hover:text-emerald-300 font-semibold transition-colors cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </motion.div>
          ) : (
            <>
              {/* Role Pill */}
              <div className="flex justify-center mb-5">
                <button
                  type="button"
                  onClick={onChangeRole}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 hover:border-emerald-400/50 transition-all cursor-pointer group"
                >
                  <span className={isOfficer ? 'text-sky-400' : 'text-emerald-400'}>
                    {isOfficer ? <Shield className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                  </span>
                  <span>{isOfficer ? '🛡️ Officer' : '🌱 Farmer'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-200 transition-colors" />
                </button>
              </div>

              {/* Header */}
              <div className="text-center mb-6">
                <div className={`w-13 h-13 rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-lg border ${
                  isOfficer
                    ? 'bg-gradient-to-tr from-sky-600 to-sky-400 shadow-sky-600/30 border-sky-300/40'
                    : 'bg-gradient-to-tr from-emerald-600 to-emerald-400 shadow-emerald-600/30 border-emerald-300/40'
                }`}>
                  {isOfficer ? (
                    <Shield className="w-6 h-6 text-white" />
                  ) : (
                    <UserPlus className="w-6 h-6 text-slate-950" />
                  )}
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight font-display mb-1">
                  {isOfficer ? 'Create Officer Account' : 'Create Your Account'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  {isOfficer
                    ? 'Officer registration requires admin verification'
                    : 'Join the AgriSense Agronomic Intelligence Platform'}
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
                {/* Full Name */}
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
                      placeholder={isOfficer ? 'Officer Full Name' : 'Farmer Name'}
                      required
                    />
                  </div>
                </div>

                {/* Farmer: Phone Number */}
                {isFarmer && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative flex items-center">
                      <Phone className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        placeholder="+91 98765 43210"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Farmer: District/Village */}
                {isFarmer && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      District / Village
                    </label>
                    <div className="relative flex items-center">
                      <MapPin className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        placeholder="e.g. Ghaziabad, UP"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Officer: Officer ID */}
                {isOfficer && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Officer ID
                    </label>
                    <div className="relative flex items-center">
                      <Hash className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={officerId}
                        onChange={(e) => setOfficerId(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        placeholder="e.g. AGR-OFC-1234"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Officer: Department */}
                {isOfficer && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Department
                    </label>
                    <div className="relative flex items-center">
                      <Building2 className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        placeholder="e.g. Ministry of Agriculture"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    {isOfficer ? 'Official Email Address' : 'Email Address'}
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                      placeholder={isOfficer ? 'officer@gov.in' : 'name@agrisense.farm'}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
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

                {/* Confirm Password */}
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

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full h-11 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-3 ${
                    isOfficer
                      ? 'bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white shadow-sky-600/30'
                      : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 shadow-emerald-600/30'
                  }`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isOfficer ? 'Submit Officer Application' : 'Create Account'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Officer note */}
                {isOfficer && (
                  <p className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1 mt-1">
                    <Shield className="w-3 h-3 text-sky-500/60 shrink-0" />
                    Your application will be reviewed before account activation.
                  </p>
                )}
              </form>

              {/* Footer links */}
              <div className="mt-5 pt-4 border-t border-white/10 text-center text-xs text-slate-400 space-y-2">
                <div>
                  <span>Already registered? </span>
                  <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors cursor-pointer"
                  >
                    Sign in
                  </button>
                </div>
                <div>
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
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
