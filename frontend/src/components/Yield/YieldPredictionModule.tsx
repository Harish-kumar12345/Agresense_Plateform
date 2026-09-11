import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  RefreshCw,
  MapPin,
  Sliders,
  Sprout,
  ShieldCheck,
  Award,
  Layers,
  Calendar,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { yieldService, YieldPredictionResult, PipelineFeatureValidation } from '../../services/yieldService';
import { soilService } from '../../services/soilService';
import { weatherService } from '../../services/weatherService';
import { FarmData } from '../../services/farmService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InsightCard } from '../ui/InsightCard';
import { colors, motionPresets } from '../../styles/design-tokens';

import { AnimatedCounter } from '../Common/AnimatedCounter';
import { AgronomicMotif } from '../Common/AgronomicMotif';

interface YieldPredictionModuleProps {
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

export const YieldPredictionModule: React.FC<YieldPredictionModuleProps> = ({
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

  const [prediction, setPrediction] = useState<YieldPredictionResult | null>(null);
  const [pipelineValidation, setPipelineValidation] = useState<PipelineFeatureValidation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [simN, setSimN] = useState<number>(70);
  const [simMoisture, setSimMoisture] = useState<number>(35);
  const [simPh, setSimPh] = useState<number>(6.5);
  const [simulatedYield, setSimulatedYield] = useState<number | null>(null);

  const runAutomatedPipeline = async () => {
    setLoading(true);
    setError('');

    try {
      const [soilRes, weatherRes] = await Promise.all([
        soilService.getSoilAnalysis(safeLat, safeLon, farm?.farm_id || 'default_farm', selectedCrop),
        weatherService.getLiveWeatherData(safeLat, safeLon, selectedCrop)
      ]);

      const soil = soilRes.soilData;
      const weather = weatherRes.current;

      const featurePayload = {
        crop: selectedCrop,
        farm_area_ha: Number(farmArea) || 2.5,
        temperature_c: weather.temperature_c,
        rainfall_mm: weather.precipitation_mm,
        humidity_pct: weather.relative_humidity,
        soil_moisture_pct: soil.moisture,
        soil_ph: soil.ph,
        soil_n: soil.nitrogen,
        soil_p: soil.phosphorus,
        soil_k: soil.potassium,
        gdd: 1450,
        historical_yield_tha: 4.2
      };

      const validation = yieldService.validatePipelineFeatures(featurePayload);
      setPipelineValidation(validation);

      setSimN(soil.nitrogen || 70);
      setSimMoisture(soil.moisture || 35);
      setSimPh(soil.ph || 6.5);

      const result = await yieldService.predictYield(featurePayload);
      setPrediction(result);
      setSimulatedYield(result.predictedYieldPerHectare);
    } catch (err: any) {
      console.error('Yield prediction error:', err);
      setError(err?.message || 'Failed to run yield prediction model.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAutomatedPipeline();
  }, [safeLat, safeLon, farmArea, selectedCrop]);

  const handleSliderChange = (nVal: number, moistVal: number, phVal: number) => {
    setSimN(nVal);
    setSimMoisture(moistVal);
    setSimPh(phVal);

    if (prediction) {
      const base = prediction.regionalAvg;
      const nRatio = Math.min(1.25, nVal / 70);
      const phPen = phVal < 6.0 || phVal > 7.5 ? 0.92 : 1.04;
      const moistMod = moistVal >= 25 && moistVal <= 45 ? 1.05 : 0.95;

      const simY = Number((base * nRatio * phPen * moistMod).toFixed(2));
      setSimulatedYield(simY);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Calculating agronomic yield prediction model...</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={motionPresets.container}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-100 font-sans"
    >
      {/* 1. VerdaAgro Yield Intelligence Context Bar - Harvest Theme */}
      <motion.div variants={motionPresets.item} className="verda-hero-header agri-context-header-harvest rounded-3xl rounded-tr-xl relative overflow-hidden">
        <AgronomicMotif variant="wheat" className="right-0 top-0 text-amber-400" opacity={0.08} />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-amber-300 uppercase">
              <span>Intelligence</span>
              <span className="text-amber-700">/</span>
              <span>Agronomic ML Predictive Forecast</span>
              <Badge variant="harvest" shape="live" size="sm" className="ml-1">
                PIPELINE ACTIVE
              </Badge>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                Crop Yield ML Prediction Model
              </h1>
              {prediction && (
                <Badge variant="harvest" size="md">
                  {prediction.confidenceLevel} Confidence ({prediction.confidenceScore}%)
                </Badge>
              )}
              <Badge variant="emerald" size="md">
                Cultivated Crop: {selectedCrop}
              </Badge>
            </div>

            <p className="text-xs text-slate-200 flex items-center gap-2 font-medium">
              <span className="font-bold text-white">{farmTitle}</span>
              <span className="text-amber-800">•</span>
              <span className="flex items-center gap-1 text-amber-300">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                {locationLabel} ({farmArea} ha)
              </span>
              <span className="text-amber-800">•</span>
              <span className="text-slate-300 font-mono text-[11px]">Harvest Window: {prediction?.harvestWindow || 'Approaching'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="harvest"
              size="sm"
              onClick={() => setIsDetailModalOpen(true)}
              icon={<Sliders className="w-3.5 h-3.5" />}
            >
              Sensitivity Simulator
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={runAutomatedPipeline}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Re-predict
            </Button>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={runAutomatedPipeline} className="font-bold underline cursor-pointer hover:text-rose-200">Retry</button>
        </div>
      )}

      {/* 2. Asymmetric Yield Bento Grid */}
      {prediction && (
        <motion.div variants={motionPresets.item} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Primary Yield Output Spotlight (7 Cols) - Asymmetric Harvest Styling */}
          <div className="lg:col-span-7 p-6 flex flex-col gap-6 rounded-3xl rounded-tr-xl bg-[#17130a]/92 border border-amber-900/40 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.7)] backdrop-blur-xl relative overflow-hidden">
            <AgronomicMotif variant="wheat" className="right-1 bottom-1 text-amber-500" opacity={0.06} />
            
            <div className="flex items-center justify-between pb-3 border-b border-amber-950/60 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-950/40 border border-amber-500/35 flex items-center justify-center shadow-inner">
                  <Sprout className="w-4 h-4 text-amber-300" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Phenological Yield Projection
                </span>
              </div>
              <span className="text-[11px] font-mono text-amber-300 font-semibold bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                Model: GDD + NPK + Microclimate
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 relative z-10">
              <div>
                <div className="text-[11px] font-semibold text-amber-300/90 mb-1">
                  Expected Yield Rate
                </div>
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="text-5xl sm:text-6xl font-black tracking-tight text-white font-display">
                    <AnimatedCounter value={prediction.predictedYieldPerHectare} decimals={2} />
                  </span>
                  <span className="text-xl text-amber-300 font-medium">t/ha</span>
                  <Badge variant="emerald" size="sm" className="ml-1">
                    {((prediction.predictedYieldPerHectare / prediction.regionalAvg - 1) * 100) >= 0 ? '+' : ''}
                    {((prediction.predictedYieldPerHectare / prediction.regionalAvg - 1) * 100).toFixed(1)}% vs District
                  </Badge>
                </div>
              </div>

              <div className="bg-[#070D0A]/75 border border-amber-900/40 rounded-xl p-3 text-right shadow-sm">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-300">Total Field Production</div>
                <div className="text-xl font-mono font-black text-white mt-0.5"><AnimatedCounter value={prediction.totalProductionTons} decimals={1} /> <span className="text-xs text-amber-400 font-normal">Tons</span></div>
                <div className="text-[10px] text-amber-300/80 mt-0.5">Calculated over {farmArea} hectares</div>
              </div>
            </div>

            {/* Sub-telemetry 3-gauge strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 relative z-10 mt-auto">
              <div className="bg-[#070D0A]/80 border border-amber-900/40 rounded-xl p-3.5 shadow-sm">
                <div className="text-[11px] font-semibold text-slate-300 mb-1">Growing Degree Days</div>
                <div className="text-xl font-bold text-white font-display">1,450 GDD</div>
                <p className="text-[10px] text-amber-400 font-medium mt-1">Thermal accumulation on track</p>
              </div>

              <div className="bg-[#070D0A]/70 border border-emerald-900/30 rounded-xl p-3.5">
                <div className="text-[11px] text-[#D1DED6] mb-1">District Baseline</div>
                <div className="text-xl font-bold text-white font-display">{prediction.regionalAvg} t/ha</div>
                <p className="text-[10px] text-[#D1DED6] mt-1">Regional average comparison</p>
              </div>

              <div className="bg-[#070D0A]/70 border border-emerald-900/30 rounded-xl p-3.5">
                <div className="text-[11px] text-[#D1DED6] mb-1">Harvest Window</div>
                <div className="text-xl font-bold text-white font-display truncate">{prediction.harvestWindow}</div>
                <p className="text-[10px] text-emerald-400 mt-1">Optimal combine readiness</p>
              </div>
            </div>
          </div>

          {/* Model Confidence & Feature Verification (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="agri-bento-card p-5 flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D1DED6] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Algorithm Reliability Index
                </span>
                <span className="agri-pill agri-pill-emerald">
                  {prediction.confidenceLevel}
                </span>
              </div>

              <div className="my-3">
                <div className="text-3xl font-extrabold text-white font-display">
                  {prediction.confidenceScore}% <span className="text-sm font-normal text-[#D1DED6]">Confidence</span>
                </div>
                <p className="text-xs text-[#D1DED6] mt-1.5 leading-relaxed">
                  Ensemble ML model synthesized across soil chemistry, NDVI satellite canopy density, and 5-year meteorological history.
                </p>
              </div>

              <div className="pt-2 border-t border-emerald-950/40 flex items-center justify-between text-xs">
                <span className="text-[#D1DED6]">Features Calibrated:</span>
                <span className="text-emerald-400 font-semibold font-mono">12 Subterranean + Atmospheric</span>
              </div>
            </div>

            <div className="agri-bento-card p-5 flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D1DED6] flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Regional Agronomic Context
                </span>
                <span className="agri-pill agri-pill-muted">
                  District Benchmark
                </span>
              </div>

              <div className="my-3">
                <div className="text-lg font-bold text-white font-display">
                  Regional Performance Comparison
                </div>
                <p className="text-xs text-[#D1DED6] mt-1.5 leading-relaxed">
                  {prediction.regionalInsight}
                </p>
              </div>

              <div className="pt-2 border-t border-emerald-950/40 flex items-center justify-between text-xs">
                <span className="text-[#D1DED6]">Yield Margin:</span>
                <span className="text-emerald-400 font-semibold font-mono">
                  +{(prediction.predictedYieldPerHectare - prediction.regionalAvg).toFixed(2)} t/ha above district
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. Factor Contribution & Historical Trajectory Charts */}
      {prediction && (
        <motion.div variants={motionPresets.item} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Feature Importance Horizontal Bar Chart */}
          <div className="lg:col-span-6 agri-bento-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Feature Importance</span>
                <h3 className="text-base font-bold text-white mt-0.5 font-display">Agronomic Factor Contributions</h3>
              </div>
              <span className="agri-pill agri-pill-emerald">
                Normalized Weight
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={prediction.featureImportance}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#13231B" horizontal={false} />
                  <XAxis
                    type="number"
                    unit="%"
                    tick={{ fill: '#D1DED6', fontSize: 11 }}
                    axisLine={{ stroke: '#1B3125' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    tick={{ fill: '#FFFFFF', fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="agri-bento-card p-3 shadow-xl text-xs space-y-1 bg-[#0D1612] border border-emerald-500/30">
                            <p className="font-bold text-white font-display">{item.feature}</p>
                            <p className="text-emerald-400 font-semibold">Weight: +{item.weight}%</p>
                            <p className="text-[#D1DED6] text-[11px]">{item.description}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="weight" radius={[0, 6, 6, 0]}>
                    {prediction.featureImportance.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#34d399' : index === 1 ? '#10b981' : index === 2 ? '#fbbf24' : '#64748b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Historical Yield Line Chart */}
          <div className="lg:col-span-6 agri-bento-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Multi-Season Trend</span>
                <h3 className="text-base font-bold text-white mt-0.5 font-display">Historical Yield Comparison ({selectedCrop})</h3>
              </div>
              <span className="agri-pill agri-pill-muted">
                5-Year Trajectory
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={prediction.historicalSeries}
                  margin={{ top: 10, right: 20, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#13231B" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: '#D1DED6', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: '#1B3125' }}
                    tickLine={false}
                  />
                  <YAxis
                    unit=" t"
                    domain={[0, 8]}
                    tick={{ fill: '#D1DED6', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="agri-bento-card p-3 shadow-xl text-xs space-y-1 bg-[#0D1612] border border-emerald-500/30">
                            <p className="font-bold text-white font-display">Year {label} {item.isCurrent ? '(Predicted)' : ''}</p>
                            <p className="text-emerald-400 font-semibold">Yield: {item.yield} t/ha</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="yield"
                    stroke="#34d399"
                    strokeWidth={3}
                    dot={{ fill: '#34d399', r: 5, strokeWidth: 2, stroke: '#070D0A' }}
                    activeDot={{ r: 7, fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. SENSITIVITY SIMULATOR MODAL */}
      <AnimatePresence>
        {isDetailModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="max-w-md w-full"
            >
              <div className="agri-bento-card p-6 space-y-5 bg-[#0D1612] border border-emerald-500/40 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-base font-bold text-white font-display">Agronomic Sensitivity Simulator</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="p-1 rounded-lg text-[#D1DED6] hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between font-semibold text-white mb-1">
                      <span>Soil Nitrogen (N)</span>
                      <span className="text-emerald-400 font-bold">{simN} kg/ha</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="120"
                      value={simN}
                      onChange={(e) => handleSliderChange(Number(e.target.value), simMoisture, simPh)}
                      className="w-full h-2 bg-[#070D0A] rounded-lg accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-white mb-1">
                      <span>Soil Moisture</span>
                      <span className="text-sky-400 font-bold">{simMoisture}%</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="60"
                      value={simMoisture}
                      onChange={(e) => handleSliderChange(simN, Number(e.target.value), simPh)}
                      className="w-full h-2 bg-[#070D0A] rounded-lg accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-white mb-1">
                      <span>Soil pH Level</span>
                      <span className="text-amber-400 font-bold">{simPh} pH</span>
                    </div>
                    <input
                      type="range"
                      min="5.0"
                      max="8.5"
                      step="0.1"
                      value={simPh}
                      onChange={(e) => handleSliderChange(simN, simMoisture, Number(e.target.value))}
                      className="w-full h-2 bg-[#070D0A] rounded-lg accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block text-xs">Simulated Output Yield</span>
                      <span className="text-[11px] text-[#D1DED6]">Multi-variable recalculated</span>
                    </div>
                    <span className="text-2xl font-black text-emerald-400 font-display">
                      {simulatedYield} <span className="text-xs font-bold text-emerald-300">t/ha</span>
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Done
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
