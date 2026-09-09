import React, { useState, useEffect } from 'react';
import {
  Layers,
  MapPin,
  Plus,
  ArrowRight,
  Sprout,
  Eye,
  Leaf,
  Map,
  Loader2,
  Wheat,
  Globe,
  PenTool,
  Ruler,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Compass
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
        requestAnimationFrame(() => setFadeIn(true));
      }
    };
    loadFarms();
  }, [farmerId]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Loading Cadastral Records...</p>
        </div>
      </div>
    );
  }

  const hasSavedFarms = savedFarms.length > 0;

  // ─── No Saved Farms: Executive First-Time Setup ───
  if (!hasSavedFarms) {
    return (
      <div
        className="max-w-4xl mx-auto px-4 py-12"
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Welcome Header */}
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Precision Agronomic Cadastre</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
            Welcome to AgriSense, <span className="text-gradient-emerald">{farmerName}</span>
          </h1>
          <p className="text-sm text-[#D1DED6] max-w-xl mx-auto leading-relaxed">
            Begin by digitizing your cultivated land plot on satellite imagery. Our system generates hyper-local microclimate alerts, soil horizon profiles, and predictive yield models.
          </p>
        </div>

        {/* Primary Cadastral CTA Card */}
        <div
          className="group relative bg-gradient-to-br from-[#0D1612] via-[#131F19] to-[#070D0A] rounded-3xl p-8 sm:p-10 border border-emerald-500/30 shadow-2xl overflow-hidden cursor-pointer hover:border-emerald-400/60 hover:shadow-emerald-950/60 transition-all duration-300"
          onClick={onOpenGISMap}
        >
          {/* Ambient Lighting Gradients */}
          <div className="absolute -right-12 -top-12 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-md group-hover:scale-105 transition-transform">
                <MapPin className="w-7 h-7" />
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
                Satellite GPS Active
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
                Digitize Your First Farm Plot
              </h2>
              <p className="text-sm text-[#D1DED6] max-w-lg leading-relaxed">
                Launch the Cadastral Mapping Studio to trace boundary coordinates on high-resolution satellite layers and automatically calculate geodesic acreage.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/40 transition-all">
                <span>Open GIS Mapping Studio</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </div>

        {/* Steps Preview with Bespoke Icons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-8">
          {[
            { label: 'Geolocate Field', desc: 'GPS & Pinpoint Search', icon: <MapPin className="w-4 h-4 text-emerald-400" /> },
            { label: 'Digitize Polygon', desc: 'Trace Ground Perimeter', icon: <PenTool className="w-4 h-4 text-emerald-400" /> },
            { label: 'Geodesic Area', desc: 'WGS84 Ellipsoid Metrics', icon: <Ruler className="w-4 h-4 text-emerald-400" /> },
            { label: 'Telemetry Sync', desc: 'Sensory & Yield Models', icon: <Activity className="w-4 h-4 text-emerald-400" /> }
          ].map((step, i) => (
            <div key={i} className="p-4 bg-[#0D1612]/90 backdrop-blur-md rounded-2xl border border-emerald-900/40 shadow-md">
              <div className="w-8 h-8 rounded-xl bg-[#070D0A] border border-emerald-900/50 flex items-center justify-center mb-2.5">
                {step.icon}
              </div>
              <span className="font-bold text-white text-xs block">{step.label}</span>
              <span className="text-[11px] text-[#82968C] mt-0.5 block leading-tight">{step.desc}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Has Saved Farms: Executive Decision Chooser ───
  return (
    <div
      className="max-w-5xl mx-auto px-4 py-10"
      style={{
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Welcome Header */}
      <div className="text-center mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
          <Leaf className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cadastral Workspace Manager</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
          Welcome back, <span className="text-gradient-emerald">{farmerName}</span>
        </h1>
        <p className="text-sm text-[#D1DED6] max-w-lg mx-auto">
          Currently managing <strong className="text-white font-semibold">{savedFarms.length} registered field plot{savedFarms.length > 1 ? 's' : ''}</strong>. Select an action to proceed:
        </p>
      </div>

      {/* Two-Card Decision Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Card A: View Saved Fields */}
        <div
          className="group relative bg-gradient-to-br from-[#0D1612] via-[#131F19] to-[#070D0A] rounded-3xl p-8 border border-emerald-900/40 shadow-xl overflow-hidden cursor-pointer hover:border-emerald-500/40 hover:shadow-2xl transition-all duration-300"
          onClick={onViewSavedFields}
        >
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-md group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-[#070D0A] text-emerald-300 text-xs font-mono font-bold border border-emerald-900/40">
                {savedFarms.length} Monitored Plot{savedFarms.length > 1 ? 's' : ''}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight font-display">
                Monitored Farm Fields
              </h2>
              <p className="mt-1 text-xs text-[#D1DED6] leading-relaxed">
                Inspect agronomic telemetry, soil horizons, and pathogen risk across saved plots.
              </p>
            </div>

            {/* Preview of saved plots */}
            <div className="space-y-2 pt-1">
              {savedFarms.slice(0, 3).map((farm) => (
                <div
                  key={farm.farm_id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-[#070D0A]/70 border border-emerald-900/40"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                    <Wheat className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-white block truncate">{farm.farm_name}</span>
                    <span className="text-[11px] text-[#D1DED6]">{farm.crop} • {farm.area_hectares} ha</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">Sync Active</span>
                </div>
              ))}
              {savedFarms.length > 3 && (
                <p className="text-xs text-emerald-400/80 font-medium pl-1">
                  + {savedFarms.length - 3} more registered plot{savedFarms.length - 3 > 1 ? 's' : ''}...
                </p>
              )}
            </div>

            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all group-hover:gap-2.5">
                <Eye className="w-4 h-4" />
                <span>View All Saved Plots</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </div>

        {/* Card B: Add New Field via GIS */}
        <div
          className="group relative bg-gradient-to-br from-[#0D1612] via-[#131F19] to-[#070D0A] rounded-3xl p-8 border border-emerald-900/40 shadow-xl overflow-hidden cursor-pointer hover:border-emerald-500/40 hover:shadow-2xl transition-all duration-300"
          onClick={onOpenGISMap}
        >
          <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-[#070D0A] text-slate-300 text-xs font-semibold border border-emerald-900/40">
                Satellite Cadastre
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight font-display">
                Add New Farm Boundary
              </h2>
              <p className="mt-1 text-xs text-[#D1DED6] leading-relaxed">
                Launch interactive satellite mapping to trace a new acreage boundary.
              </p>
            </div>

            {/* Feature checklist */}
            <div className="space-y-2 pt-1">
              {[
                { title: 'Satellite & Street Map Layers', desc: 'Real-time high-resolution imagery', icon: <Globe className="w-3.5 h-3.5 text-emerald-400" /> },
                { title: 'Cadastral Polygon HUD', desc: 'Corner vertex digitizing with live area', icon: <PenTool className="w-3.5 h-3.5 text-emerald-400" /> },
                { title: 'Geodesic Area Computation', desc: 'Instant Hectares, Acres & Bigha readouts', icon: <Ruler className="w-3.5 h-3.5 text-emerald-400" /> }
              ].map((feat, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-[#070D0A]/70 border border-emerald-900/40">
                  <div className="mt-0.5 shrink-0">{feat.icon}</div>
                  <div>
                    <span className="text-xs font-semibold text-white block">{feat.title}</span>
                    <span className="text-[11px] text-[#82968C] block">{feat.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all group-hover:gap-2.5">
                <MapPin className="w-4 h-4" />
                <span>Open GIS Mapping Studio</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
