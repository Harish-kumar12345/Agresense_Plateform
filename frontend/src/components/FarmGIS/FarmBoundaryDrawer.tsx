import React from 'react';
import { PenTool, CheckCircle2, RotateCcw, Trash2, Edit3 } from 'lucide-react';

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
  return (
    <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-3.5 border border-white/10 shadow-2xl flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Boundary Tools</span>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-white/10 font-semibold">
          {pointCount} Points Added
        </span>
      </div>

      <div className="flex items-center gap-2">
        {!isClosed && !isDrawing && (
          <button
            type="button"
            onClick={onStartDrawing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
          >
            <PenTool className="w-3.5 h-3.5" />
            Draw Boundary
          </button>
        )}

        {isDrawing && !isClosed && (
          <>
            <button
              type="button"
              disabled={pointCount < 3}
              onClick={onFinishPolygon}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                pointCount >= 3
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Finish Polygon ({pointCount >= 3 ? 'Ready' : 'Min 3 points'})
            </button>
          </>
        )}

        {isClosed && (
          <button
            type="button"
            onClick={onRedraw}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Redraw Boundary
          </button>
        )}

        {pointCount > 0 && (
          <button
            type="button"
            onClick={onClearPoints}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
};
