import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  CloudSun,
  FlaskConical,
  Bug,
  Calendar,
  IndianRupee,
  FileText,
  MapPin,
  Sprout,
  AlertTriangle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { FarmData, farmService } from '../../services/farmService';
import { analyticsService, FarmAnalyticsData } from '../../services/analyticsService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InsightCard } from '../ui/InsightCard';
import { colors } from '../../styles/design-tokens';

import { AnimatedCounter } from '../Common/AnimatedCounter';

interface FarmAnalyticsDashboardProps {
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

export const FarmAnalyticsDashboard: React.FC<FarmAnalyticsDashboardProps> = ({
  farm,
  location,
  crop
}) => {
  const [farmsList, setFarmsList] = useState<FarmData[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<FarmData | null>(farm || null);
  const [selectedSeason, setSelectedSeason] = useState<string>('Kharif 2026');

  const [analytics, setAnalytics] = useState<FarmAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);

  const pdfReportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadFarms() {
      try {
        const saved = await farmService.getFarms();
        if (saved && saved.length > 0) {
          setFarmsList(saved);
          if (!selectedFarm) {
            setSelectedFarm(saved[0]);
          }
        }
      } catch (err) {
        console.warn('Error loading farms list:', err);
      }
    }
    loadFarms();
  }, []);

  const loadAnalyticsData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await analyticsService.getFarmAnalytics(
        selectedFarm || farm,
        location,
        crop
      );
      setAnalytics(data);
    } catch (err: any) {
      console.error('Error fetching farm analytics:', err);
      setLoadError(err?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedFarm, farm, location, crop, selectedSeason]);

  const handleGeneratePdfReport = async () => {
    if (!analytics || !pdfReportRef.current) return;
    setGeneratingPdf(true);

    try {
      const element = pdfReportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const fileName = `AgriSense_Farm_Report_${analytics.farmInfo.farmName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF Generation error:', err);
      window.print();
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-lg font-bold text-white font-display">Consolidating Farm Telemetry & Analytics...</h3>
        <p className="text-xs text-slate-400">Retrieving data from GIS, Weather, Soil, GDD, AI Yield, Disease Risk, and Market Prices</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-white font-display">Unable to Load Analytics</h3>
        <p className="text-xs text-slate-400">{loadError || 'An unexpected error occurred while fetching farm data.'}</p>
        <Button
          variant="primary"
          size="md"
          icon={<RefreshCw className="w-4 h-4" />}
          onClick={loadAnalyticsData}
        >
          Retry
        </Button>
      </div>
    );
  }

  const { farmInfo, yieldAnalytics, weatherTrends, soilHealth, gddProgress, diseaseRiskTrajectory, inventoryAndActivities, marketAndRevenue, harvestReadiness } = analytics;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-100 font-sans"
    >
      {/* 1. Header Banner */}
      <div className="apple-hero-header">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="apple-segmented-item active">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400 inline-block mr-1.5" /> AgriSense Consolidated Farm Intelligence
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight font-display text-white">
              <span className="apple-title-gradient">{farmInfo.farmName}</span> Analytics & Telemetry
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#94A3B8] font-medium">
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {farmInfo.locationName} ({farmInfo.coordinates.latitude.toFixed(4)}, {farmInfo.coordinates.longitude.toFixed(4)})
              </span>
              <span className="text-slate-700">•</span>
              <Badge variant="emerald" size="sm">
                🌾 {farmInfo.crop} • {farmInfo.areaHectares} ha
              </Badge>
            </div>
          </div>

          {/* Action Buttons & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {farmsList.length > 0 && (
              <select
                value={selectedFarm?.farm_id || ''}
                onChange={(e) => {
                  const found = farmsList.find(f => f.farm_id === e.target.value);
                  if (found) setSelectedFarm(found);
                }}
                className="px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold border border-white/20 outline-none cursor-pointer backdrop-blur-md"
              >
                {farmsList.map(f => (
                  <option key={f.farm_id} value={f.farm_id} className="bg-slate-900 text-white">
                    {f.farm_name} ({f.crop})
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold border border-white/20 outline-none cursor-pointer backdrop-blur-md"
            >
              <option value="Kharif 2026" className="bg-slate-900 text-white">Season: Kharif 2026</option>
              <option value="Rabi 2025-26" className="bg-slate-900 text-white">Season: Rabi 2025-26</option>
              <option value="Kharif 2025" className="bg-slate-900 text-white">Season: Kharif 2025</option>
            </select>

            <Button
              variant="primary"
              size="sm"
              icon={generatingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              disabled={generatingPdf}
              onClick={handleGeneratePdfReport}
            >
              {generatingPdf ? 'Generating PDF...' : 'Download PDF Report'}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Primary KPI Insight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InsightCard
          title="AI Predicted Yield"
          value={`${yieldAnalytics.currentPredictedYield} t/ha`}
          subtitle={`Total Production: ${yieldAnalytics.expectedProductionTons} Tons`}
          badge="AI Forecast"
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          iconBg="bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
        />

        <InsightCard
          title="Estimated Revenue"
          value={`₹${marketAndRevenue.estimatedRevenueLakhs} Lakhs`}
          subtitle={`Mandi Modal Rate: ₹${marketAndRevenue.currentMarketPrice}/qtl`}
          badge="Valuation"
          icon={<IndianRupee className="w-5 h-5 text-teal-400" />}
          iconBg="bg-teal-500/15 text-teal-400 border-teal-500/20"
        />

        <InsightCard
          title="Growth Stage & GDD"
          value={gddProgress.growthStage}
          subtitle={`Accumulated: ${gddProgress.accumulatedGdd} GDD (${gddProgress.progressPct}%)`}
          badge="Phenology"
          icon={<Sprout className="w-5 h-5 text-amber-400" />}
          iconBg="bg-amber-500/15 text-amber-400 border-amber-500/20"
        />

        <InsightCard
          title="Pathogen Risk Level"
          value={`${diseaseRiskTrajectory.overallRiskScore}%`}
          subtitle={`${diseaseRiskTrajectory.riskLevel} • ${diseaseRiskTrajectory.activeRisksCount} Active Flags`}
          badge={diseaseRiskTrajectory.riskLevel === 'LOW' ? 'Optimal' : 'Elevated'}
          icon={<Bug className="w-5 h-5 text-rose-400" />}
          iconBg={diseaseRiskTrajectory.riskLevel === 'LOW' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border-rose-500/20'}
        />
      </div>

      {/* 3. Deep Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Historical vs AI Predicted Yield */}
        <Card variant="elevated" className="lg:col-span-6 p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Yield Trajectory</span>
              <h3 className="font-bold text-white text-base flex items-center gap-2 mt-0.5 font-display">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Historical vs Target Yield (tons/ha)
              </h3>
            </div>

            {!yieldAnalytics.hasHistoricalData && (
              <Badge variant="amber" size="sm">
                Simulated Benchmark
              </Badge>
            )}
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yieldAnalytics.historicalSeasons} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="season" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 8]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="saas-card p-3 shadow-xl border border-white/15 text-xs space-y-1 bg-slate-900/95 backdrop-blur-md">
                          <p className="font-bold text-white">{label}</p>
                          {payload.map((p, idx) => (
                            <p key={idx} style={{ color: p.color }} className="font-semibold">
                              {p.name}: {p.value} t/ha
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="actualYield" name="Actual Yield" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="predictedYield" name="AI Target Yield" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: 6-Day Weather Trends */}
        <Card variant="elevated" className="lg:col-span-6 p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Atmospheric Context</span>
              <h3 className="font-bold text-white text-base flex items-center gap-2 mt-0.5 font-display">
                <CloudSun className="w-4 h-4 text-sky-400" /> Temperature & Humidity Trend
              </h3>
            </div>
            <Badge variant="slate" size="sm">
              {farmInfo.locationName}
            </Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weatherTrends.trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="saas-card p-3 shadow-xl border border-white/15 text-xs space-y-1 bg-slate-900/95 backdrop-blur-md">
                          <p className="font-bold text-white">{label}</p>
                          {payload.map((p, idx) => (
                            <p key={idx} style={{ color: p.color }} className="font-semibold">
                              {p.name}: {p.value}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="tempMax" name="Max Temp (°C)" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="rainProb" name="Rain Prob (%)" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 3: Soil Nutrient Breakdown N-P-K */}
        <Card variant="elevated" className="lg:col-span-6 p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Soil Geochemistry</span>
              <h3 className="font-bold text-white text-base flex items-center gap-2 mt-0.5 font-display">
                <FlaskConical className="w-4 h-4 text-purple-400" /> Soil N-P-K Status vs Target
              </h3>
            </div>
            <Badge variant="emerald" size="sm">
              pH: {soilHealth.ph} ({soilHealth.type})
            </Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={soilHealth.npkStatus} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="nutrient" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 60]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="saas-card p-3 shadow-xl border border-white/15 text-xs space-y-1 bg-slate-900/95 backdrop-blur-md">
                          <p className="font-bold text-white">{label}</p>
                          {payload.map((p, idx) => (
                            <p key={idx} style={{ color: p.color }} className="font-semibold">
                              {p.name}: {p.value}%
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="current" name="Current Level (%)" fill="#a855f7" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="optimal" name="Target Optimal (%)" fill="#475569" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 4: Disease & Pest Risk Trajectory */}
        <Card variant="elevated" className="lg:col-span-6 p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Epidemiological Vector</span>
              <h3 className="font-bold text-white text-base flex items-center gap-2 mt-0.5 font-display">
                <Bug className="w-4 h-4 text-rose-400" /> 30-Day Disease Risk Trajectory
              </h3>
            </div>
            <Badge variant={diseaseRiskTrajectory.riskLevel === 'LOW' ? 'emerald' : 'rose'} size="sm">
              Risk: {diseaseRiskTrajectory.overallRiskScore}%
            </Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={diseaseRiskTrajectory.trend30Days} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="saas-card p-3 shadow-xl border border-white/15 text-xs space-y-1 bg-slate-900/95 backdrop-blur-md">
                          <p className="font-bold text-white">Date: {label}</p>
                          <p className="text-rose-400 font-semibold">Risk: {payload[0].value}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="riskScore" name="Pathogen Risk (%)" stroke="#f43f5e" fill="url(#riskGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 4. Harvest & Logistical Summary Section */}
      <Card variant="elevated" className="p-6 space-y-4">
        <div className="pb-2 border-b border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Field Logistics</span>
          <h3 className="font-bold text-white text-base flex items-center gap-2 mt-0.5 font-display">
            <Calendar className="w-4 h-4 text-emerald-400" /> Harvest Schedule & Operations Status
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Expected Harvest Date</span>
            <p className="text-xl font-black text-white font-display">{harvestReadiness.expectedHarvestDate}</p>
            <p className="text-xs text-emerald-300 font-medium">Window: {harvestReadiness.harvestWindow}</p>
          </div>

          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-1">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Readiness Assessment</span>
            <p className="text-xl font-black text-white font-display">{harvestReadiness.readinessStatus}</p>
            <p className="text-xs text-sky-300 font-medium">{harvestReadiness.daysToHarvest} days remaining until harvest</p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-1">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Field Operations</span>
            <p className="text-xl font-black text-white font-display">{inventoryAndActivities.recentActivitiesCount} Logged Actions</p>
            <p className="text-xs text-purple-300 font-medium">Fertilizer Applied: {inventoryAndActivities.fertilizersUsedKg} kg</p>
          </div>
        </div>
      </Card>

      {/* HIDDEN PRINT / PDF DOM CONTAINER (captured by html2canvas for PDF download) */}
      <div className="hidden">
        <div ref={pdfReportRef} className="p-8 bg-white text-slate-900 space-y-6 max-w-4xl mx-auto font-sans" style={{ width: '800px' }}>
          <div className="border-b-4 border-emerald-600 pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-emerald-800">🌾 AgriSense Enterprise Farm Report</h1>
              <p className="text-xs text-slate-500 font-bold">Official Agricultural Telemetry & AI Advisory Document</p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p className="font-bold">Generated: {new Date().toLocaleString()}</p>
              <p>Report ID: AS-{Math.random().toString(36).substring(2, 8).toUpperCase()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p><span className="font-bold text-slate-700">Farm Name:</span> {farmInfo.farmName}</p>
              <p><span className="font-bold text-slate-700">Location:</span> {farmInfo.locationName}</p>
              <p><span className="font-bold text-slate-700">GIS Coordinates:</span> {farmInfo.coordinates.latitude.toFixed(4)}, {farmInfo.coordinates.longitude.toFixed(4)}</p>
            </div>
            <div>
              <p><span className="font-bold text-slate-700">Crop Variety:</span> {farmInfo.crop}</p>
              <p><span className="font-bold text-slate-700">Farm Area:</span> {farmInfo.areaHectares} Hectares</p>
              <p><span className="font-bold text-slate-700">Soil Type:</span> {soilHealth.type} (pH: {soilHealth.ph})</p>
            </div>
          </div>

          <div className="border border-emerald-200 p-4 rounded-xl bg-emerald-50/50 space-y-2">
            <h3 className="font-bold text-emerald-900 text-sm border-b border-emerald-200 pb-1">📈 AI Yield & Market Revenue Telemetry</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <p><span className="font-bold">Predicted Yield:</span> {yieldAnalytics.currentPredictedYield} tons/ha</p>
              <p><span className="font-bold">Total Production:</span> {yieldAnalytics.expectedProductionTons} Tons</p>
              <p><span className="font-bold">Confidence Score:</span> {yieldAnalytics.confidenceScore}%</p>
              <p><span className="font-bold">Market Price:</span> ₹{marketAndRevenue.currentMarketPrice}/qtl ({marketAndRevenue.marketName})</p>
              <p><span className="font-bold">Estimated Revenue:</span> ₹{marketAndRevenue.estimatedRevenueRs.toLocaleString()} (₹{marketAndRevenue.estimatedRevenueLakhs} Lakhs)</p>
              <p><span className="font-bold">Harvest Window:</span> {harvestReadiness.harvestWindow}</p>
            </div>
          </div>

          <div className="border border-blue-200 p-4 rounded-xl bg-blue-50/50 space-y-2">
            <h3 className="font-bold text-blue-900 text-sm border-b border-blue-200 pb-1">⛅ Weather & Soil Health Analysis</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <p><span className="font-bold">Temperature:</span> {weatherTrends.currentTempC}°C</p>
              <p><span className="font-bold">Humidity:</span> {weatherTrends.humidityPct}%</p>
              <p><span className="font-bold">Soil Moisture:</span> {soilHealth.moisturePct}%</p>
              <p><span className="font-bold">Nitrogen (N):</span> {soilHealth.nitrogenPct}%</p>
              <p><span className="font-bold">Phosphorus (P):</span> {soilHealth.phosphorusPct}%</p>
              <p><span className="font-bold">Potassium (K):</span> {soilHealth.potassiumPct}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="border border-purple-200 p-3 rounded-xl bg-purple-50/50">
              <h4 className="font-bold text-purple-900 mb-1">🌱 Growth Stage & GDD</h4>
              <p><span className="font-bold">Current Stage:</span> {gddProgress.growthStage}</p>
              <p><span className="font-bold">Accumulated GDD:</span> {gddProgress.accumulatedGdd} Degree Days</p>
            </div>

            <div className="border border-rose-200 p-3 rounded-xl bg-rose-50/50">
              <h4 className="font-bold text-rose-900 mb-1">🐛 Disease & Pest Risk</h4>
              <p><span className="font-bold">Overall Risk Score:</span> {diseaseRiskTrajectory.overallRiskScore}% ({diseaseRiskTrajectory.riskLevel})</p>
              <p><span className="font-bold">Active Risks:</span> Low fungal monitoring active</p>
            </div>
          </div>

          <div className="border border-slate-300 p-4 rounded-xl space-y-2 text-xs">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-1">🤖 Krishi Mitra AI Recommendations</h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-700">
              <li>Maintain shallow water depth of 2-3 cm during grain filling phase.</li>
              <li>Foliar spray of Potassium Nitrate (13:0:45) recommended to increase grain weight.</li>
              <li>Monitor humidity and apply preventive neem oil spray for fungal protection.</li>
              <li>Prepare grain storage facility (moisture target &lt; 14%) prior to harvest window.</li>
            </ul>
          </div>

          <div className="text-center text-[10px] text-slate-400 border-t pt-3">
            <p>AgriSense Precision Agriculture Platform • Generated automatically from live GIS and sensor telemetry.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
