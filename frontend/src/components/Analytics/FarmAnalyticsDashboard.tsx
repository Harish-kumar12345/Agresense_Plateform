import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  CloudSun,
  FlaskConical,
  Bug,
  Calendar,
  IndianRupee,
  Download,
  FileText,
  MapPin,
  Sprout,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Layers,
  ChevronDown,
  Clock,
  ShieldAlert,
  Droplets,
  Award,
  Loader2
} from 'lucide-react';
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
  // State for all farms registered in GIS
  const [farmsList, setFarmsList] = useState<FarmData[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<FarmData | null>(farm || null);
  const [selectedSeason, setSelectedSeason] = useState<string>('Kharif 2026');

  // Analytics Data State
  const [analytics, setAnalytics] = useState<FarmAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);

  // Ref for PDF Export Element
  const pdfReportRef = useRef<HTMLDivElement>(null);

  // Fetch list of saved farms
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

  // Fetch telemetry & compute analytics whenever selected farm changes
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

  // PDF Generation Function using jsPDF & html2canvas
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
      // Fallback: Trigger browser print
      window.print();
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-4">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
        <h3 className="text-xl font-bold text-gray-800">Consolidating Farm Telemetry & Analytics...</h3>
        <p className="text-sm text-gray-500">Retrieving data from GIS, Weather, Soil, GDD, AI Yield, Disease Risk, and Market Prices</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-xl font-bold text-gray-800">Unable to Load Analytics</h3>
        <p className="text-sm text-gray-500">{loadError || 'An unexpected error occurred while fetching farm data.'}</p>
        <button
          onClick={loadAnalyticsData}
          className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm inline-flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const { farmInfo, yieldAnalytics, weatherTrends, soilHealth, gddProgress, diseaseRiskTrajectory, inventoryAndActivities, marketAndRevenue, harvestReadiness } = analytics;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold backdrop-blur-md">
              <BarChart3 className="w-4 h-4 text-emerald-400" /> 📊 AgriSense Enterprise Farm Analytics
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {farmInfo.farmName} Analytics Dashboard
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100/90 font-medium">
              <span className="flex items-center gap-1 font-bold text-emerald-300">
                <MapPin className="w-3.5 h-3.5" />
                {farmInfo.locationName} ({farmInfo.coordinates.latitude.toFixed(4)}, {farmInfo.coordinates.longitude.toFixed(4)})
              </span>
              <span>•</span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-[11px]">
                🌾 {farmInfo.crop} | {farmInfo.areaHectares} Hectares
              </span>
            </div>
          </div>

          {/* Action Buttons & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Farm Selector Dropdown */}
            {farmsList.length > 0 && (
              <div className="relative">
                <select
                  value={selectedFarm?.farm_id || ''}
                  onChange={(e) => {
                    const found = farmsList.find(f => f.farm_id === e.target.value);
                    if (found) setSelectedFarm(found);
                  }}
                  className="px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold border border-white/20 outline-none cursor-pointer backdrop-blur-md"
                >
                  {farmsList.map(f => (
                    <option key={f.farm_id} value={f.farm_id} className="text-gray-900">
                      🏡 {f.farm_name} ({f.crop})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Season Filter Dropdown */}
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold border border-white/20 outline-none cursor-pointer backdrop-blur-md"
            >
              <option value="Kharif 2026" className="text-gray-900">Season: Kharif 2026</option>
              <option value="Rabi 2025-26" className="text-gray-900">Season: Rabi 2025-26</option>
              <option value="Kharif 2025" className="text-gray-900">Season: Kharif 2025</option>
            </select>

            {/* Generate PDF Farm Report Button */}
            <button
              onClick={handleGeneratePdfReport}
              disabled={generatingPdf}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all border border-emerald-400 flex items-center gap-2"
            >
              {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {generatingPdf ? 'Generating PDF...' : '📄 Generate PDF Farm Report'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: AI Predicted Yield & Production */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
            <span>AI PREDICTED YIELD</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">
            {yieldAnalytics.currentPredictedYield} <span className="text-sm font-semibold text-gray-500">tons/ha</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
            <span className="text-gray-600">Total Production:</span>
            <span className="font-extrabold text-emerald-700">{yieldAnalytics.expectedProductionTons} Tons</span>
          </div>
        </div>

        {/* Card 2: Estimated Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
            <span>ESTIMATED REVENUE</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            ₹{marketAndRevenue.estimatedRevenueLakhs} <span className="text-sm font-bold text-emerald-600">Lakhs</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
            <span className="text-gray-600">Mandi Modal Rate:</span>
            <span className="font-extrabold text-gray-800">₹{marketAndRevenue.currentMarketPrice} / qtl</span>
          </div>
        </div>

        {/* Card 3: GDD & Growth Stage */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
            <span>GROWTH STAGE & GDD</span>
            <Sprout className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-black text-gray-900 truncate">
            {gddProgress.growthStage}
          </div>
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px] font-bold text-gray-600">
              <span>Accumulated: {gddProgress.accumulatedGdd} GDD</span>
              <span>{gddProgress.progressPct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: `${gddProgress.progressPct}%` }} />
            </div>
          </div>
        </div>

        {/* Card 4: Disease Risk Status */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
            <span>DISEASE / PEST RISK</span>
            <Bug className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-black text-gray-900">{diseaseRiskTrajectory.overallRiskScore}%</div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
              diseaseRiskTrajectory.riskLevel === 'LOW' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {diseaseRiskTrajectory.riskLevel} RISK
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
            <span className="text-gray-600">Active Risk Flags:</span>
            <span className="font-extrabold text-rose-700">{diseaseRiskTrajectory.activeRisksCount} Threats</span>
          </div>
        </div>
      </div>

      {/* Main Charts Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Historical vs AI Predicted Yield */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" /> Historical vs Predicted Yield (tons/ha)
            </h3>

            {!yieldAnalytics.hasHistoricalData && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                No historical data available (Simulated Benchmark)
              </span>
            )}
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yieldAnalytics.historicalSeasons}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="season" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 8]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="actualYield" name="Actual Yield (t/ha)" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="predictedYield" name="AI Target Yield (t/ha)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: 6-Day Weather Trends */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
              <CloudSun className="w-5 h-5 text-blue-600" /> Weather Trends (Temp °C & Humidity %)
            </h3>
            <span className="text-xs text-gray-500 font-bold">Location: {farmInfo.locationName}</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weatherTrends.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="tempMax" name="Max Temp (°C)" stroke="#ef4444" strokeWidth={2.5} />
                <Line type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#3b82f6" strokeWidth={2.5} />
                <Line type="monotone" dataKey="rainProb" name="Rain Prob (%)" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Soil Nutrient Breakdown N-P-K */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-purple-600" /> Soil N-P-K Nutrient Status vs Optimal
            </h3>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
              Soil pH: {soilHealth.ph} ({soilHealth.type})
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={soilHealth.npkStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="nutrient" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 60]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="current" name="Current Soil Level (%)" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="optimal" name="Optimal Target (%)" fill="#94a3b8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Disease & Pest Risk Trajectory */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
              <Bug className="w-5 h-5 text-rose-600" /> 30-Day Disease Risk Trajectory
            </h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Overall Risk: {diseaseRiskTrajectory.overallRiskScore}%
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={diseaseRiskTrajectory.trend30Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="riskScore" name="Pest/Disease Risk (%)" stroke="#f43f5e" fill="#ffe4e6" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Harvest & Logistical Summary Section */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-lg space-y-4">
        <h3 className="font-black text-gray-800 text-base flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" /> Harvest Schedule & Logistics Telemetry
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
            <span className="text-xs font-bold text-emerald-800">Expected Harvest Date</span>
            <p className="text-lg font-black text-emerald-950">{harvestReadiness.expectedHarvestDate}</p>
            <p className="text-xs text-emerald-700 font-medium">Window: {harvestReadiness.harvestWindow}</p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
            <span className="text-xs font-bold text-blue-800">Harvest Readiness Status</span>
            <p className="text-lg font-black text-blue-950">{harvestReadiness.readinessStatus}</p>
            <p className="text-xs text-blue-700 font-medium">{harvestReadiness.daysToHarvest} days remaining until harvest</p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-1">
            <span className="text-xs font-bold text-purple-800">Recent Farm Activities</span>
            <p className="text-lg font-black text-purple-950">{inventoryAndActivities.recentActivitiesCount} Logged Actions</p>
            <p className="text-xs text-purple-700 font-medium">Fertilizer Used: {inventoryAndActivities.fertilizersUsedKg} kg</p>
          </div>
        </div>
      </div>

      {/* HIDDEN PRINT / PDF DOM CONTAINER (captured by html2canvas for PDF download) */}
      <div className="hidden">
        <div ref={pdfReportRef} className="p-8 bg-white text-gray-900 space-y-6 max-w-4xl mx-auto font-sans" style={{ width: '800px' }}>
          {/* PDF Report Header */}
          <div className="border-b-4 border-emerald-600 pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-emerald-800">🌾 AgriSense Enterprise Farm Report</h1>
              <p className="text-xs text-gray-500 font-bold">Official Agricultural Telemetry & AI Advisory Document</p>
            </div>
            <div className="text-right text-xs text-gray-600">
              <p className="font-bold">Generated: {new Date().toLocaleString()}</p>
              <p>Report ID: AS-{Math.random().toString(36).substring(2, 8).toUpperCase()}</p>
            </div>
          </div>

          {/* Section 1: Farm & GIS Metadata */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <p><span className="font-bold text-gray-700">Farm Name:</span> {farmInfo.farmName}</p>
              <p><span className="font-bold text-gray-700">Location:</span> {farmInfo.locationName}</p>
              <p><span className="font-bold text-gray-700">GIS Coordinates:</span> {farmInfo.coordinates.latitude.toFixed(4)}, {farmInfo.coordinates.longitude.toFixed(4)}</p>
            </div>
            <div>
              <p><span className="font-bold text-gray-700">Crop Variety:</span> {farmInfo.crop}</p>
              <p><span className="font-bold text-gray-700">Farm Area:</span> {farmInfo.areaHectares} Hectares</p>
              <p><span className="font-bold text-gray-700">Soil Type:</span> {soilHealth.type} (pH: {soilHealth.ph})</p>
            </div>
          </div>

          {/* Section 2: AI Yield & Revenue Intelligence */}
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

          {/* Section 3: Weather & Soil Health Details */}
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

          {/* Section 4: GDD & Disease Risk Status */}
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

          {/* Section 5: Krishi Mitra AI Recommendations */}
          <div className="border border-gray-300 p-4 rounded-xl space-y-2 text-xs">
            <h3 className="font-bold text-gray-800 text-sm border-b border-gray-200 pb-1">🤖 Krishi Mitra AI Recommendations</h3>
            <ul className="list-disc pl-4 space-y-1 text-gray-700">
              <li>Maintain shallow water depth of 2-3 cm during grain filling phase.</li>
              <li>Foliar spray of Potassium Nitrate (13:0:45) recommended to increase grain weight.</li>
              <li>Monitor humidity and apply preventive neem oil spray for fungal protection.</li>
              <li>Prepare grain storage facility (moisture target &lt; 14%) prior to harvest window.</li>
            </ul>
          </div>

          {/* PDF Footer Disclaimer */}
          <div className="text-center text-[10px] text-gray-400 border-t pt-3">
            <p>AgriSense Precision Agriculture Platform • Generated automatically from live GIS and sensor telemetry.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
