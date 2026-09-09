import React from 'react';
import {
  PenTool,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Compass,
  Layers,
  ShieldCheck,
  CornerDownLeft,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

interface FarmBoundaryDrawerProps {
  isDrawing: boolean;
  pointCount: number;
  isClosed: boolean;
  onStartDrawing: () => void;
  onFinishPolygon: () => void;
  onClearPoints: () => void;
  onRedraw: () => void;
}

export const FarmBoundaryDrawer: React.FC<FarmBoundaryDrawerProps> = ({
  isDrawing,
  pointCount,
  isClosed,
  onStartDrawing,
  onFinishPolygon,
  onClearPoints,
  onRedraw
}) => {
  // Listen for Enter key to finish polygon if ready
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isDrawing && !isClosed && pointCount >= 3) {
        onFinishPolygon();
      }
      if (e.key === 'Escape' && isDrawing) {
        onClearPoints();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, isClosed, pointCount, onFinishPolygon, onClearPoints]);

  return (
    <div className={`cadastral-hud ${isDrawing ? 'cadastral-hud-active' : ''} rounded-2xl p-3.5 transition-all duration-300 relative z-20`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left: Tactical Cadastral Status & Live Vertex Counter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
              isClosed
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-sm shadow-emerald-500/30'
                : isDrawing
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 animate-pulse'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}>
              {isClosed ? (
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
              ) : isDrawing ? (
                <PenTool className="w-4 h-4 text-emerald-400" />
              ) : (
                <Compass className="w-4 h-4 text-slate-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white font-display">
                  Cadastral Mapping Tools
                </span>
                
                {/* Live Status Badge */}
                {isClosed ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    Enclosure Verified
                  </span>
                ) : isDrawing ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                    Digitizing Vertices
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-slate-400 border border-white/10">
                    Ready to Map
                  </span>
                )}
              </div>

              <p className="text-[11px] text-[#D1DED6] mt-0.5 flex items-center gap-2">
                {isClosed ? (
                  <span>Boundary locked • Geodesic area calculated below</span>
                ) : isDrawing ? (
                  <span>Click satellite map to plot field vertices ({pointCount < 3 ? `add ${3 - pointCount} more` : 'ready to seal'})</span>
                ) : (
                  <span>Click "Draw Boundary" to trace your farm perimeters</span>
                )}
              </p>
            </div>
          </div>

          {/* Vertex Metric Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#070D0A]/80 border border-emerald-900/40 text-xs">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400 font-medium">Vertices:</span>
            <span className={`font-mono font-bold ${pointCount > 0 ? 'text-emerald-300' : 'text-slate-500'}`}>
              {pointCount}
            </span>
          </div>
        </div>

        {/* Right: Tactical Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {!isClosed && !isDrawing && (
            <button
              type="button"
              onClick={onStartDrawing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/30 hover:shadow-emerald-500/40 cursor-pointer"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Draw Boundary</span>
            </button>
          )}

          {isDrawing && !isClosed && (
            <>
              <button
                type="button"
                disabled={pointCount < 3}
                onClick={onFinishPolygon}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  pointCount >= 3
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] cursor-pointer'
                    : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-white/5'
                }`}
                title={pointCount >= 3 ? 'Press Enter to complete polygon' : 'Plot at least 3 points'}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Seal Enclosure</span>
                {pointCount >= 3 && (
                  <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-950/40 text-[9px] font-mono text-emerald-950">
                    <CornerDownLeft className="w-2.5 h-2.5" />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onClearPoints}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                title="Press Esc to cancel"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cancel</span>
              </button>
            </>
          )}

          {isClosed && (
            <>
              <button
                type="button"
                onClick={onRedraw}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Redraw Boundary</span>
              </button>

              <button
                type="button"
                onClick={onClearPoints}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
