import React, { useState } from 'react';
import axios from 'axios';
import { LogIn, ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';

const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001';

export const OfficerLogin = ({ onToken }: { onToken: (t: string) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setSubmitting(true);
    try {
      console.log('Attempting officer login with:', { email, backendUrl });
      const { data } = await axios.post(`${backendUrl}/api/officer/validate`, { email, password });
      console.log('Login successful, received token:', data.token);
      onToken(data.token);
    } catch (e) {
      console.error('Login error:', e);
      const errorMsg = (e as any)?.response?.data?.error || 'Login failed. Invalid officer credentials.';
      console.error('Error message:', errorMsg);
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="glass-action-card p-8 sm:p-9 shadow-2xl space-y-6">
      <div className="text-center">
        <div className="w-13 h-13 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/30 border border-emerald-300/40 text-slate-950">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h3 className="text-2xl font-bold text-white tracking-tight font-display mb-1.5">
          Agricultural Officer Portal
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Access the regional administrative dashboard to verify field telemetry and resolve farmer inquiries.
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Officer Email Address
          </label>
          <div className="relative flex items-center">
            <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input 
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" 
              placeholder="officer@agrisense.gov.in" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Secure Password
          </label>
          <div className="relative flex items-center">
            <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input 
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" 
              type="password" 
              placeholder="••••••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button 
          disabled={submitting} 
          type="submit"
          className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed text-sm"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating Officer...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Sign In to Officer Console</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};


