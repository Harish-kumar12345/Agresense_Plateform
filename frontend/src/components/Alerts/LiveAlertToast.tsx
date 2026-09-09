import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertTriangle, Info, X, ExternalLink, ArrowRight } from 'lucide-react';
import { SmartAlert } from '../../services/alertService';

interface LiveAlertToastProps {
  onOpenAlerts: () => void;
  onNavigateModule?: (moduleKey: string) => void;
}

export const LiveAlertToast: React.FC<LiveAlertToastProps> = ({
  onOpenAlerts,
  onNavigateModule
}) => {
  const [activeToast, setActiveToast] = useState<SmartAlert | null>(null);

  useEffect(() => {
    const handleToast = (e: any) => {
      if (e.detail && e.detail.alert) {
        setActiveToast(e.detail.alert);
      }
    };
    window.addEventListener('agrisense:live-toast-alert', handleToast);
    return () => window.removeEventListener('agrisense:live-toast-alert', handleToast);
  }, []);

  // Auto-dismiss after 7 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  if (!activeToast) return null;

  const isCritical = activeToast.severity === 'Critical';
  const isHigh = activeToast.severity === 'High';

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-[9999] max-w-sm sm:max-w-md w-full pointer-events-auto">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-2xl relative overflow-hidden ${
            isCritical
              ? 'bg-[#0D1612]/98 border-rose-500/60 shadow-rose-950/50 ring-1 ring-rose-500/40'
              : isHigh
              ? 'bg-[#0D1612]/98 border-amber-500/60 shadow-amber-950/50 ring-1 ring-amber-500/40'
              : 'bg-[#0D1612]/98 border-emerald-500/50 shadow-emerald-950/40'
          }`}
        >
          {/* Animated Countdown Progress Bar */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 7, ease: 'linear' }}
            className={`absolute top-0 left-0 right-0 h-0.5 ${
              isCritical ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-emerald-400'
            }`}
          />

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                isCritical
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : isHigh
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              }`}>
                {isCritical ? (
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isCritical
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : isHigh
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {activeToast.severity} Telemetry Alert
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {activeToast.crop}
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-white font-display leading-snug">
                  {activeToast.title}
                </h4>

                <p className="text-[11px] text-[#D1DED6] leading-relaxed line-clamp-2">
                  {activeToast.reason}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveToast(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
              title="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/10 text-xs">
            <span className="text-[10px] text-slate-400">
              Live Field Monitoring Sensor
            </span>

            <div className="flex items-center gap-2">
              {activeToast.target_module && onNavigateModule && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateModule(activeToast.target_module!);
                    setActiveToast(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#070D0A] hover:bg-[#13231B] text-slate-200 border border-emerald-900/40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Open {activeToast.target_module.toUpperCase()}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onOpenAlerts();
                  setActiveToast(null);
                }}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
              >
                <span>View Radar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

        </motion.div>
      </AnimatePresence>
    </div>
  );
};
