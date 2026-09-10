import React from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Info, Brain } from 'lucide-react';

export interface ExplainabilityFactor {
  factor: string;
  impact: number; // e.g. +18 or -6 (in percentage points)
  direction: 'increase' | 'decrease';
  description?: string;
}

interface ExplainableAIPanelProps {
  isLive: boolean;
  yieldFactors?: ExplainabilityFactor[];
  diseaseFactors?: ExplainabilityFactor[];
  title?: string;
}

export const ExplainableAIPanel: React.FC<ExplainableAIPanelProps> = ({
  isLive,
  yieldFactors = [],
  diseaseFactors = [],
  title = 'SHAP Explainability & Risk Drivers'
}) => {
  if (!isLive) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs font-display">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Explainability (SHAP Feature Contribution)</span>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-slate-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-medium text-amber-200">
            Explainability available once ML integration is live.
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Demonstration / baseline regional records do not synthesize artificial SHAP feature attribution weights. Real model contributions are computed dynamically upon LIVE sensor telemetry ingestion.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/20 space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Brain className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white font-display flex items-center gap-1.5">
              <span>{title}</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono">
                LIVE SHAP
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">Why this score: top marginal feature attributions</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Yield Drivers */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-300 text-[11px] uppercase tracking-wider">
              Yield Forecast Drivers
            </span>
            <span className="text-[10px] text-slate-400 font-mono">LightGBM Regressor (R²=0.92)</span>
          </div>

          {yieldFactors.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">No feature attribution data recorded.</p>
          ) : (
            <div className="space-y-2">
              {yieldFactors.map((item, idx) => {
                const isPositive = item.direction === 'increase' || item.impact > 0;
                const absVal = Math.abs(item.impact);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-medium truncate max-w-[180px]">{item.factor}</span>
                      <span
                        className={`font-mono font-bold flex items-center gap-0.5 ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isPositive ? `+${absVal}%` : `-${absVal}%`}
                      </span>
                    </div>
                    {/* Relative Bar-style Magnitude */}
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isPositive ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-rose-600 to-rose-400'
                        }`}
                        style={{ width: `${Math.min(100, absVal * 4)}%` }}
                      />
                    </div>
                    {item.description && (
                      <p className="text-[10px] text-slate-400 leading-tight">{item.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Disease Risk Drivers */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-rose-300 text-[11px] uppercase tracking-wider">
              Pathogen Risk Drivers
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Random Forest Tree</span>
          </div>

          {diseaseFactors.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">No feature attribution data recorded.</p>
          ) : (
            <div className="space-y-2">
              {diseaseFactors.map((item, idx) => {
                const isHigherRisk = item.direction === 'increase' || item.impact > 0;
                const absVal = Math.abs(item.impact);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-medium truncate max-w-[180px]">{item.factor}</span>
                      <span
                        className={`font-mono font-bold flex items-center gap-0.5 ${
                          isHigherRisk ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {isHigherRisk ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isHigherRisk ? `+${absVal}% risk` : `-${absVal}% risk`}
                      </span>
                    </div>
                    {/* Relative Bar-style Magnitude */}
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isHigherRisk ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, absVal * 4)}%` }}
                      />
                    </div>
                    {item.description && (
                      <p className="text-[10px] text-slate-400 leading-tight">{item.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
