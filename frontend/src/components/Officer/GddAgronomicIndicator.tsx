import React from 'react';
import { SunMedium, Calculator, Info } from 'lucide-react';

interface GddAgronomicIndicatorProps {
  currentGdd: number;
  crop: string;
  baseTempC?: number;
  targetHarvestGdd?: number;
  progressPct?: number;
}

export const GddAgronomicIndicator: React.FC<GddAgronomicIndicatorProps> = ({
  currentGdd,
  crop,
  baseTempC = 10,
  targetHarvestGdd = 1850,
  progressPct
}) => {
  const percent = progressPct !== undefined
    ? progressPct
    : targetHarvestGdd
    ? Math.min(100, Math.round((currentGdd / targetHarvestGdd) * 100))
    : null;

  return (
    <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3 font-sans">
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-sm">
            <SunMedium className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-amber-200 font-display">
                Growing Degree Days (GDD)
              </h4>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-semibold uppercase tracking-wider">
                Agronomic Calculation
              </span>
            </div>
            <p className="text-[10px] text-amber-300/70">
              Deterministic thermal heat unit accumulation — not an ML prediction
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-500/20">
          Base: {baseTempC}°C
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div>
          <div className="text-xl font-black text-white font-mono flex items-baseline gap-1.5">
            <span>{currentGdd}</span>
            <span className="text-xs font-normal text-amber-300">accumulated GDD</span>
          </div>
          {targetHarvestGdd && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              Target for <span className="text-slate-200 font-semibold">{crop}</span> maturity: ~{targetHarvestGdd} GDD
            </p>
          )}
        </div>

        {percent !== null && (
          <div className="text-right">
            <span className="text-sm font-bold text-amber-300 font-mono">{percent}%</span>
            <span className="text-[10px] text-slate-400 block">Thermal Maturity</span>
          </div>
        )}
      </div>

      {/* Progress Bar against typical harvest threshold */}
      {percent !== null && (
        <div className="space-y-1">
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, percent))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>0 GDD (Sowing)</span>
            <span>{targetHarvestGdd} GDD (Physiological Maturity)</span>
          </div>
        </div>
      )}

      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-start gap-2 text-[10px] text-slate-400 leading-snug">
        <Calculator className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Agronomic Formula:</strong> Calculated as daily cumulative thermal units <code className="text-amber-300 font-mono">Σ max(0, T_mean - {baseTempC}°C)</code> from sowing date. Indicates crop physiological stage independently of regressor yield models.
        </span>
      </div>
    </div>
  );
};
