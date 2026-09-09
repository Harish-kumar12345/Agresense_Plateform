import React, { useState, useEffect } from 'react';
import {
  Tractor,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  RefreshCw,
  MapPin,
  Sprout,
  Users,
  Warehouse,
  Sliders,
  CheckSquare,
  Square,
  X,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import {
  farmActivityService,
  FarmActivity,
  ActivityType,
  HarvestStatus,
  HarvestAlert
} from '../../services/farmActivityService';
import { yieldService, YieldPredictionResult } from '../../services/yieldService';
import { soilService } from '../../services/soilService';
import { weatherService } from '../../services/weatherService';
import { FarmData } from '../../services/farmService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InsightCard } from '../ui/InsightCard';
import { colors, motionPresets } from '../../styles/design-tokens';

interface HarvestManagementModuleProps {
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

export const HarvestManagementModule: React.FC<HarvestManagementModuleProps> = ({
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
  const farmName = farm?.farm_name || 'Green Valley Rice Farm';
  const locationLabel = farm?.location_name || (location?.city ? `${location.city}, India` : 'Ghaziabad, Uttar Pradesh');

  const [activeSegment, setActiveSegment] = useState<'harvest' | 'planning' | 'timeline' | 'alerts'>('harvest');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [weatherTelemetry, setWeatherTelemetry] = useState({ temperature_c: 28, precipitation_mm: 12, humidity_pct: 75 });
  const [yieldResult, setYieldResult] = useState<YieldPredictionResult | null>(null);
  const [activities, setActivities] = useState<FarmActivity[]>([]);
  const [alerts, setAlerts] = useState<HarvestAlert[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');

  const [manualHarvestDate, setManualHarvestDate] = useState<string>('');
  const [isAdjustDateModalOpen, setIsAdjustDateModalOpen] = useState<boolean>(false);
  const [tempManualDate, setTempManualDate] = useState<string>('');

  const [labourWorkers, setLabourWorkers] = useState<number>(12);
  const [checklist, setChecklist] = useState<{ id: string; text: string; done: boolean }[]>([
    { id: 'c1', text: 'Book combine harvester / threshing machinery', done: true },
    { id: 'c2', text: 'Calibrate digital grain moisture meter', done: true },
    { id: 'c3', text: 'Sanitize & dry warehouse storage floor', done: false },
    { id: 'c4', text: 'Procure 50kg HDPE/gunny bags', done: false },
    { id: 'c5', text: 'Arrange local mandi transport vehicle', done: false }
  ]);

  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingActivity, setEditingActivity] = useState<FarmActivity | null>(null);

  const [formData, setFormData] = useState({
    field_name: farmName,
    crop: selectedCrop,
    activity_type: 'Sowing' as ActivityType,
    date: new Date().toISOString().split('T')[0],
    quantity_details: '',
    notes: ''
  });

  const [computedStatus, setComputedStatus] = useState<{
    growthStage: string;
    expectedHarvestDate: string;
    manualHarvestDate: string | null;
    harvestWindow: string;
    status: HarvestStatus;
    daysToHarvest: number;
    gddAccumulated: number;
    gddThreshold: number;
    gddPercentage: number;
    requiredLabour: number;
    storageRequirementSqft: number;
    storageBagsCount: number;
    storageMoistureTargetPct: number;
    totalProductionTons: number;
  }>({
    growthStage: 'Ripening & Grain Filling',
    expectedHarvestDate: 'Nov 5, 2026',
    manualHarvestDate: null,
    harvestWindow: 'Oct 28 - Nov 10, 2026',
    status: 'Approaching',
    daysToHarvest: 18,
    gddAccumulated: 1450,
    gddThreshold: 1600,
    gddPercentage: 85,
    requiredLabour: 12,
    storageRequirementSqft: 180,
    storageBagsCount: 240,
    storageMoistureTargetPct: 13.5,
    totalProductionTons: 12.0
  });

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [acts, alrs] = await Promise.all([
        farmActivityService.getActivities(farm?.farm_id),
        farmActivityService.getHarvestAlerts(farm?.farm_id)
      ]);
      setActivities(acts);
      setAlerts(alrs);

      let wTemp = 28;
      try {
        const weather = await weatherService.getLiveWeatherData(safeLat, safeLon, selectedCrop);
        wTemp = weather.current.temperature_c;
        setWeatherTelemetry({
          temperature_c: weather.current.temperature_c,
          precipitation_mm: weather.current.precipitation_mm,
          humidity_pct: weather.current.relative_humidity
        });
      } catch (err) {}

      try {
        const soil = await soilService.getSoilAnalysis(safeLat, safeLon, farm?.farm_id, selectedCrop);
        const yPred = await yieldService.predictYield({
          crop: selectedCrop,
          farm_area_ha: Number(farmArea) || 2.5,
          temperature_c: wTemp,
          rainfall_mm: 15,
          humidity_pct: 70,
          soil_moisture_pct: soil.soilData.moisture,
          soil_ph: soil.soilData.ph,
          soil_n: soil.soilData.nitrogen,
          soil_p: soil.soilData.phosphorus,
          soil_k: soil.soilData.potassium,
          gdd: 1450,
          historical_yield_tha: 4.2
        });
        setYieldResult(yPred);
      } catch (err) {}

      const statusInfo = farmActivityService.calculateHarvestReadiness(
        selectedCrop,
        farmArea,
        wTemp,
        manualHarvestDate || undefined
      );
      setComputedStatus(statusInfo);
      setLabourWorkers(statusInfo.requiredLabour);
    } catch (err: any) {
      console.error('Harvest module error:', err);
      setError('Failed to calculate harvest plan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [safeLat, safeLon, farmArea, selectedCrop]);

  const handleSaveManualDate = () => {
    setManualHarvestDate(tempManualDate);
    setIsAdjustDateModalOpen(false);

    try {
      const statusInfo = farmActivityService.calculateHarvestReadiness(
        selectedCrop,
        farmArea,
        weatherTelemetry.temperature_c,
        tempManualDate
      );
      setComputedStatus(statusInfo);
    } catch (e) {}
  };

  const handleToggleChecklist = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const handleOpenAddModal = () => {
    setEditingActivity(null);
    setFormData({
      field_name: farmName,
      crop: selectedCrop,
      activity_type: 'Sowing',
      date: new Date().toISOString().split('T')[0],
      quantity_details: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.crop || !formData.activity_type) return;

    try {
      if (editingActivity) {
        const updated = await farmActivityService.updateActivity(editingActivity.activity_id, {
          field_name: formData.field_name,
          crop: formData.crop,
          activity_type: formData.activity_type,
          date: new Date(formData.date).toISOString(),
          quantity_details: formData.quantity_details,
          notes: formData.notes
        });
        setActivities(prev => prev.map(a => a.activity_id === updated.activity_id ? updated : a));
      } else {
        const added = await farmActivityService.addActivity({
          farm_id: farm?.farm_id || 'farm_demo_1',
          field_name: formData.field_name,
          crop: formData.crop,
          activity_type: formData.activity_type,
          date: new Date(formData.date).toISOString(),
          quantity_details: formData.quantity_details,
          notes: formData.notes
        });
        setActivities(prev => [added, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Failed to save activity');
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await farmActivityService.deleteActivity(activityId);
      setActivities(prev => prev.filter(a => a.activity_id !== activityId));
    } catch (err) {}
  };

  // Sample monthly harvest distribution data
  const harvestProjectionData = [
    { stage: 'Sowing', progress: 100, label: 'Completed' },
    { stage: 'Tillering', progress: 100, label: 'Completed' },
    { stage: 'Flowering', progress: 100, label: 'Completed' },
    { stage: 'Grain Fill', progress: computedStatus.gddPercentage >= 75 ? 100 : 70, label: 'Current' },
    { stage: 'Harvest', progress: computedStatus.gddPercentage >= 95 ? 100 : Math.max(0, computedStatus.gddPercentage - 75) * 5, label: 'Upcoming' }
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Loading harvest schedule & planning telemetry...</p>
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
      {/* 1. VerdaAgro Harvest Logistics Context Bar */}
      <motion.div variants={motionPresets.item} className="verda-hero-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
              <span>Operations</span>
              <span className="text-emerald-700">/</span>
              <span>Harvest Maturation & Post-Harvest Logistics</span>
              <span className="verda-glow-pill ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                MATURATION ACTIVE
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                <span className="verda-gradient-title">Harvest Logistics</span> & Operations
              </h1>
              <span className="agri-pill agri-pill-emerald">
                {computedStatus.status}
              </span>
              <span className="agri-pill agri-pill-muted">
                Host Crop: {selectedCrop}
              </span>
            </div>

            <p className="text-xs text-[#D1DED6] flex items-center gap-2 font-normal">
              <span className="font-semibold text-white">{farmName}</span>
              <span className="text-emerald-800">•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {locationLabel} ({farmArea} ha)
              </span>
              <span className="text-emerald-800">•</span>
              <span className="text-slate-300 font-mono text-[11px]">Days to Harvest: <strong className="text-emerald-400">{computedStatus.daysToHarvest}d remaining</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setTempManualDate(manualHarvestDate || new Date().toISOString().split('T')[0]);
                setIsAdjustDateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              Adjust Date
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Activity
            </button>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#070D0A]/70 hover:bg-emerald-950/40 border border-emerald-900/40 text-[#D1DED6] text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              Refresh
            </button>
          </div>
        </div>
      </motion.div>

      {/* 2. Asymmetric Harvest Operations Bento Grid */}
      <motion.div variants={motionPresets.item} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Primary Maturation Readiness Desk (7 Cols) */}
        <div className="lg:col-span-7 agri-bento-card agri-photo-card agri-photo-card-harvest p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#D1DED6]">
                Target Harvest Maturation Window
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-medium">
              GDD: {computedStatus.gddPercentage}% Maturation
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/80 mb-1">
                Estimated Combine Readiness
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-display">
                  {computedStatus.manualHarvestDate ? computedStatus.manualHarvestDate : computedStatus.expectedHarvestDate}
                </span>
                <span className="agri-pill agri-pill-emerald ml-2">
                  {computedStatus.daysToHarvest}d Remaining
                </span>
              </div>
              <p className="text-xs text-[#D1DED6] mt-2">
                Recommended Window: <strong className="text-white">{computedStatus.harvestWindow}</strong>
              </p>
            </div>

            <div className="bg-[#070D0A]/60 border border-emerald-900/30 rounded-xl p-3 text-right">
              <div className="text-[10px] uppercase tracking-wider text-[#D1DED6]/70">Target Grain Moisture</div>
              <div className="text-xl font-mono font-bold text-white mt-0.5">{computedStatus.storageMoistureTargetPct}% <span className="text-xs text-emerald-400 font-normal">RH</span></div>
              <div className="text-[10px] text-[#D1DED6] mt-0.5">Safe moisture for storage</div>
            </div>
          </div>

          {/* Sub-telemetry 3-gauge strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-[#070D0A]/70 border border-emerald-900/30 rounded-xl p-3.5">
              <div className="text-[11px] text-[#D1DED6] mb-1">Phenological Stage</div>
              <div className="text-base font-bold text-white font-display truncate">{computedStatus.growthStage}</div>
              <p className="text-[10px] text-emerald-400 mt-1">Starch filling optimal</p>
            </div>

            <div className="bg-[#070D0A]/70 border border-emerald-900/30 rounded-xl p-3.5">
              <div className="text-[11px] text-[#D1DED6] mb-1">Thermal Units</div>
              <div className="text-base font-bold text-white font-display">{computedStatus.gddAccumulated} / {computedStatus.gddThreshold}</div>
              <p className="text-[10px] text-emerald-400 mt-1">Growing Degree Days</p>
            </div>

            <div className="bg-[#070D0A]/70 border border-emerald-900/30 rounded-xl p-3.5">
              <div className="text-[11px] text-[#D1DED6] mb-1">Harvest Window</div>
              <div className="text-base font-bold text-white font-display truncate">{computedStatus.harvestWindow.split('-')[0]}</div>
              <p className="text-[10px] text-emerald-400 mt-1">Weather clear forecast</p>
            </div>
          </div>
        </div>

        {/* Logistics & Post-Harvest Storage Desk (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          <div className="agri-bento-card p-5 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#D1DED6] flex items-center gap-1.5">
                <Tractor className="w-4 h-4 text-emerald-400" />
                Expected Bulk Output
              </span>
              <span className="agri-pill agri-pill-emerald">
                {yieldResult ? yieldResult.totalProductionTons : 12.0} Tons
              </span>
            </div>

            <div className="my-3">
              <div className="text-2xl font-extrabold text-white font-display">
                {computedStatus.storageBagsCount} <span className="text-sm font-normal text-[#D1DED6]">Standard 50kg Bags</span>
              </div>
              <p className="text-xs text-[#D1DED6] mt-1.5 leading-relaxed">
                Requires approximately <strong className="text-white">{computedStatus.storageRequirementSqft} sq.ft</strong> of moisture-proof palletized warehouse space.
              </p>
            </div>

            <div className="pt-2 border-t border-emerald-950/40 flex items-center justify-between text-xs">
              <span className="text-[#D1DED6]">Grain Bagging Spec:</span>
              <span className="text-emerald-400 font-semibold font-mono">50kg HDPE / Jute</span>
            </div>
          </div>

          <div className="agri-bento-card p-5 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#D1DED6] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                Workforce & Machinery
              </span>
              <span className="agri-pill agri-pill-muted">
                {computedStatus.requiredLabour} Workers Required
              </span>
            </div>

            <div className="my-3">
              <div className="text-lg font-bold text-white font-display">
                Harvest Field Operations Plan
              </div>
              <p className="text-xs text-[#D1DED6] mt-1.5 leading-relaxed">
                Combine harvester + 2 tractor trolleys required for rapid transit from field partition to storage shed.
              </p>
            </div>

            <div className="pt-2 border-t border-emerald-950/40 flex items-center justify-between text-xs">
              <span className="text-[#D1DED6]">Checklist Readiness:</span>
              <span className="text-emerald-400 font-semibold font-mono">
                {checklist.filter(c => c.done).length} / {checklist.length} Completed
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Segment Controls */}
      <div className="flex items-center gap-1.5 bg-[#0D1612] border border-emerald-900/40 p-1.5 rounded-xl w-fit">
        {[
          { key: 'harvest', label: 'Harvest Schedule' },
          { key: 'planning', label: 'Labour & Storage' },
          { key: 'timeline', label: `Activity Log (${activities.length})` },
          { key: 'alerts', label: `Alerts (${alerts.length})` }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveSegment(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSegment === tab.key
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-[#D1DED6] hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SEGMENT 1: HARVEST SCHEDULE */}
      {activeSegment === 'harvest' && (
        <div className="agri-bento-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white font-display">Growth Stage Timeline & GDD Maturation</h3>
              <p className="text-xs text-slate-400">Cumulative Thermal Unit Tracking</p>
            </div>
            <Badge variant="emerald" size="md">
              GDD Progress: {computedStatus.gddPercentage}%
            </Badge>
          </div>

          {/* Simple Progress Bar */}
          <div className="space-y-3">
            <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 shadow-xs"
                style={{ width: `${computedStatus.gddPercentage}%` }}
              />
            </div>

            <div className="grid grid-cols-5 text-center text-xs font-semibold text-slate-400">
              <span className={computedStatus.gddPercentage >= 10 ? 'text-emerald-400 font-bold' : ''}>Sowing</span>
              <span className={computedStatus.gddPercentage >= 30 ? 'text-emerald-400 font-bold' : ''}>Tillering</span>
              <span className={computedStatus.gddPercentage >= 55 ? 'text-emerald-400 font-bold' : ''}>Flowering</span>
              <span className={computedStatus.gddPercentage >= 75 ? 'text-emerald-400 font-bold' : ''}>Grain Filling</span>
              <span className={computedStatus.gddPercentage >= 90 ? 'text-amber-400 font-bold' : ''}>Harvest Ready</span>
            </div>
          </div>

          {/* Harvest Stage Bar Chart */}
          <div className="pt-4 border-t border-white/10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">Phenological Phase Progression</h4>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={harvestProjectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="stage" tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis unit="%" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="saas-card p-3 shadow-xl border border-white/15 text-xs bg-slate-900/95 backdrop-blur-md">
                            <p className="font-bold text-white">{item.stage}</p>
                            <p className="text-emerald-400 font-semibold">{item.label} ({item.progress}%)</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="progress" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {harvestProjectionData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.progress >= 100 ? '#10b981' : entry.progress > 0 ? '#f59e0b' : '#475569'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-300">Target Moisture Threshold: <strong className="text-emerald-400">{computedStatus.storageMoistureTargetPct}%</strong></span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStrategyModalOpen(true)}
              className="border-white/10 text-slate-200 hover:bg-white/5"
            >
              View Harvest Strategy →
            </Button>
          </div>
        </div>
      )}

      {/* SEGMENT 2: LABOUR & STORAGE */}
      {activeSegment === 'planning' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Labour Planning */}
          <Card variant="elevated" className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Users className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white font-display">Labour & Machinery Requirements</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-300">Estimated Field Workforce:</span>
                <span className="font-bold text-white">{labourWorkers} Workers</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/10">
                <span className="text-slate-300">Plot Workload Density:</span>
                <span className="font-semibold text-slate-200">~{(labourWorkers / farmArea).toFixed(1)} workers / hectare</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/10">
                <span className="text-slate-300">Recommended Machinery:</span>
                <Badge variant="emerald" size="sm">Combine Harvester (Dry soil)</Badge>
              </div>
            </div>
          </Card>

          {/* Storage Planning */}
          <Card variant="elevated" className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Warehouse className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white font-display">Storage & Post-Harvest Logistics</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-300">Warehouse Space Needed:</span>
                <span className="font-bold text-white">{computedStatus.storageRequirementSqft} sq ft</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/10">
                <span className="text-slate-300">Bag Capacity (50kg):</span>
                <span className="font-semibold text-slate-200">{computedStatus.storageBagsCount} Bags</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/10">
                <span className="text-slate-300">Target Moisture Threshold:</span>
                <span className="font-bold text-emerald-400">{computedStatus.storageMoistureTargetPct}%</span>
              </div>
            </div>
          </Card>

          {/* Checklist */}
          <Card variant="elevated" className="p-6 space-y-3 md:col-span-2">
            <h3 className="text-base font-bold text-white pb-2 border-b border-white/10 font-display">Pre-Harvest Readiness Checklist</h3>
            <div className="space-y-2.5">
              {checklist.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleToggleChecklist(item.id)}
                  className="flex items-center gap-3 cursor-pointer text-xs p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
                >
                  {item.done ? <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0" /> : <Square className="w-5 h-5 text-slate-500 shrink-0" />}
                  <span className={item.done ? 'line-through text-slate-500 font-medium' : 'text-slate-200 font-semibold'}>{item.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* SEGMENT 3: ACTIVITY LOG TABLE */}
      {activeSegment === 'timeline' && (
        <Card variant="elevated" className="overflow-hidden space-y-0">
          <div className="p-4 bg-slate-900/80 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recorded Field Activities</span>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleOpenAddModal}
            >
              Log New Activity
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-white/10 text-slate-400 font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Activity Type</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activities.map((act) => (
                  <tr key={act.activity_id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-400">
                      {new Date(act.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      <Badge variant="slate" size="sm">
                        {act.activity_type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-200">{act.quantity_details || '—'}</td>
                    <td className="py-3 px-4 text-slate-400">{act.notes || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteActivity(act.activity_id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* SEGMENT 4: ALERTS */}
      {activeSegment === 'alerts' && (
        <Card variant="elevated" className="p-6 space-y-4">
          <h3 className="text-base font-bold text-white pb-2 border-b border-white/10 font-display">Harvest Reminders & Alerts</h3>
          <div className="space-y-2.5">
            {alerts.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8">No active harvest alerts.</div>
            ) : (
              alerts.map((alr) => (
                <div key={alr.id} className="p-3.5 bg-slate-900/60 border border-white/10 rounded-xl text-xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-white">{alr.title}</span>
                    <p className="text-slate-400">{alr.description}</p>
                  </div>
                  <Badge variant={alr.severity === 'Critical' ? 'rose' : 'amber'} size="sm">
                    {alr.severity}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* MODAL: ADJUST HARVEST DATE */}
      <AnimatePresence>
        {isAdjustDateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="max-w-sm w-full"
            >
              <Card variant="elevated" className="p-6 space-y-4 bg-slate-900/95 border-white/15">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white font-display">Adjust Planned Harvest Date</h3>
                  <button type="button" onClick={() => setIsAdjustDateModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Select Planned Date</label>
                    <input
                      type="date"
                      value={tempManualDate}
                      onChange={(e) => setTempManualDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-white font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-white/10 rounded-xl text-slate-300 text-xs">
                    AI Estimated Optimal: <strong className="text-emerald-400">{computedStatus.expectedHarvestDate}</strong>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAdjustDateModalOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveManualDate}
                    >
                      Save Planned Date
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD ACTIVITY */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="max-w-md w-full"
            >
              <Card variant="elevated" className="p-6 space-y-4 bg-slate-900/95 border-white/15">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white font-display">Log Farm Activity</h3>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveActivity} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Activity Type</label>
                    <select
                      value={formData.activity_type}
                      onChange={(e) => setFormData({ ...formData, activity_type: e.target.value as ActivityType })}
                      className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-white font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    >
                      <option value="Sowing" className="bg-slate-900 text-white">Sowing</option>
                      <option value="Irrigation" className="bg-slate-900 text-white">Irrigation</option>
                      <option value="Fertilization" className="bg-slate-900 text-white">Fertilization</option>
                      <option value="Pesticide Application" className="bg-slate-900 text-white">Pesticide Application</option>
                      <option value="Weeding" className="bg-slate-900 text-white">Weeding</option>
                      <option value="Harvesting" className="bg-slate-900 text-white">Harvesting</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-white font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Details / Quantity</label>
                    <input
                      type="text"
                      placeholder="e.g. 50 kg Urea applied"
                      value={formData.quantity_details}
                      onChange={(e) => setFormData({ ...formData, quantity_details: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-white font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none placeholder:text-slate-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsModalOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                    >
                      Save Activity
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STRATEGY MODAL */}
      <AnimatePresence>
        {isStrategyModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="max-w-md w-full"
            >
              <Card variant="elevated" className="p-6 space-y-4 text-xs bg-slate-900/95 border-white/15">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white font-display">Harvest Strategy Recommendations</h3>
                  <button type="button" onClick={() => setIsStrategyModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-slate-300 leading-relaxed">
                  <p>Current GDD progress is <strong className="text-emerald-400">{computedStatus.gddPercentage}%</strong>. Field moisture is optimal for maturity.</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Stop flooding irrigation 10-14 days prior to harvest.</li>
                    <li>Calibrate grain moisture meters for target <strong className="text-emerald-400">{computedStatus.storageMoistureTargetPct}%</strong>.</li>
                    <li>Ensure warehouse floor drying before storage.</li>
                  </ul>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsStrategyModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
