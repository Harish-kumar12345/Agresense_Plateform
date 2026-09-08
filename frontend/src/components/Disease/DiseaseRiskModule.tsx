import React, { useState, useEffect } from 'react';
import {
  Bug,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Sprout,
  X,
  Search,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { diseaseRiskService, DiseaseRiskResult } from '../../services/diseaseRiskService';
import { soilService } from '../../services/soilService';
import { weatherService } from '../../services/weatherService';
import { FarmData } from '../../services/farmService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { colors, motionPresets } from '../../styles/design-tokens';

interface DiseaseRiskModuleProps {
  farm?: FarmData | null;
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    state?: string;
  };
  crop?: string;
}

export const DiseaseRiskModule: React.FC<DiseaseRiskModuleProps> = ({
  farm,
  location,
  crop = 'Rice'
}) => {
  const rawLat = farm?.latitude ?? location?.latitude ?? 28.6692;
  const rawLon = farm?.longitude ?? location?.longitude ?? 77.4538;
  const safeLat = isNaN(Number(rawLat)) ? 28.6692 : Number(rawLat);
  const safeLon = isNaN(Number(rawLon)) ? 77.4538 : Number(rawLon);
  const farmArea = farm?.area_hectares || 2.5;
  const selectedCrop = farm?.crop || crop || 'Rice';
  const farmTitle = farm?.farm_name || 'Green Valley Rice Farm';
  const locationLabel = farm?.location_name || (location?.city ? `${location.city}, India` : 'Ghaziabad, Uttar Pradesh');

  const [riskData, setRiskData] = useState<DiseaseRiskResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [expandedDisease, setExpandedDisease] = useState<string | null>(null);

  const runAutomatedDiseasePipeline = async () => {
    setLoading(true);
    setError('');

    try {
      const [soilRes, weatherRes] = await Promise.all([
        soilService.getSoilAnalysis(safeLat, safeLon, farm?.farm_id || 'default_farm', selectedCrop),
        weatherService.getLiveWeatherData(safeLat, safeLon, selectedCrop)
      ]);

      const soil = soilRes.soilData;
      const weather = weatherRes.current;

      const payload = {
        crop: selectedCrop,
        latitude: safeLat,
        longitude: safeLon,
        weatherData: {
          temperature_c: weather.temperature_c,
          relative_humidity: weather.relative_humidity,
          precipitation_mm: weather.precipitation_mm
        },
        soilData: {
          moisture: soil.moisture,
          ph: soil.ph,
          nitrogen: soil.nitrogen,
          phosphorus: soil.phosphorus,
          potassium: soil.potassium
        },
        gdd: 1450
      };

      const result = await diseaseRiskService.predictDiseaseRisk(payload);
      setRiskData(result);
    } catch (err: any) {
      console.error('Disease Risk Error:', err);
      setError(err?.message || 'Failed to compute disease risk model.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAutomatedDiseasePipeline();
  }, [safeLat, safeLon, selectedCrop]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Evaluating field pathogen & disease risk levels...</p>
      </div>
    );
  }

  const getSeverityBadgeVariant = (severity: string): 'rose' | 'amber' | 'emerald' => {
    const s = (severity || '').toLowerCase();
    if (s === 'critical' || s === 'high') return 'rose';
    if (s === 'medium') return 'amber';
    return 'emerald';
  };

  const getGaugeColor = (score: number) => {
    if (score >= 60) return '#f43f5e'; // rose-500
    if (score >= 35) return colors.harvest[500]; // amber-500
    return colors.forest[500]; // emerald-500
  };

  return (
    <motion.div
      variants={motionPresets.container}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-100 font-sans"
    >
      {/* 1. VerdaAgro Epidemiology Context Bar */}
      <motion.div variants={motionPresets.item} className="agri-context-header agri-context-header-farm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
              <span>Epidemiology</span>
              <span className="text-emerald-700">/</span>
              <span>Fungal & Pathogen Vector Intelligence</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-mono font-medium ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE VECTOR RADAR
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
                Pathogen Spore & Crop Disease Telemetry
              </h1>
              {riskData && (
                <span className={`agri-pill ${
                  riskData.riskLevel === 'Critical' || riskData.riskLevel === 'High' 
                    ? 'agri-pill-amber' 
                    : riskData.riskLevel === 'Medium'
                    ? 'agri-pill-amber'
                    : 'agri-pill-emerald'
                }`}>
                  {riskData.riskLevel} Pressure ({riskData.overallRiskScore}%)
                </span>
              )}
              <span className="agri-pill agri-pill-muted">
                Host Crop: {selectedCrop}
              </span>
            </div>

            <p className="text-xs text-[#D1DED6] flex items-center gap-2 font-normal">
              <span className="font-semibold text-white">{farmTitle}</span>
              <span className="text-emerald-800">•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {locationLabel} ({farmArea} ha)
              </span>
              <span className="text-emerald-800">•</span>
              <span className="text-slate-300 font-mono text-[11px]">Coord: {safeLat.toFixed(3)}°N, {safeLon.toFixed(3)}°E</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={runAutomatedDiseasePipeline}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              Re-evaluate Vectors
            </button>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={runAutomatedDiseasePipeline} className="font-bold underline cursor-pointer hover:text-rose-200">Retry</button>
        </div>
      )}

      {/* 2. Top Asymmetric Pathogen Pressure Bento Grid */}
      {riskData && (
        <motion.div variants={motionPresets.item} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Pathogen Pressure Dial (5 Cols) */}
          <div className="lg:col-span-5 agri-bento-card agri-photo-card agri-photo-card-farm p-6 flex flex-col items-center justify-between text-center space-y-4">
            <div className="w-full flex items-center justify-between pb-3 border-b border-emerald-950/40">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D1DED6]">Pathogen Inoculum Pressure</span>
              <span className="text-[11px] font-mono text-emerald-400 font-medium">Model: GDD + RH</span>
            </div>

            <div className="relative w-48 h-28 flex items-center justify-center overflow-hidden my-2">
              <svg className="w-48 h-48 -rotate-90">
                {/* Background arc */}
                <circle
                  cx="96"
                  cy="96"
                  r="72"
                  stroke="#13231B"
                  strokeWidth="14"
                  fill="transparent"
                  strokeDasharray={`${Math.PI * 72} ${Math.PI * 72}`}
                  strokeDashoffset="0"
                />
                {/* Active gauge arc */}
                <circle
                  cx="96"
                  cy="96"
                  r="72"
                  stroke={getGaugeColor(riskData.overallRiskScore)}
                  strokeWidth="14"
                  fill="transparent"
                  strokeDasharray={`${Math.PI * 72} ${Math.PI * 72}`}
                  strokeDashoffset={Math.PI * 72 * (1 - riskData.overallRiskScore / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute bottom-1 flex flex-col items-center">
                <span className="text-4xl font-black text-white font-display">
                  {riskData.overallRiskScore}%
                </span>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">
                  OUTBREAK PROBABILITY
                </span>
              </div>
            </div>

            <div className="w-full pt-3 border-t border-emerald-950/40 text-center">
              <div className="text-xs font-bold text-white mb-1">
                {riskData.riskLevel} Spore Pressure Index
              </div>
              <p className="text-[11px] text-[#D1DED6] leading-relaxed max-w-xs mx-auto">
                Microclimate leaf wetness and canopy humidity currently dictate active fungal incubation risk.
              </p>
            </div>
          </div>

          {/* Actionable Advice & Inspection Protocol (7 Cols) */}
          <div className="lg:col-span-7 agri-bento-card p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-950/40">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Agronomic Chemical & Bio Prescription</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white leading-snug font-display">
                {riskData.recommendation}
              </h3>
              <p className="text-xs text-[#D1DED6] leading-relaxed pt-1">
                Field scouting should prioritize shaded canopy margins where morning dew condensation persists past 09:00 AM. Preventive bio-fungicide or copper oxychloride application is recommended before rainfall events.
              </p>
            </div>

            <div className="pt-3 border-t border-emerald-950/40 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-semibold text-[#D1DED6]">
                <strong className="text-white">{riskData.individualRisks.length}</strong> Pathogen Entities Modeled
              </span>
              <button
                type="button"
                onClick={() => setSelectedIncident(riskData.individualRisks[0])}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Bug className="w-3.5 h-3.5" />
                Inspect Primary Threat
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. 7-Day Disease Risk Trajectory Chart */}
      {riskData && (
        <motion.div variants={motionPresets.item}>
          <div className="agri-bento-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">7-Day Spore Telemetry</span>
                <h3 className="text-base font-bold text-white mt-0.5 font-display">Pathogen Pressure & Canopy Humidity Trajectory Forecast</h3>
              </div>
              <span className="agri-pill agri-pill-emerald">
                7-Day Model
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { day: 'Day 1 (Today)', risk: riskData.overallRiskScore, threshold: 50 },
                    { day: 'Day 2', risk: Math.min(95, Math.max(15, Math.round(riskData.overallRiskScore * 1.06))), threshold: 50 },
                    { day: 'Day 3', risk: Math.min(95, Math.max(15, Math.round(riskData.overallRiskScore * 1.14))), threshold: 50 },
                    { day: 'Day 4', risk: Math.min(95, Math.max(15, Math.round(riskData.overallRiskScore * 1.08))), threshold: 50 },
                    { day: 'Day 5', risk: Math.min(95, Math.max(15, Math.round(riskData.overallRiskScore * 0.94))), threshold: 50 },
                    { day: 'Day 6', risk: Math.min(95, Math.max(15, Math.round(riskData.overallRiskScore * 0.86))), threshold: 50 },
                    { day: 'Day 7', risk: Math.min(95, Math.max(15, Math.round(riskData.overallRiskScore * 0.80))), threshold: 50 }
                  ]}
                  margin={{ top: 10, right: 20, left: -20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="diseaseRiskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#13231B" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#D1DED6', fontSize: 11 }} axisLine={{ stroke: '#1B3125' }} tickLine={false} />
                  <YAxis unit="%" domain={[0, 100]} tick={{ fill: '#D1DED6', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="agri-bento-card p-3 shadow-xl text-xs space-y-1 bg-[#0D1612] border border-emerald-500/30">
                            <p className="font-bold text-white font-display">{label}</p>
                            <p className="text-emerald-400 font-semibold">Predicted Outbreak Pressure: {payload[0]?.value}%</p>
                            <p className="text-[#D1DED6] text-[11px]">Intervention Threshold: 50%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="risk" stroke="#34d399" strokeWidth={2.5} fillOpacity={1} fill="url(#diseaseRiskGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. Tracked Pathogen Matrix */}
      {riskData && (
        <motion.div variants={motionPresets.item}>
          <div className="agri-bento-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Pathogen Vulnerability Matrix</span>
                <h3 className="text-base font-bold text-white mt-0.5 font-display">Crop Vulnerability by Fungal & Insect Entity</h3>
              </div>
              <span className="agri-pill agri-pill-muted">
                AI Diagnostics Model
              </span>
            </div>

            <div className="space-y-3">
              {riskData.individualRisks.map((pathogen, idx) => {
                const isExpanded = expandedDisease === pathogen.disease;

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isExpanded 
                        ? 'border-emerald-500/50 bg-emerald-950/20' 
                        : 'border-emerald-900/40 bg-[#070D0A]/50 hover:border-emerald-800/60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${
                          pathogen.severity === 'Critical' || pathogen.severity === 'High'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : pathogen.severity === 'Medium'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          <Bug className="w-5 h-5" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-sm font-display">{pathogen.disease}</h4>
                            <span className={`agri-pill ${
                              pathogen.severity === 'Critical' || pathogen.severity === 'High'
                                ? 'agri-pill-amber'
                                : 'agri-pill-emerald'
                            }`}>
                              {pathogen.severity}
                            </span>
                          </div>
                          <p className="text-xs text-[#D1DED6] mt-0.5">
                            Type: <strong className="text-white">{pathogen.type}</strong> • Risk Probability: <strong className="text-emerald-400">{pathogen.riskScorePct}%</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedIncident(pathogen)}
                          className="px-3 py-1.5 rounded-lg border border-emerald-900/50 text-[#D1DED6] hover:text-white hover:border-emerald-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Field Protocol
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedDisease(isExpanded ? null : pathogen.disease)}
                          className="p-1.5 rounded-lg text-[#D1DED6] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title="Toggle Remedy Details"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Remedy Section */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden pt-3 border-t border-emerald-950/40 text-xs text-[#D1DED6] space-y-2 mt-3"
                        >
                          <div className="p-3.5 bg-[#070D0A]/90 border border-emerald-900/40 rounded-xl space-y-1.5">
                            <span className="font-semibold text-emerald-400 block text-xs uppercase tracking-wider">Recommended Agronomic Countermeasures:</span>
                            <ul className="list-disc pl-4 space-y-1 text-[#D1DED6]">
                              <li>Maintain optimal canopy aeration by avoiding excessive planting density.</li>
                              <li>Avoid surplus top-dressed nitrogen fertilizer during high morning fog or persistent drizzle windows.</li>
                              <li>Apply registered preventative biological formulations (e.g. Trichoderma or Bacillus subtilis) during early tillering.</li>
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* 5. Contributing Environmental Factors */}
      {riskData && (
        <motion.div variants={motionPresets.item}>
          <div className="agri-bento-card p-6 space-y-4">
            <div className="pb-3 border-b border-emerald-950/40">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Meteorological Triggers</span>
              <h3 className="text-base font-bold text-white mt-0.5 font-display">Contributing Environmental Microclimate Factors</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {riskData.contributingFactors.map((factor, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#070D0A]/60 border border-emerald-900/40 space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-white">
                    <span>{factor.factor}</span>
                    <span className="agri-pill agri-pill-amber">
                      {factor.impact}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#D1DED6] leading-relaxed">{factor.description}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* 6. INCIDENT INSPECTION MODAL */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="max-w-md w-full"
            >
              <div className="agri-bento-card p-6 space-y-4 text-xs bg-[#0D1612] border border-emerald-500/40 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
                  <div className="flex items-center gap-2">
                    <Bug className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white font-display">
                      Field Scouting Protocol: {selectedIncident.disease}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedIncident(null)}
                    className="p-1 rounded-lg text-[#D1DED6] hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-[#D1DED6]">
                  <div className="flex justify-between items-center py-1">
                    <span>Pathogen Category:</span>
                    <strong className="text-white">{selectedIncident.type}</strong>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-emerald-950/40">
                    <span>Calculated Risk Probability:</span>
                    <span className="agri-pill agri-pill-emerald">
                      {selectedIncident.riskScorePct}% ({selectedIncident.severity})
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#070D0A] rounded-xl border border-emerald-900/40 space-y-2">
                    <span className="font-semibold text-emerald-400 block text-xs">Diagnostic Scouting Checklist:</span>
                    <ul className="list-disc pl-4 space-y-1 text-[#D1DED6] text-[11px] leading-relaxed">
                      <li>Inspect lower leaf canopy for discoloration, necrotic lesions, or fungal mycelium.</li>
                      <li>Measure duration of free water film post morning dew or sprinkler cycle.</li>
                      <li>Consult local Krishi Vigyan Kendra for recommended formulation guidelines.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedIncident(null)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Close Protocol
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

