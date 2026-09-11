import React, { useState, useEffect } from 'react';
import {
  Sprout,
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  MapPin,
  FlaskConical,
  Edit3,
  RotateCcw,
  Save,
  Droplets,
  Leaf,
  BarChart3,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { soilService, ComprehensiveSoilAnalysis, SoilData } from '../../services/soilService';
import { FarmData } from '../../services/farmService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InsightCard } from '../ui/InsightCard';
import { colors, motionPresets } from '../../styles/design-tokens';

import { AnimatedCounter } from '../Common/AnimatedCounter';
import { AgronomicMotif } from '../Common/AgronomicMotif';

interface SoilAnalysisModuleProps {
  farm?: FarmData | null;
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
  crop?: string;
}

export const SoilAnalysisModule: React.FC<SoilAnalysisModuleProps> = ({
  farm,
  location,
  crop = 'Rice'
}) => {
  const rawLat = farm?.latitude ?? location?.latitude ?? 28.6692;
  const rawLon = farm?.longitude ?? location?.longitude ?? 77.4538;
  const safeLat = isNaN(Number(rawLat)) ? 28.6692 : Number(rawLat);
  const safeLon = isNaN(Number(rawLon)) ? 77.4538 : Number(rawLon);
  const farmId = farm?.farm_id || 'default_farm';
  const selectedCrop = farm?.crop || crop || 'Rice';
  const farmTitle = farm?.farm_name || 'Green Valley Rice Farm';
  const locationLabel = farm?.location_name || (location ? `${location.city}, ${location.country}` : 'Ghaziabad, Uttar Pradesh');

  const [analysis, setAnalysis] = useState<ComprehensiveSoilAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showEditForm, setShowEditForm] = useState<boolean>(false);

  const [inputN, setInputN] = useState<number>(70);
  const [inputP, setInputP] = useState<number>(50);
  const [inputK, setInputK] = useState<number>(80);
  const [inputPh, setInputPh] = useState<number>(6.5);
  const [inputMoisture, setInputMoisture] = useState<number>(35);
  const [inputOrganic, setInputOrganic] = useState<number>(1.8);
  const [inputSoilType, setInputSoilType] = useState<string>('Clay Loam');
  const [saveSuccess, setSaveSuccess] = useState<string>('');

  const loadSoil = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await soilService.getSoilAnalysis(safeLat, safeLon, farmId, selectedCrop);
      setAnalysis(data);

      if (data && data.soilData) {
        setInputN(data.soilData.nitrogen || 70);
        setInputP(data.soilData.phosphorus || 50);
        setInputK(data.soilData.potassium || 80);
        setInputPh(data.soilData.ph || 6.5);
        setInputMoisture(data.soilData.moisture || 35);
        setInputOrganic(data.soilData.organic_matter || 1.8);
        setInputSoilType(data.soilData.type || 'Clay Loam');
      }
    } catch (err: any) {
      console.error('Soil load error:', err);
      setError(err?.message || 'Failed to load soil analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSoil();
  }, [safeLat, safeLon, farmId, selectedCrop]);

  const handleSaveLabTest = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess('');

    const n = Number(inputN);
    const p = Number(inputP);
    const k = Number(inputK);
    const ph = Number(inputPh);
    const m = Number(inputMoisture);
    const oc = Number(inputOrganic);

    if (isNaN(ph) || ph < 0 || ph > 14) {
      setError('Soil pH must be between 0 and 14.');
      return;
    }
    if (isNaN(m) || m < 0 || m > 100) {
      setError('Soil moisture percentage must be between 0% and 100%.');
      return;
    }
    if (isNaN(n) || n < 0 || isNaN(p) || p < 0 || isNaN(k) || k < 0) {
      setError('NPK nutrient values must be non-negative numbers.');
      return;
    }
    if (isNaN(oc) || oc < 0) {
      setError('Organic carbon percentage must be non-negative.');
      return;
    }

    const updatedSoil: Partial<SoilData> = {
      nitrogen: n,
      phosphorus: p,
      potassium: k,
      ph,
      moisture: m,
      organic_matter: oc,
      type: inputSoilType
    };

    soilService.saveManualSoilTest(farmId, updatedSoil);
    setSaveSuccess('Lab soil test values updated!');
    setShowEditForm(false);
    loadSoil();
  };

  const handleResetToSensor = () => {
    soilService.resetSoilTest(farmId);
    setSaveSuccess('Reset to geospatial estimates.');
    setShowEditForm(false);
    loadSoil();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Analyzing soil NPK and chemistry parameters...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <span>{error || 'Unable to load soil analysis.'}</span>
          <button type="button" onClick={loadSoil} className="font-bold underline cursor-pointer">Retry</button>
        </div>
      </div>
    );
  }

  const { soilData, healthScore, suitabilityRating, nutrientStatus, recommendations } = analysis;

  const getStatusBg = (statusText: string) => {
    const s = (statusText || '').toLowerCase();
    if (s.includes('low') || s.includes('deficient')) {
      return 'bg-rose-950/70 text-rose-300 border border-rose-500/40';
    }
    if (s.includes('high') || s.includes('excess')) {
      return 'bg-amber-950/70 text-amber-300 border border-amber-500/40';
    }
    return 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40';
  };

  const getStatusBadgeVariant = (statusText: string): 'emerald' | 'amber' | 'rose' => {
    const s = (statusText || '').toLowerCase();
    if (s.includes('low') || s.includes('deficient')) return 'rose';
    if (s.includes('high') || s.includes('excess')) return 'amber';
    return 'emerald';
  };

  // NPK Comparison Data (Current vs Ideal Target Benchmark)
  const npkComparisonData = [
    {
      nutrient: 'Nitrogen (N)',
      current: soilData.nitrogen || 0,
      ideal: 90,
      unit: 'kg/ha'
    },
    {
      nutrient: 'Phosphorus (P)',
      current: soilData.phosphorus || 0,
      ideal: 50,
      unit: 'kg/ha'
    },
    {
      nutrient: 'Potassium (K)',
      current: soilData.potassium || 0,
      ideal: 85,
      unit: 'kg/ha'
    }
  ];

  // Radar chart representation
  const radarData = [
    { subject: 'Nitrogen', current: Math.min(100, Math.round((soilData.nitrogen / 120) * 100)), ideal: 80 },
    { subject: 'Phosphorus', current: Math.min(100, Math.round((soilData.phosphorus / 60) * 100)), ideal: 80 },
    { subject: 'Potassium', current: Math.min(100, Math.round((soilData.potassium / 100) * 100)), ideal: 85 },
    { subject: 'Moisture', current: Math.min(100, soilData.moisture * 2), ideal: 70 },
    { subject: 'pH Balance', current: Math.min(100, Math.round((soilData.ph / 8) * 100)), ideal: 80 }
  ];

  // Circular progress calculations
  const circumference = 2 * Math.PI * 34;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  return (
    <motion.div
      variants={motionPresets.container}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-100 font-sans"
    >
      {/* 1. VerdaAgro Pedology Context Bar */}
      <motion.div variants={motionPresets.item} className="verda-hero-header agri-context-header-soil rounded-3xl rounded-tr-xl relative overflow-hidden">
        <AgronomicMotif variant="leaf" className="right-0 top-0 text-emerald-400" opacity={0.08} />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
              <span>Pedology</span>
              <span className="text-emerald-700">/</span>
              <span>Subterranean NPK & Horizon Diagnostics</span>
              <Badge variant="emerald" shape="live" size="sm" className="ml-1">
                CALIBRATED
              </Badge>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                Subterranean Soil Health & Chemistry
              </h1>
              <Badge variant="emerald" size="md">
                <AnimatedCounter value={healthScore} prefix="Health Score: " suffix="/100" />
              </Badge>
              <Badge variant="harvest" size="md">
                Target Crop: {selectedCrop}
              </Badge>
            </div>

            <p className="text-xs text-slate-200 flex items-center gap-2 font-medium">
              <span className="font-bold text-white">{farmTitle}</span>
              <span className="text-emerald-800">•</span>
              <span className="flex items-center gap-1 text-emerald-300">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {locationLabel}
              </span>
              <span className="text-emerald-800">•</span>
              <span className="text-slate-300 font-mono text-[11px]">Coord: {safeLat.toFixed(3)}°N, {safeLon.toFixed(3)}°E</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="forest"
              size="sm"
              onClick={() => setShowEditForm(!showEditForm)}
              icon={<Edit3 className="w-3.5 h-3.5" />}
            >
              {showEditForm ? 'Close Lab Form' : 'Update Soil Test'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadSoil}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 font-medium">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Edit Form */}
      <AnimatePresence>
        {showEditForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="agri-bento-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40 text-xs">
                <div>
                  <h3 className="font-bold text-white text-sm font-display">Lab Soil Test Results Input</h3>
                  <p className="text-[#D1DED6] text-[11px]">Override satellite approximations with actual soil sample reports.</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetToSensor}
                  className="text-rose-400 hover:text-rose-300 text-xs font-semibold underline cursor-pointer"
                >
                  Reset to Satellite Estimates
                </button>
              </div>

              <form onSubmit={handleSaveLabTest} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-white mb-1 font-semibold">Nitrogen (N kg/ha)</label>
                    <input
                      type="number"
                      value={inputN}
                      onChange={(e) => setInputN(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#070D0A] border border-emerald-900/60 rounded-xl text-white font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white mb-1 font-semibold">Phosphorus (P kg/ha)</label>
                    <input
                      type="number"
                      value={inputP}
                      onChange={(e) => setInputP(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#070D0A] border border-emerald-900/60 rounded-xl text-white font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white mb-1 font-semibold">Potassium (K kg/ha)</label>
                    <input
                      type="number"
                      value={inputK}
                      onChange={(e) => setInputK(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#070D0A] border border-emerald-900/60 rounded-xl text-white font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white mb-1 font-semibold">pH Level</label>
                    <input
                      type="number"
                      step="0.1"
                      value={inputPh}
                      onChange={(e) => setInputPh(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#070D0A] border border-emerald-900/60 rounded-xl text-white font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-emerald-950/40">
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-emerald-900/40 text-[#D1DED6] hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Values
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Asymmetric VerdaAgro Pedology Bento Grid */}
      <motion.div variants={motionPresets.item} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Subterranean Vitality Core (7 Cols) - Asymmetric Radius & Leaf Motif */}
        <div className="lg:col-span-7 p-6 flex flex-col gap-6 rounded-3xl rounded-tr-xl bg-[#0D1612]/92 border border-emerald-900/40 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.7)] backdrop-blur-xl relative overflow-hidden">
          <AgronomicMotif variant="leaf" className="right-2 bottom-1 text-emerald-500" opacity={0.06} />
          
          <div className="flex items-center justify-between pb-3 border-b border-emerald-950/50 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-950/40 border border-emerald-500/35 flex items-center justify-center shadow-inner">
                <Sprout className="w-4 h-4 text-emerald-300" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Root-Zone Vitality & Chemistry Horizon
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-300 font-semibold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Suitability: {suitabilityRating}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              {/* Circular Health Meter */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-28 h-28 transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="44"
                    stroke="#13231B"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="44"
                    stroke={healthScore >= 70 ? '#34d399' : healthScore >= 50 ? '#fbbf24' : '#f43f5e'}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 44}
                    strokeDashoffset={2 * Math.PI * 44 * (1 - healthScore / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-white font-display">{healthScore}</span>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">/ 100</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-emerald-300/90 mb-1">
                  Soil Fertility Score
                </div>
                <div className="text-2xl font-black text-white font-display">
                  {suitabilityRating || 'Optimal Crop Condition'}
                </div>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                  Subterranean nutrients calibrated for high-yield <span className="font-bold text-emerald-300">{selectedCrop}</span> cultivation.
                </p>
              </div>
            </div>

            <div className="bg-[#070D0A]/75 border border-emerald-900/40 rounded-xl p-3.5 text-right shrink-0 shadow-sm">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-300">Soil Reaction (pH)</div>
              <div className="text-xl font-mono font-black text-white mt-0.5">{soilData.ph} <span className="text-xs text-emerald-300 font-semibold">pH</span></div>
              <div className="text-[10px] text-emerald-300 font-medium mt-0.5">{soilData.ph >= 6.0 && soilData.ph <= 7.5 ? 'Neutral (Optimal)' : 'Needs amendment'}</div>
            </div>
          </div>

          {/* Subterranean 3-horizon metadata strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 relative z-10 mt-auto">
            <div className="bg-[#070D0A]/80 border border-emerald-900/40 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-300 mb-1.5">
                <span className="text-[11px] font-semibold flex items-center gap-1.5 text-sky-200">
                  <Droplets className="w-3.5 h-3.5 text-sky-400" />
                  Root Moisture
                </span>
                <span className="text-[10px] font-bold text-emerald-300">{soilData.moisture}% vol</span>
              </div>
              <div className="text-xl font-bold text-white font-display">
                {soilData.moisture >= 30 ? 'Field Capacity' : 'Low Moisture'}
              </div>
              <div className="w-full bg-slate-800/90 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-sky-400 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, soilData.moisture * 2)}%` }}
                />
              </div>
            </div>

            <div className="bg-[#070D0A]/80 border border-emerald-900/40 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-300 mb-1.5">
                <span className="text-[11px] font-semibold flex items-center gap-1.5 text-emerald-200">
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                  Organic Humus
                </span>
                <span className="text-[10px] font-bold text-emerald-300">Horizon A</span>
              </div>
              <div className="text-xl font-bold text-white font-display">
                {inputOrganic}% <span className="text-xs font-normal text-slate-300">OM</span>
              </div>
              <p className="text-[10px] text-emerald-300 font-medium mt-2">
                {inputOrganic >= 1.5 ? 'High microbial activity' : 'Incorporate compost'}
              </p>
            </div>

            <div className="bg-[#070D0A]/80 border border-emerald-900/40 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-300 mb-1.5">
                <span className="text-[11px] font-semibold flex items-center gap-1.5 text-teal-200">
                  <Layers className="w-3.5 h-3.5 text-teal-400" />
                  Pedology Type
                </span>
                <span className="text-[10px] font-bold text-teal-300 font-mono">Profile</span>
              </div>
              <div className="text-xl font-bold text-white font-display truncate">
                {soilData.type}
              </div>
              <p className="text-[10px] text-slate-300 mt-2 truncate">
                High cation exchange capacity
              </p>
            </div>
          </div>
        </div>

        {/* NPK Macro-Nutrient Triad Desk (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          {/* Nitrogen Tile */}
          <div className="p-4 flex items-center justify-between rounded-xl bg-[#0D1612]/92 border border-emerald-900/40 backdrop-blur-xl shadow-sm hover:border-emerald-500/40 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/35 text-emerald-300 text-xs font-bold flex items-center justify-center font-mono">N</span>
                <span className="text-xs font-bold text-white font-display">Available Nitrogen</span>
              </div>
              <div className="text-lg font-black text-white font-mono">
                {soilData.nitrogen} <span className="text-xs text-slate-300 font-normal">kg/ha</span>
              </div>
              <p className="text-[11px] text-slate-300">Target benchmark: 90 kg/ha</p>
            </div>
            <Badge variant={getStatusBadgeVariant(nutrientStatus.nitrogenStatus)} size="sm">
              {nutrientStatus.nitrogenStatus}
            </Badge>
          </div>

          {/* Phosphorus Tile */}
          <div className="p-4 flex items-center justify-between rounded-xl bg-[#0D1612]/92 border border-emerald-900/40 backdrop-blur-xl shadow-sm hover:border-emerald-500/40 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-500/35 text-sky-300 text-xs font-bold flex items-center justify-center font-mono">P</span>
                <span className="text-xs font-bold text-white font-display">Available Phosphorus</span>
              </div>
              <div className="text-lg font-black text-white font-mono">
                {soilData.phosphorus} <span className="text-xs text-slate-300 font-normal">kg/ha</span>
              </div>
              <p className="text-[11px] text-slate-300">Target benchmark: 50 kg/ha</p>
            </div>
            <Badge variant={getStatusBadgeVariant(nutrientStatus.phosphorusStatus)} size="sm">
              {nutrientStatus.phosphorusStatus}
            </Badge>
          </div>

          {/* Potassium Tile */}
          <div className="p-4 flex items-center justify-between rounded-xl bg-[#0D1612]/92 border border-emerald-900/40 backdrop-blur-xl shadow-sm hover:border-emerald-500/40 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/35 text-amber-300 text-xs font-bold flex items-center justify-center font-mono">K</span>
                <span className="text-xs font-bold text-white font-display">Available Potassium</span>
              </div>
              <div className="text-lg font-black text-white font-mono">
                {soilData.potassium} <span className="text-xs text-slate-300 font-normal">kg/ha</span>
              </div>
              <p className="text-[11px] text-slate-300">Target benchmark: 85 kg/ha</p>
            </div>
            <Badge variant={getStatusBadgeVariant(nutrientStatus.potassiumStatus)} size="sm">
              {nutrientStatus.potassiumStatus}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* 3. NPK Benchmark Comparison Bar Chart */}
      <motion.div variants={motionPresets.item}>
        <div className="agri-bento-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-950/40">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Nutrient Benchmarking</span>
              <h3 className="text-base font-bold text-white mt-0.5 font-display">Current Pedology Levels vs. Target Thresholds for {selectedCrop}</h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-white font-medium">
                <span className="w-3 h-3 rounded-md bg-emerald-400 inline-block" /> Current (kg/ha)
              </span>
              <span className="flex items-center gap-1.5 text-[#D1DED6] font-medium">
                <span className="w-3 h-3 rounded-md bg-amber-400 inline-block" /> Target Benchmark
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={npkComparisonData}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#13231B" vertical={false} />
                <XAxis
                  dataKey="nutrient"
                  tick={{ fill: '#D1DED6', fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: '#1B3125' }}
                  tickLine={false}
                />
                <YAxis
                  unit=" kg"
                  tick={{ fill: '#D1DED6', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="agri-bento-card p-3 shadow-2xl text-xs space-y-1 bg-[#0D1612] border border-emerald-500/30">
                          <p className="font-bold text-white font-display">{label}</p>
                          <p className="text-emerald-400 font-semibold">
                            Current: {payload[0]?.value} kg/ha
                          </p>
                          <p className="text-amber-400 font-semibold">
                            Target Ideal: {payload[1]?.value} kg/ha
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="current" name="Current Level" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={48} />
                <Bar dataKey="ideal" name="Target Ideal" fill="#fbbf24" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* 4. Agronomic Soil Management Plan */}
      <motion.div variants={motionPresets.item}>
        <div className="agri-bento-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-emerald-950/40">
            <Leaf className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white font-display">
              Subterranean Conditioning & Fertilizer Plan for {selectedCrop}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-emerald-900/40 bg-[#070D0A]/60 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Sprout className="w-4 h-4" />
                <span className="text-white">Fertilizer Application Recommendation</span>
              </div>
              <p className="text-[#D1DED6] leading-relaxed font-normal">
                {recommendations.fertilizerPlan}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-900/40 bg-[#070D0A]/60 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <FlaskConical className="w-4 h-4" />
                <span className="text-white">pH Correction & Soil Conditioning</span>
              </div>
              <p className="text-[#D1DED6] leading-relaxed font-normal">
                {recommendations.phCorrection}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
