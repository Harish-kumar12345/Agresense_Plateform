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
  CloudRain,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Thermometer,
  Gauge,
  Activity
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
  HarvestAlert,
  LiveHarvestPlan,
  PhenologicalStageProgress,
  CROP_HARVEST_SPECS
} from '../../services/farmActivityService';
import { yieldService, YieldPredictionResult } from '../../services/yieldService';
import { soilService } from '../../services/soilService';
import { weatherService } from '../../services/weatherService';
import { FarmData } from '../../services/farmService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AgronomicMotif } from '../Common/AgronomicMotif';
import { motionPresets } from '../../styles/design-tokens';
import { AnimatedCounter } from '../Common/AnimatedCounter';

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
  const farmArea = Number(farm?.area_hectares) || 2.5;
  const selectedCrop = farm?.crop || crop || 'Rice';
  const farmName = farm?.farm_name || 'AgriSense Model Field';
  const locationLabel = farm?.location_name || (location?.city ? `${location.city}, ${location.state || 'India'}` : 'Ghaziabad, Uttar Pradesh');

  const [activeSegment, setActiveSegment] = useState<'harvest' | 'planning' | 'timeline' | 'alerts'>('harvest');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [weatherTelemetry, setWeatherTelemetry] = useState<{
    temperature_c: number;
    precipitation_mm: number;
    humidity_pct: number;
    condition?: string;
    source?: string;
  }>({
    temperature_c: 28,
    precipitation_mm: 0,
    humidity_pct: 65,
    condition: 'Clear Sky',
    source: 'Open-Meteo'
  });

  const [yieldResult, setYieldResult] = useState<YieldPredictionResult | null>(null);
  const [activities, setActivities] = useState<FarmActivity[]>([]);
  const [alerts, setAlerts] = useState<HarvestAlert[]>([]);
  const [livePlan, setLivePlan] = useState<LiveHarvestPlan | null>(null);

  const [manualHarvestDate, setManualHarvestDate] = useState<string>('');
  const [isAdjustDateModalOpen, setIsAdjustDateModalOpen] = useState<boolean>(false);
  const [tempManualDate, setTempManualDate] = useState<string>('');

  const [checklist, setChecklist] = useState<{ id: string; text: string; done: boolean }[]>([]);
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
    machineryRecommendation: string;
    cropDurationDays?: number;
    varietyName?: string;
    isEstimatedDuration?: boolean;
    durationRange?: [number, number];
    baseHarvestDate?: string;
    netShiftDays?: number;
    adjustmentReasons?: string[];
    activityFlags?: {
      waterStress: boolean;
      nutrientRisk: boolean;
      pestDiseaseRisk: boolean;
      weedCompetitionRisk: boolean;
      environmentalStress: boolean;
    };
  }>({
    growthStage: 'Maturity Tracking',
    expectedHarvestDate: 'Calculating...',
    manualHarvestDate: null,
    harvestWindow: 'Calculating...',
    status: 'Not Ready',
    daysToHarvest: 0,
    gddAccumulated: 0,
    gddThreshold: 1600,
    gddPercentage: 0,
    requiredLabour: 5,
    storageRequirementSqft: 100,
    storageBagsCount: 100,
    storageMoistureTargetPct: 13.5,
    totalProductionTons: 0,
    machineryRecommendation: 'Combine Harvester',
    netShiftDays: 0,
    adjustmentReasons: []
  });

  // Dynamic checklist setup based on crop
  const initChecklistForCrop = (cropName: string) => {
    const spec = CROP_HARVEST_SPECS[cropName] || CROP_HARVEST_SPECS.Rice;
    const storageKey = `agrisense_harvest_checklist_${cropName.toLowerCase()}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setChecklist(JSON.parse(saved));
        return;
      } catch (e) {}
    }

    const defaultItems = (spec.checklist || [
      'Calibrate digital grain moisture meter',
      'Inspect field maturity and crop standing',
      'Sanitize & dry storage floor',
      'Procure packing bags / storage crates',
      'Coordinate mandi transit logistics'
    ]).map((text, idx) => ({
      id: `c_${idx + 1}`,
      text,
      done: idx === 0
    }));

    setChecklist(defaultItems);
  };

  const handleToggleChecklist = (id: string) => {
    setChecklist(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, done: !item.done } : item);
      localStorage.setItem(`agrisense_harvest_checklist_${selectedCrop.toLowerCase()}`, JSON.stringify(updated));
      return updated;
    });
  };

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Fetch activities and previously saved harvest record
      const [acts, harvestRecs] = await Promise.all([
        farmActivityService.getActivities(farm?.farm_id, selectedCrop),
        farmActivityService.getHarvestRecords(farm?.farm_id, selectedCrop)
      ]);
      setActivities(acts);

      // Check if user previously saved a planned date
      const savedRec = harvestRecs && harvestRecs.length > 0 ? harvestRecs[0] : null;
      const effectiveManualDate = manualHarvestDate || (savedRec?.manual_harvest_date ? new Date(savedRec.manual_harvest_date).toISOString().split('T')[0] : '');
      if (effectiveManualDate && !manualHarvestDate) {
        setManualHarvestDate(effectiveManualDate);
      }

      // 2. Look for real Sowing date in logged activities
      const sowingAct = acts.find(a => a.activity_type === 'Sowing');
      const actualSowingDate = sowingAct?.date || undefined;
      const sowingVarietyOrNotes = sowingAct ? `${sowingAct.quantity_details || ''} ${sowingAct.notes || ''}`.trim() : '';

      // 3. Fetch live weather telemetry from Open-Meteo
      let liveTemp = 28;
      let livePrecip = 0;
      let liveHum = 65;
      let liveCondition = 'Clear Sky';

      try {
        const weather = await weatherService.getLiveWeatherData(safeLat, safeLon, selectedCrop);
        if (weather?.current) {
          liveTemp = weather.current.temperature_c;
          livePrecip = weather.current.precipitation_mm;
          liveHum = weather.current.relative_humidity;
          liveCondition = weather.current.condition || 'Clear Sky';

          setWeatherTelemetry({
            temperature_c: liveTemp,
            precipitation_mm: livePrecip,
            humidity_pct: liveHum,
            condition: liveCondition,
            source: 'Open-Meteo Live API'
          });
        }
      } catch (err) {
        console.warn('Weather fetch warning in harvest module:', err);
      }

      // 4. Request dynamic live harvest plan from backend
      try {
        const plan = await farmActivityService.getLiveHarvestPlan({
          farm_id: farm?.farm_id,
          farm_name: farmName,
          crop: selectedCrop,
          area_hectares: farmArea,
          latitude: safeLat,
          longitude: safeLon,
          state: location?.state,
          district: location?.city,
          sowing_date: actualSowingDate,
          manual_harvest_date: effectiveManualDate || undefined,
          activities: acts
        });

        setLivePlan(plan);
        setAlerts(plan.alerts || []);
        setComputedStatus({
          growthStage: plan.growth_stage,
          expectedHarvestDate: plan.expected_harvest_date,
          manualHarvestDate: plan.manual_harvest_date,
          harvestWindow: plan.harvest_window,
          status: plan.status,
          daysToHarvest: plan.days_to_harvest,
          gddAccumulated: plan.gdd_accumulated,
          gddThreshold: plan.gdd_threshold,
          gddPercentage: plan.gdd_percentage,
          requiredLabour: plan.required_labour,
          storageRequirementSqft: plan.storage_requirement_sqft,
          storageBagsCount: plan.storage_bags_count,
          storageMoistureTargetPct: plan.storage_moisture_target_pct,
          totalProductionTons: plan.total_production_tons,
          machineryRecommendation: plan.machinery_recommendation,
          cropDurationDays: plan.crop_duration_days,
          varietyName: plan.variety_name,
          isEstimatedDuration: plan.is_estimated_duration,
          durationRange: plan.duration_range,
          baseHarvestDate: plan.base_harvest_date,
          netShiftDays: plan.net_shift_days,
          adjustmentReasons: plan.adjustment_reasons,
          activityFlags: plan.activity_flags
        });

        // 5. Predict yield using real weather and actual accumulated GDD
        try {
          const soil = await soilService.getSoilAnalysis(safeLat, safeLon, farm?.farm_id, selectedCrop);
          const yPred = await yieldService.predictYield({
            crop: selectedCrop,
            farm_area_ha: farmArea,
            temperature_c: liveTemp,
            rainfall_mm: livePrecip,
            humidity_pct: liveHum,
            soil_moisture_pct: soil.soilData.moisture,
            soil_ph: soil.soilData.ph,
            soil_n: soil.soilData.nitrogen,
            soil_p: soil.soilData.phosphorus,
            soil_k: soil.soilData.potassium,
            gdd: plan.gdd_accumulated,
            historical_yield_tha: 0,
            state: location?.state,
            district: location?.city
          });
          setYieldResult(yPred);
        } catch (yErr) {
          console.warn('Yield prediction warning:', yErr);
        }

      } catch (planErr) {
        console.warn('Fallback to local calculation:', planErr);
        const statusInfo = farmActivityService.calculateHarvestStatus(
          selectedCrop,
          actualSowingDate,
          undefined,
          undefined,
          farmArea,
          liveTemp,
          effectiveManualDate || undefined,
          sowingVarietyOrNotes,
          acts
        );
        setComputedStatus(statusInfo);
      }

      initChecklistForCrop(selectedCrop);

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

  const handleSaveManualDate = async () => {
    setManualHarvestDate(tempManualDate);
    setIsAdjustDateModalOpen(false);

    try {
      // 1. Recalculate locally
      const statusInfo = farmActivityService.calculateHarvestStatus(
        selectedCrop,
        undefined,
        computedStatus.gddAccumulated,
        yieldResult?.predictedYieldPerHectare,
        farmArea,
        weatherTelemetry.temperature_c,
        tempManualDate
      );
      setComputedStatus(statusInfo);

      // 2. Persist to backend
      await farmActivityService.saveHarvestRecord({
        farm_id: farm?.farm_id || 'default_farm',
        field_name: farmName,
        crop: selectedCrop,
        area_hectares: farmArea,
        predicted_yield_tha: yieldResult?.predictedYieldPerHectare || 4.2,
        expected_production_tons: statusInfo.totalProductionTons,
        current_gdd: computedStatus.gddAccumulated,
        growth_stage: statusInfo.growthStage,
        expected_harvest_date: new Date(tempManualDate).toISOString(),
        manual_harvest_date: new Date(tempManualDate).toISOString(),
        harvest_window: statusInfo.harvestWindow,
        status: statusInfo.status,
        required_labour: statusInfo.requiredLabour,
        storage_requirement_sqft: statusInfo.storageRequirementSqft,
        storage_bags_count: statusInfo.storageBagsCount,
        storage_moisture_target_pct: statusInfo.storageMoistureTargetPct
      });
    } catch (e) {
      console.warn('Could not persist adjusted date to backend:', e);
    }
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
          farm_id: farm?.farm_id || 'default_farm',
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
      // Reload harvest plan to recalibrate with new activity
      loadData();
    } catch (err: any) {
      alert('Failed to save activity');
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await farmActivityService.deleteActivity(activityId);
      setActivities(prev => prev.filter(a => a.activity_id !== activityId));
      loadData();
    } catch (err) {}
  };

  // Phenological chart data: dynamically calculated from live plan or crop spec
  const cropSpec = CROP_HARVEST_SPECS[selectedCrop] || CROP_HARVEST_SPECS.Rice;
  const phenologicalChartData = livePlan?.phenological_stages && livePlan.phenological_stages.length > 0
    ? livePlan.phenological_stages
    : cropSpec.stages.map((stg, idx) => {
        const prevPct = idx === 0 ? 0 : cropSpec.stages[idx - 1].gddPct;
        const stageSpan = stg.gddPct - prevPct;
        let progress = 0;
        if (computedStatus.gddPercentage >= stg.gddPct) {
          progress = 100;
        } else if (computedStatus.gddPercentage <= prevPct) {
          progress = 0;
        } else {
          progress = Math.round(((computedStatus.gddPercentage - prevPct) / stageSpan) * 100);
        }
        return {
          stage: stg.name,
          progress,
          label: progress >= 100 ? 'Completed' : progress > 0 ? 'Current' : 'Upcoming',
          targetGddPct: stg.gddPct
        };
      });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-400">Loading live agroclimatic telemetry, thermal GDD & harvest plan...</p>
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
      {/* 1. Harvest Operations Context Bar */}
      <motion.div variants={motionPresets.item} className="verda-hero-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-amber-400 uppercase">
              <span>Operations</span>
              <span className="text-slate-600">/</span>
              <span>Harvest Maturation & Post-Harvest Logistics</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-400/30 text-amber-300 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block"></span>
                LIVE SENSORS CONNECTED
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white font-display">
                <span className="bg-gradient-to-r from-white via-amber-100 to-amber-300 bg-clip-text text-transparent">Harvest Operations</span> & Maturation
              </h1>
              <Badge variant="harvest" size="sm">
                {computedStatus.status}
              </Badge>
              <Badge variant="outline" size="sm">
                Crop: {selectedCrop}
              </Badge>
            </div>

            <p className="text-xs text-slate-300 flex items-center gap-2 font-normal flex-wrap">
              <span className="font-semibold text-white">{farmName}</span>
              <span className="text-slate-700">•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                {locationLabel} ({farmArea} ha)
              </span>
              <span className="text-slate-700">•</span>
              <span className="text-slate-300 font-mono text-[11px]">
                Target Window: <strong className="text-amber-400">{computedStatus.daysToHarvest}d remaining</strong>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={<Sliders className="w-3.5 h-3.5 text-amber-400" />}
              onClick={() => {
                setTempManualDate(manualHarvestDate || new Date().toISOString().split('T')[0]);
                setIsAdjustDateModalOpen(true);
              }}
            >
              Adjust Date
            </Button>
            <Button
              variant="harvest"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleOpenAddModal}
            >
              Log Activity
            </Button>
            <Button
              variant="glass"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5 text-amber-400" />}
              onClick={loadData}
            >
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 2. Pristine Asymmetric Bento Grid */}
      <motion.div variants={motionPresets.item} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Primary Maturation Readiness Desk (7 Cols) */}
        <div className="lg:col-span-7 rounded-3xl rounded-tr-xl relative overflow-hidden border border-amber-500/30 bg-gradient-to-br from-slate-900/95 via-amber-950/20 to-slate-900/90 shadow-xl p-6 sm:p-7 flex flex-col justify-between space-y-6 backdrop-blur-md">
          <AgronomicMotif motif="wheat" className="w-64 h-64 -bottom-12 -right-8" opacity={0.12} />
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] relative z-10">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Target Harvest Maturation Window
              </span>
            </div>
            <span className="text-[11px] font-mono text-amber-300 font-semibold">
              GDD: <AnimatedCounter value={computedStatus.gddPercentage} suffix="%" /> Maturation
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 relative z-10">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Estimated Readiness
              </div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-display">
                  {computedStatus.manualHarvestDate ? computedStatus.manualHarvestDate : computedStatus.expectedHarvestDate}
                </span>
                <Badge variant="harvest" className="ml-2">
                  <AnimatedCounter value={computedStatus.daysToHarvest} suffix="d Remaining" />
                </Badge>
                {computedStatus.isEstimatedDuration && (
                  <Badge variant="outline" className="ml-2 text-[10px] text-amber-300 border-amber-500/40">
                    Standard Estimate
                  </Badge>
                )}
                {computedStatus.netShiftDays !== undefined && (
                  <Badge
                    variant={computedStatus.netShiftDays > 0 ? 'outline' : 'glass'}
                    className={`ml-1 text-[11px] font-semibold ${
                      computedStatus.netShiftDays > 0
                        ? 'border-amber-500/60 text-amber-300 bg-amber-500/10'
                        : computedStatus.netShiftDays < 0
                        ? 'border-emerald-500/60 text-emerald-300 bg-emerald-500/10'
                        : 'border-slate-500/40 text-slate-300'
                    }`}
                  >
                    {computedStatus.netShiftDays > 0
                      ? `Delayed +${computedStatus.netShiftDays}d`
                      : computedStatus.netShiftDays < 0
                      ? `Accelerated ${computedStatus.netShiftDays}d`
                      : 'On Schedule'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-2">
                Recommended Window: <strong className="text-white font-semibold">{computedStatus.harvestWindow}</strong>
                {computedStatus.cropDurationDays && (
                  <span className="text-slate-400 ml-2 font-mono text-[11px]">
                    (~{computedStatus.cropDurationDays}d cycle • {computedStatus.varietyName || selectedCrop})
                  </span>
                )}
              </p>
            </div>

            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 text-right backdrop-blur-md">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Target Moisture Threshold</div>
              <div className="text-xl font-mono font-bold text-white mt-0.5">
                <AnimatedCounter value={computedStatus.storageMoistureTargetPct} suffix="%" /> <span className="text-xs text-amber-400 font-normal">RH</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">ICAR safe storage standard</div>
            </div>
          </div>

          {/* Sub-telemetry 3-gauge strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 relative z-10">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 backdrop-blur-md">
              <div className="text-[11px] text-slate-400 mb-1 font-medium flex items-center gap-1">
                <Sprout className="w-3.5 h-3.5 text-amber-400" />
                Phenological Stage
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-display truncate" title={computedStatus.growthStage}>
                {computedStatus.growthStage}
              </div>
              <p className="text-[10px] text-amber-400 mt-1 font-medium">Authentic ICAR phase</p>
            </div>

            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 backdrop-blur-md">
              <div className="text-[11px] text-slate-400 mb-1 font-medium flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                Thermal Units
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-display">
                {computedStatus.gddAccumulated} / {computedStatus.gddThreshold}
              </div>
              <p className="text-[10px] text-amber-400 mt-1 font-medium">Growing Degree Days (GDD)</p>
            </div>

            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 backdrop-blur-md">
              <div className="text-[11px] text-slate-400 mb-1 font-medium flex items-center gap-1">
                <CloudRain className="w-3.5 h-3.5 text-amber-400" />
                Weather Telemetry
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-display">
                {weatherTelemetry.temperature_c}°C, {weatherTelemetry.precipitation_mm}mm rain
              </div>
              <p className="text-[10px] text-amber-400 mt-1 font-medium">{weatherTelemetry.condition || 'Open-Meteo Live'}</p>
            </div>
          </div>

          {/* Activity-Aware Timeline Adjustments & Insights */}
          {computedStatus.adjustmentReasons && computedStatus.adjustmentReasons.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3.5 relative z-10 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    Agronomic Timeline Calibration
                  </span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 font-medium">
                  {computedStatus.netShiftDays && computedStatus.netShiftDays > 0
                    ? `+${computedStatus.netShiftDays}d shift`
                    : computedStatus.netShiftDays && computedStatus.netShiftDays < 0
                    ? `${computedStatus.netShiftDays}d shift`
                    : 'Timeline calibrated'}
                </span>
              </div>
              <div className="space-y-1.5">
                {computedStatus.adjustmentReasons.map((reason, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-snug">
                    <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Logistics & Post-Harvest Storage Desk (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-5">
          <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-5 backdrop-blur-md flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Tractor className="w-4 h-4 text-amber-400" />
                Expected Bulk Output
              </span>
              <Badge variant="harvest">
                <AnimatedCounter
                  value={yieldResult ? yieldResult.totalProductionTons : computedStatus.totalProductionTons}
                  decimals={1}
                  suffix=" Tons"
                />
              </Badge>
            </div>

            <div className="my-3">
              <div className="text-2xl font-extrabold text-white font-display">
                <AnimatedCounter value={computedStatus.storageBagsCount} /> <span className="text-sm font-normal text-slate-300">Standard 50kg Units</span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Requires approximately <strong className="text-white"><AnimatedCounter value={computedStatus.storageRequirementSqft} /> sq.ft</strong> of moisture-proof palletized warehouse space.
              </p>
            </div>

            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-slate-400">Safe Storage Moisture:</span>
              <span className="text-amber-400 font-semibold font-mono">{computedStatus.storageMoistureTargetPct}% Target</span>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-5 backdrop-blur-md flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                Workforce & Machinery
              </span>
              <Badge variant="outline">
                <AnimatedCounter value={computedStatus.requiredLabour} suffix=" Workers Required" />
              </Badge>
            </div>

            <div className="my-3">
              <div className="text-lg font-bold text-white font-display truncate">
                {(computedStatus.machineryRecommendation || 'Combine Harvester').split(',')[0]}
              </div>
              <p className="text-xs text-slate-300 mt-1.5 line-clamp-2">
                {computedStatus.machineryRecommendation}
              </p>
            </div>

            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-slate-400">Checklist Readiness:</span>
              <span className="text-amber-400 font-semibold font-mono">
                {checklist.filter(c => c.done).length} / {checklist.length} Completed
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Segment Controls */}
      <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 p-1.5 rounded-xl w-fit backdrop-blur-md">
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
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SEGMENT 1: HARVEST SCHEDULE */}
      {activeSegment === 'harvest' && (
        <Card variant="elevated" tone="harvest" className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white font-display">Phenological Phase Progression & GDD Maturation</h3>
              <p className="text-xs text-slate-400">Authentic Thermal Unit Progression for {selectedCrop}</p>
            </div>
            <Badge variant="harvest" size="md">
              GDD Progress: {computedStatus.gddPercentage}%
            </Badge>
          </div>

          {/* Simple Progress Bar */}
          <div className="space-y-3">
            <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-700 shadow-xs"
                style={{ width: `${Math.min(100, computedStatus.gddPercentage)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px] font-semibold text-slate-400">
              {phenologicalChartData.map((stg, i) => (
                <span key={i} className={stg.progress >= 100 ? 'text-emerald-400 font-bold' : stg.progress > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                  {stg.stage} ({stg.progress}%)
                </span>
              ))}
            </div>
          </div>

          {/* Phenological Stage Progression Bar Chart */}
          <div className="pt-4 border-t border-white/10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">Crop Developmental Phase Breakdown</h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={phenologicalChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="stage" tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis unit="%" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="saas-card p-3 shadow-xl border border-white/15 text-xs bg-slate-900/95 backdrop-blur-md">
                            <p className="font-bold text-white">{item.stage}</p>
                            <p className="text-amber-400 font-semibold">{item.label} ({item.progress}%)</p>
                            <p className="text-slate-400 text-[10px] mt-1">Maturity Milestone: {item.targetGddPct}% GDD</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="progress" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {phenologicalChartData.map((entry, idx) => (
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

          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-300">
              Safe Storage Moisture Target: <strong className="text-emerald-400">{computedStatus.storageMoistureTargetPct}% RH</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStrategyModalOpen(true)}
              className="border-white/10 text-slate-200 hover:bg-white/5"
            >
              View ICAR Harvest Strategy →
            </Button>
          </div>
        </Card>
      )}

      {/* SEGMENT 2: LABOUR & STORAGE */}
      {activeSegment === 'planning' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Labour Planning */}
          <Card variant="elevated" className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Users className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white font-display">Labour & Machinery Requirements</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-300">Estimated Field Workforce:</span>
                <span className="font-bold text-white">{computedStatus.requiredLabour} Workers</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/10">
                <span className="text-slate-300">Plot Workload Density:</span>
                <span className="font-semibold text-slate-200">~{(computedStatus.requiredLabour / farmArea).toFixed(1)} workers / hectare</span>
              </div>
              <div className="flex justify-between items-start py-1 border-t border-white/10 gap-3">
                <span className="text-slate-300 shrink-0">Recommended Machinery:</span>
                <Badge variant="harvest" size="sm" className="text-right">
                  {computedStatus.machineryRecommendation}
                </Badge>
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
                <span className="font-semibold text-slate-200">{computedStatus.storageBagsCount} Bags / Crates</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/10">
                <span className="text-slate-300">Target Moisture Threshold:</span>
                <span className="font-bold text-emerald-400">{computedStatus.storageMoistureTargetPct}% RH</span>
              </div>
            </div>
          </Card>

          {/* Checklist */}
          <Card variant="elevated" className="p-6 space-y-3 md:col-span-2">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white font-display">Pre-Harvest Readiness Checklist ({selectedCrop})</h3>
              <span className="text-xs text-amber-400 font-mono">
                {checklist.filter(c => c.done).length} / {checklist.length} Complete
              </span>
            </div>
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
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recorded Field Activities ({activities.length})</span>
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
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">
                      No field activities logged yet. Click "Log New Activity" to record Sowing, Irrigation, Fertilization, etc.
                    </td>
                  </tr>
                ) : (
                  activities.map((act) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* SEGMENT 4: ALERTS */}
      {activeSegment === 'alerts' && (
        <Card variant="elevated" className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 className="text-base font-bold text-white font-display">Active Harvest & Agronomic Alerts</h3>
            <span className="text-xs font-mono text-amber-400">{alerts.length} Active Notifications</span>
          </div>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8">No active harvest alerts for this field.</div>
            ) : (
              alerts.map((alr) => (
                <div key={alr.id} className="p-4 bg-slate-900/60 border border-white/10 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{alr.title}</span>
                      <Badge variant={alr.severity === 'Critical' || alr.type === 'danger' ? 'rose' : alr.type === 'warning' ? 'amber' : 'emerald'} size="sm">
                        {alr.severity || alr.category}
                      </Badge>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{alr.description}</p>
                    {alr.actionRequired && (
                      <p className="text-amber-400 text-[11px] font-semibold mt-1">
                        Required Action: {alr.actionRequired}
                      </p>
                    )}
                  </div>
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
                  <button type="button" onClick={() => setIsAdjustDateModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Select Planned Harvest Date</label>
                    <input
                      type="date"
                      value={tempManualDate}
                      onChange={(e) => setTempManualDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-white font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-white/10 rounded-xl text-slate-300 text-xs">
                    AI Agronomic Estimate: <strong className="text-amber-400">{computedStatus.expectedHarvestDate}</strong>
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
                      variant="harvest"
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
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveActivity} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Activity Type</label>
                    <select
                      value={formData.activity_type}
                      onChange={(e) => setFormData({ ...formData, activity_type: e.target.value as ActivityType })}
                      className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-white font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                    >
                      <option value="Sowing" className="bg-slate-900 text-white">Sowing</option>
                      <option value="Irrigation" className="bg-slate-900 text-white">Irrigation</option>
                      <option value="Fertilization" className="bg-slate-900 text-white">Fertilization</option>
                      <option value="Pesticide Application" className="bg-slate-900 text-white">Pesticide Application</option>
                      <option value="Weeding" className="bg-slate-900 text-white">Weeding</option>
                      <option value="Disease Inspection" className="bg-slate-900 text-white">Disease Inspection</option>
                      <option value="Harvesting" className="bg-slate-900 text-white">Harvesting</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-white font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Details / Quantity</label>
                    <input
                      type="text"
                      placeholder="e.g. 50 kg Urea applied / Coragen 150ml spray"
                      value={formData.quantity_details}
                      onChange={(e) => setFormData({ ...formData, quantity_details: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-white font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Notes / Observations</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Pre-harvest irrigation dry-down"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-white font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none placeholder:text-slate-500"
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
                      variant="harvest"
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
                  <h3 className="text-sm font-bold text-white font-display">ICAR Harvest Strategy ({selectedCrop})</h3>
                  <button type="button" onClick={() => setIsStrategyModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-slate-300 leading-relaxed">
                  <p>
                    Current GDD progress is <strong className="text-amber-400">{computedStatus.gddPercentage}%</strong> with <strong className="text-white">{computedStatus.daysToHarvest} days remaining</strong>. Target safe moisture is <strong className="text-emerald-400">{computedStatus.storageMoistureTargetPct}% RH</strong>.
                  </p>
                  <ul className="list-disc pl-4 space-y-1.5">
                    {(livePlan?.strategy_advice || cropSpec.strategyAdvice || []).map((advice, idx) => (
                      <li key={idx}>{advice}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="harvest"
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
