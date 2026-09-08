import React, { useState, useEffect } from 'react';
import {
  Layers,
  MapPin,
  Plus,
  ArrowRight,
  Sprout,
  Sparkles,
  Eye,
  Leaf,
  Map,
  Loader2,
  Wheat
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { farmService, FarmData } from '../../services/farmService';

interface FarmFieldChooserProps {
  onViewSavedFields: () => void;
  onOpenGISMap: () => void;
  onSelectFarm: (farm: FarmData) => void;
}

export const FarmFieldChooser: React.FC<FarmFieldChooserProps> = ({
  onViewSavedFields,
  onOpenGISMap,
  onSelectFarm
}) => {
  const { user } = useAuth();
  const farmerId = user?.id || 'default_farmer';
  const farmerName = user?.name || 'Farmer';

  const [savedFarms, setSavedFarms] = useState<FarmData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    const loadFarms = async () => {
      try {
        const farms = await farmService.getFarms(farmerId);
        setSavedFarms(farms);
      } catch (e) {
        console.error('Failed to load farms:', e);
      } finally {
        setLoading(false);
        // Trigger fade-in animation after data loads
        requestAnimationFrame(() => setFadeIn(true));
      }
    };
    loadFarms();
  }, [farmerId]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-400">Loading your farm fields...</p>
        </div>
      </div>
    );
  }

  const hasSavedFarms = savedFarms.length > 0;

  // ─── No Saved Farms: Welcome / First-Time Setup ───
  if (!hasSavedFarms) {
    return (
      <div
        className="max-w-3xl mx-auto px-4 py-12"
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Welcome Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold mb-4 border border-emerald-500/25">
            <Sparkles className="w-3.5 h-3.5" /> Welcome to AgriSense
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
            Hello, <span className="text-emerald-400">{farmerName}</span> 👋
          </h1>
          <p className="mt-3 text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
            Get started by mapping your first farm field using our satellite GIS tools.
            Draw boundaries, calculate area, and unlock precision agriculture insights.
          </p>
        </div>

        {/* Single CTA Card */}
        <div
          className="group relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-8 sm:p-10 text-white shadow-2xl overflow-hidden cursor-pointer hover:shadow-emerald-900/40 transition-all duration-500 hover:-translate-y-1 border border-emerald-500/30"
          onClick={onOpenGISMap}
        >
          {/* Decorative elements */}
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute right-8 bottom-6 opacity-[0.06] pointer-events-none">
            <Map className="w-32 h-32" />
          </div>

          <div className="relative z-10 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-300">
              <MapPin className="w-7 h-7 text-white" />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight font-display">Set Up Your First Farm Field</h2>
              <p className="mt-2 text-emerald-100/80 text-sm max-w-md leading-relaxed">
                Open the satellite GIS map, locate your farm, draw precision boundaries,
                and save your field to start receiving AI-powered insights.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-950 font-bold text-sm rounded-xl shadow-lg group-hover:shadow-xl transition-all group-hover:gap-3">
                Open GIS Map
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </div>

        {/* Steps preview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 text-center text-xs font-medium text-slate-400">
          {[
            { label: 'Locate on Map', icon: '📍' },
            { label: 'Draw Boundary', icon: '✏️' },
            { label: 'Calculate Area', icon: '📐' },
            { label: 'Save & Analyze', icon: '🚀' }
          ].map((step, i) => (
            <div key={i} className="p-3.5 bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-md">
              <span className="text-lg block mb-1">{step.icon}</span>
              <span className="font-semibold text-slate-200">{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Has Saved Farms: Decision Chooser ───
  return (
    <div
      className="max-w-5xl mx-auto px-4 py-10"
      style={{
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? 'translateY(0)' : 'translateY(24px)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Welcome Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold mb-4 border border-emerald-500/25">
          <Leaf className="w-3.5 h-3.5" /> Welcome Back
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
          Welcome back, <span className="text-emerald-400">{farmerName}</span>!
        </h1>
        <p className="mt-3 text-base text-slate-400 max-w-lg mx-auto">
          You have <strong className="text-emerald-400">{savedFarms.length} saved farm field{savedFarms.length > 1 ? 's' : ''}</strong>.
          What would you like to do?
        </p>
      </div>

      {/* Two-Card Decision Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Card A: View Saved Fields ── */}
        <div
          className="group relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800 rounded-3xl p-7 text-white shadow-xl overflow-hidden cursor-pointer hover:shadow-emerald-950/50 transition-all duration-500 hover:-translate-y-1 border border-emerald-500/30"
          onClick={onViewSavedFields}
        >
          {/* Decorative */}
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute right-6 bottom-4 opacity-[0.06] pointer-events-none">
            <Layers className="w-28 h-28" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-300">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-bold backdrop-blur-sm border border-white/10">
                {savedFarms.length} Field{savedFarms.length > 1 ? 's' : ''}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight">My Saved Fields</h2>
              <p className="mt-1.5 text-emerald-100/70 text-sm">
                View, manage, and run analysis on your saved farm fields.
              </p>
            </div>

            {/* Mini Preview of top farms */}
            <div className="space-y-2 pt-1">
              {savedFarms.slice(0, 3).map((farm, i) => (
                <div
                  key={farm.farm_id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/5"
                  style={{
                    opacity: fadeIn ? 1 : 0,
                    transform: fadeIn ? 'translateX(0)' : 'translateX(-12px)',
                    transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${0.2 + i * 0.1}s`
                  }}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                    <Wheat className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold block truncate">{farm.farm_name}</span>
                    <span className="text-[10px] text-emerald-200/60">{farm.crop} • {farm.area_hectares} ha</span>
                  </div>
                </div>
              ))}
              {savedFarms.length > 3 && (
                <span className="text-xs text-emerald-200/50 pl-1">+ {savedFarms.length - 3} more field{savedFarms.length - 3 > 1 ? 's' : ''}...</span>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-700 font-bold text-sm rounded-xl shadow-lg group-hover:shadow-xl transition-all group-hover:gap-3">
                <Eye className="w-4 h-4" />
                View Saved Fields
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </div>

        {/* ── Card B: Add New Field via GIS ── */}
        <div
          className="group relative bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 rounded-3xl p-7 text-white shadow-xl overflow-hidden cursor-pointer hover:shadow-emerald-500/20 transition-all duration-500 hover:-translate-y-1 border border-emerald-500/30"
          onClick={onOpenGISMap}
        >
          {/* Decorative */}
          <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute right-6 bottom-4 opacity-[0.06] pointer-events-none">
            <Map className="w-28 h-28" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-300">
              <Plus className="w-6 h-6 text-white" />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight">Add New Farm Field</h2>
              <p className="mt-1.5 text-emerald-100/70 text-sm">
                Open the satellite GIS map to locate and draw a new farm boundary.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-2 pt-1">
              {[
                { icon: '🛰️', label: 'Live Satellite & Street Map Layers' },
                { icon: '📍', label: 'GPS Auto-Detection or Manual Search' },
                { icon: '✏️', label: 'Precision Polygon Boundary Drawing' },
                { icon: '📐', label: 'Automatic Geodesic Area Calculation' }
              ].map((feat, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/5"
                  style={{
                    opacity: fadeIn ? 1 : 0,
                    transform: fadeIn ? 'translateX(0)' : 'translateX(12px)',
                    transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${0.2 + i * 0.1}s`
                  }}
                >
                  <span className="text-sm">{feat.icon}</span>
                  <span className="text-xs font-medium text-emerald-100/80">{feat.label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-800 font-bold text-sm rounded-xl shadow-lg group-hover:shadow-xl transition-all group-hover:gap-3">
                <MapPin className="w-4 h-4" />
                Open GIS Map
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick-Select: Jump directly to a saved farm */}
      {savedFarms.length > 0 && (
        <div
          className="mt-8 saas-card p-6"
          style={{
            opacity: fadeIn ? 1 : 0,
            transform: fadeIn ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.4s'
          }}
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                <Sprout className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white font-display">Quick Access — Jump to a Field</h3>
            </div>
            <span className="text-xs text-slate-400">Select to go directly to the dashboard</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedFarms.slice(0, 6).map((farm) => (
              <button
                key={farm.farm_id}
                type="button"
                onClick={() => onSelectFarm(farm)}
                className="group/card flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-slate-900/80 hover:bg-slate-800 hover:border-emerald-500/40 transition-all text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover/card:bg-emerald-500/30 transition-colors">
                  <Wheat className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-white block truncate font-display">{farm.farm_name}</span>
                  <span className="text-xs text-slate-400">{farm.crop} • {farm.area_hectares} ha • {farm.location_name?.split(',')[0]}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover/card:text-emerald-400 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
