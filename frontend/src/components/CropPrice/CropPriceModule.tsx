import React, { useState, useEffect, useMemo } from 'react';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Building2,
  MapPin,
  RefreshCw,
  Bell,
  BellPlus,
  Plus,
  Trash2,
  Sparkles,
  Sliders,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import {
  cropPriceService,
  PriceAlert,
  RevenueEstimate
} from '../../services/cropPriceService';
import { AnimatedCounter } from '../Common/AnimatedCounter';

// APMC Mandi Live Commodity Ticker Stream Data
const tickerCommodities = [
  { name: 'Rice (Paddy)', price: 2450, change: '+3.2%', isUp: true },
  { name: 'Wheat (Sharbati)', price: 2280, change: '+1.5%', isUp: true },
  { name: 'Maize (Hybrid)', price: 1950, change: '-0.8%', isUp: false },
  { name: 'Cotton (Long Staple)', price: 6800, change: '+4.1%', isUp: true },
  { name: 'Potato (Jyoti)', price: 1420, change: '+2.0%', isUp: true },
  { name: 'Onion (Nashik)', price: 2100, change: '+5.4%', isUp: true },
  { name: 'Soybean (Yellow)', price: 4650, change: '+0.5%', isUp: true },
  { name: 'Sugarcane (CO 0238)', price: 350, change: 'FRP', isUp: true }
];
import { yieldService, YieldPredictionResult } from '../../services/yieldService';
import { weatherService } from '../../services/weatherService';
import { soilService } from '../../services/soilService';
import { FarmData } from '../../services/farmService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InsightCard } from '../ui/InsightCard';
import { AgronomicMotif } from '../Common/AgronomicMotif';
import { colors, motionPresets } from '../../styles/design-tokens';

interface CropPriceModuleProps {
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

export const CropPriceModule: React.FC<CropPriceModuleProps> = ({
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
  const userState = farm?.location_name ? 'Kerala' : (location?.state || 'Kerala');
  const userDistrict = location?.city || 'Ernakulam';

  const [activeSegment, setActiveSegment] = useState<'prices' | 'compare' | 'history' | 'revenue' | 'alerts'>('prices');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [pricesList, setPricesList] = useState<CropPriceRecord[]>([]);
  const [currentCropRecord, setCurrentCropRecord] = useState<CropPriceRecord | null>(null);
  const [mandiComparisons, setMandiComparisons] = useState<MandiComparison[]>([]);
  const [mandiLoading, setMandiLoading] = useState<boolean>(true);
  const [mandiLastUpdated, setMandiLastUpdated] = useState<string>('');
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [yieldResult, setYieldResult] = useState<YieldPredictionResult | null>(null);
  const [revenueEstimate, setRevenueEstimate] = useState<RevenueEstimate | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const [customPriceScenario, setCustomPriceScenario] = useState<number>(0);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [alertTargetPrice, setAlertTargetPrice] = useState<number>(3200);
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');
  const [isStrategyDrawerOpen, setIsStrategyDrawerOpen] = useState<boolean>(false);

  // ── Mandi radius & sort controls ───────────────────────────────────────────
  const [mandiRadius, setMandiRadius] = useState<number>(150);
  type MandiSortMode = 'nearest' | 'highest' | 'lowest';
  const [mandiSort, setMandiSort] = useState<MandiSortMode>('nearest');

  // Detect if we are on fallback/default coordinates (no real location selected)
  const isDefaultLocation =
    Math.abs(safeLat - 28.6692) < 0.001 && Math.abs(safeLon - 77.4538) < 0.001 && !farm && !location;

  const loadMarketData = async () => {
    setLoading(true);
    setError('');

    try {
      const [soilRes, weatherRes, pricesRes, mandiRes, history] = await Promise.all([
        soilService.getSoilAnalysis(safeLat, safeLon, farm?.farm_id || 'default_farm', selectedCrop),
        weatherService.getLiveWeatherData(safeLat, safeLon, selectedCrop),
        cropPriceService.getCropPrices(userState, userDistrict, selectedCrop),
        cropPriceService.getMandiComparisons(selectedCrop, userState, userDistrict, safeLat, safeLon),
        cropPriceService.getPriceHistory(selectedCrop, 30)
      ]);

      setPricesList(pricesRes.prices);
      setLastUpdated(pricesRes.lastUpdated);
      setMandiComparisons(mandiRes.mandis);
      setMandiLastUpdated(mandiRes.lastUpdated);
      setMandiLoading(false);
      setPriceHistory(history);

      const matched = pricesRes.prices.find(p => p.crop.toLowerCase() === selectedCrop.toLowerCase()) || pricesRes.prices[0];
      setCurrentCropRecord(matched);
      setCustomPriceScenario(matched ? matched.modalPrice : 3000);

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

      const yResult = await yieldService.predictYield(featurePayload);
      setYieldResult(yResult);

      const revenue = cropPriceService.calculateRevenue(
        selectedCrop,
        yResult.totalProductionTons,
        matched ? matched.modalPrice : 3000
      );
      setRevenueEstimate(revenue);

      setAlerts(cropPriceService.getPriceAlerts());

    } catch (err: any) {
      console.error('Error loading market data:', err);
      setError(err?.message || 'Failed to fetch current crop market prices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, [safeLat, safeLon, farmArea, selectedCrop]);

  const scenarioRevenue = Number(((yieldResult?.totalProductionTons || 12.0) * 10 * customPriceScenario).toFixed(0));

  const handleSaveAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const alert = cropPriceService.savePriceAlert(selectedCrop, alertTargetPrice, alertCondition);
    setAlerts(prev => [alert, ...prev.filter(a => a.id !== alert.id)]);
    setIsAlertModalOpen(false);
  };

  const handleDeleteAlert = (alertId: string) => {
    cropPriceService.deletePriceAlert(alertId);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const filteredPrices = pricesList.filter(item =>
    item.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.market.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Derived mandi list: radius-filtered + sorted ────────────────────────────
  // Strategy:
  //  1. Prefer mandis that have real coordinates AND are within the radius.
  //  2. If none pass (e.g. coordinates not yet in mandi_coordinates.json),
  //     fall back gracefully to ALL available mandis so the screen is never blank.
  //  3. Sort the resulting list by the chosen sort mode.
  const { filteredMandis, isRadiusFallback } = useMemo(() => {
    const withDist    = mandiComparisons.filter(m => m.distanceKm != null && m.distanceKm <= mandiRadius);
    const withoutDist = mandiComparisons.filter(m => m.distanceKm == null);

    // Use radius-filtered list if any exist; otherwise show everything
    let list = withDist.length > 0 ? withDist : mandiComparisons;
    const isFallback = withDist.length === 0 && mandiComparisons.length > 0;

    const sortList = (arr: MandiComparison[]) => {
      if (mandiSort === 'nearest')
        return [...arr].sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
      if (mandiSort === 'highest')
        return [...arr].sort((a, b) => b.modalPrice - a.modalPrice);
      return [...arr].sort((a, b) => a.modalPrice - b.modalPrice);
    };

    return { filteredMandis: sortList(list), isRadiusFallback: isFallback };
  }, [mandiComparisons, mandiRadius, mandiSort]);

  const RADIUS_OPTIONS: number[] = [25, 50, 100, 150];



  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Loading APMC market prices & revenue forecasts...</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={motionPresets.container}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-100 font-sans"
    >
      {/* 1. Sleek Agronomic Context Bar (Harvest & Mandi Telemetry) */}
      <motion.div variants={motionPresets.item} className="verda-hero-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <span>Intelligence</span>
            <span className="text-slate-600">/</span>
            <span className="text-white">Mandi Market Rates & Spot Settlement</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
              <span className="bg-gradient-to-r from-white via-amber-100 to-amber-300 bg-clip-text text-transparent">APMC Market Telemetry</span>
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-400/30 text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              Live Agmarknet Sync
            </span>
            <Badge variant="harvest" size="sm">
              🌾 {selectedCrop}
            </Badge>
          </div>
          <p className="text-xs text-slate-300 flex items-center gap-2 font-normal">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold text-white">{farmName}</span>
            <span className="text-amber-800">•</span>
            <span>{locationLabel}</span>
            <span className="text-amber-800">•</span>
            <span className="text-amber-300 font-semibold">{farmArea} Hectares Cultivated</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            icon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            onClick={() => setIsStrategyDrawerOpen(true)}
            className="border-white/10 text-white hover:bg-white/5 font-semibold text-xs"
          >
            Selling Strategy
          </Button>

          <Button
            variant="harvest"
            size="sm"
            icon={<BellPlus className="w-3.5 h-3.5" />}
            onClick={() => setIsAlertModalOpen(true)}
          >
            Set Alert
          </Button>

          <Button
            variant="glass"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5 text-amber-300" />}
            onClick={loadMarketData}
            title="Refresh prices"
          >
            Sync
          </Button>
        </div>
      </motion.div>

      {/* APMC Mandi Live Ticker Marquee Bar */}
      <motion.div variants={motionPresets.item} className="verda-ticker-wrap">
        <div className="verda-ticker-content">
          {[...tickerCommodities, ...tickerCommodities].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs font-semibold whitespace-nowrap">
              <span className="text-white font-medium">{item.name}:</span>
              <span className="text-amber-300 font-mono font-bold">₹{item.price.toLocaleString()}/q</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${item.isUp ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-400'}`}>
                {item.change}
              </span>
              <span className="text-amber-900 mx-1">•</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 2. Asymmetric Trading Bento Desk (Spotlight Rate + Live Harvest Valuation Desk) */}
      <motion.div variants={motionPresets.item} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Bento: Primary Spotlight Mandi Commodity Card (7 Cols) */}
        <div className="lg:col-span-7 rounded-3xl rounded-tr-xl relative overflow-hidden border border-amber-500/30 bg-gradient-to-br from-slate-900/95 via-amber-950/20 to-slate-900/90 shadow-xl p-6 sm:p-7 flex flex-col justify-between space-y-5 backdrop-blur-md">
          <AgronomicMotif motif="wheat" className="w-56 h-56 -bottom-10 -right-8" opacity={0.12} />
          
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300 block mb-1">
                Primary Trading Desk • {currentCropRecord?.market || 'Local APMC'}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white font-display">
                {currentCropRecord?.crop || selectedCrop}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Official modal settlement rate registered today
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 shadow-md">
              <IndianRupee className="w-7 h-7" />
            </div>
          </div>

          {/* Huge Crisp Modal Price & Trend */}
          <div className="flex items-baseline gap-4 relative z-10">
            <span className="text-4xl sm:text-5xl font-black text-white tracking-tight font-display">
              <AnimatedCounter value={currentCropRecord?.modalPrice || 3000} prefix="₹" />
            </span>
            <span className="text-xs font-semibold text-slate-400">/ Quintal</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold">
              <TrendingUp className="w-3.5 h-3.5" /> +1.8% vs Yesterday
            </span>
          </div>

          {/* Visual Min-Max APMC Spread Bar */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2 relative z-10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Daily APMC Spread Range</span>
              <span className="font-bold text-white">
                ₹{(currentCropRecord?.minPrice || 2800).toLocaleString('en-IN')} – ₹{(currentCropRecord?.maxPrice || 3200).toLocaleString('en-IN')}
              </span>
            </div>
            {/* Visual Spread Bar */}
            <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden p-0.5 relative">
              <div 
                className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 h-full rounded-full transition-all duration-500"
                style={{ width: '68%' }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
              <span>Lowest: ₹{(currentCropRecord?.minPrice || 2800).toLocaleString('en-IN')}</span>
              <span className="text-amber-300 font-semibold">Modal Settled: ₹{(currentCropRecord?.modalPrice || 3000).toLocaleString('en-IN')}</span>
              <span>Highest: ₹{(currentCropRecord?.maxPrice || 3200).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Right Bento: Field Harvest Valuation Desk (5 Cols) */}
        <div className="lg:col-span-5 agri-bento-card flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Calculated Valuation
              </span>
              <h4 className="text-lg font-bold text-white font-display">
                Field Harvest Gross Revenue
              </h4>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          {/* Revenue Calculation Lockup */}
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-white font-display">
              ₹{(revenueEstimate?.totalRevenueLakhs || 3.80).toFixed(2)} Lakhs
            </div>
            <p className="text-xs text-slate-300">
              Direct gross valuation at current ₹{(currentCropRecord?.modalPrice || 3000).toLocaleString('en-IN')}/qtl rate
            </p>
          </div>

          {/* Two Micro Metric Tiles */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Model Tonnage</span>
              <span className="text-lg font-bold text-white font-display">
                {yieldResult?.totalProductionTons || 12.68} Tons
              </span>
              <span className="text-[10px] text-emerald-400 block font-medium">From {farmArea} ha field</span>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Yield Rate</span>
              <span className="text-lg font-bold text-white font-display">
                {yieldResult?.predictedYieldPerHectare || 5.07} t/ha
              </span>
              <span className="text-[10px] text-slate-400 block font-medium">Regional Avg: 4.6 t/ha</span>
            </div>
          </div>
        </div>

      </motion.div>

      {/* 3. Segmented Navigation Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/10 p-1.5 rounded-2xl overflow-x-auto w-full sm:w-auto backdrop-blur-md">
          {[
            { key: 'prices', label: `Market Prices (${pricesList.length})` },
            { key: 'compare', label: 'Mandi Comparison' },
            { key: 'history', label: '30-Day Trajectory' },
            { key: 'revenue', label: 'Revenue Simulator' },
            { key: 'alerts', label: `Price Alerts (${alerts.length})` }
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSegment(tab.key as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeSegment === tab.key
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeSegment === 'prices' && (
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search commodity or mandi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none placeholder:text-slate-500"
            />
          </div>
        )}
      </div>

      {/* SEGMENT 1: MARKET PRICES TABLE */}
      {activeSegment === 'prices' && (
        <Card variant="elevated" tone="price" className="overflow-hidden space-y-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-white/10 text-slate-400 font-semibold">
                  <th className="py-3 px-4">Commodity</th>
                  <th className="py-3 px-4">Market / Mandi</th>
                  <th className="py-3 px-4 text-right">Modal Price (₹/qtl)</th>
                  <th className="py-3 px-4 text-right">Price Range</th>
                  <th className="py-3 px-4 text-center">30-Day Trend</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPrices.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div>
                        {item.crop}
                        {item.cropLocal && <span className="text-slate-400 text-[11px] font-normal block">{item.cropLocal}</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">{item.market}</td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-400 text-sm font-display">
                      ₹{item.modalPrice.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400">
                      ₹{item.minPrice} – ₹{item.maxPrice}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={item.trend === 'up' ? 'emerald' : 'slate'} size="sm">
                        {item.trend === 'up' ? '↑ +1.8%' : '→ Stable'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCurrentCropRecord(item);
                          setCustomPriceScenario(item.modalPrice);
                        }}
                        className="border-white/10 text-slate-200 hover:bg-white/5"
                      >
                        Select
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* SEGMENT 2: MANDI COMPARISON */}
      {activeSegment === 'compare' && (
        <div className="space-y-4">

          {/* ── Geolocation fallback banner ─────────────────────────────────── */}
          {isDefaultLocation && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 font-medium">
              <MapPin className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Showing distances from a <strong>default location</strong> (Ghaziabad, UP). Select your farm or enable location for accurate mandi distances.
              </span>
            </div>
          )}

          {/* ── Header card: title + radius + sort ─────────────────────────── */}
          <Card variant="elevated" tone="price" className="p-5 space-y-4">
            {/* Row 1: title & dynamic badge */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Market Rate Disparity</span>
                <h3 className="text-base font-bold text-white mt-0.5 font-display">Nearby Mandi Comparison for {selectedCrop}</h3>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="emerald" size="sm">
                  {isRadiusFallback
                    ? `📍 ${filteredMandis.length} Markets (all available)`
                    : `📍 ${filteredMandis.length} Hub${filteredMandis.length !== 1 ? 's' : ''} within ${mandiRadius} km`}
                </Badge>
                {mandiLastUpdated && (
                  <span className="text-[10px] text-slate-500 font-medium">Last updated: {mandiLastUpdated}</span>
                )}
              </div>
            </div>

            {/* Row 2: Radius filter pills + Sort selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1 border-t border-white/8">
              {/* Radius label + pills */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Radius:</span>
                <div className="flex gap-1">
                  {RADIUS_OPTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setMandiRadius(r)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                        mandiRadius === r
                          ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/25'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2 sm:ml-auto">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Sort:</span>
                <select
                  value={mandiSort}
                  onChange={e => setMandiSort(e.target.value as MandiSortMode)}
                  className="bg-slate-800 border border-white/10 text-slate-200 text-[11px] font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="nearest">📍 Nearest First</option>
                  <option value="highest">⬆️ Highest Modal Rate</option>
                  <option value="lowest">⬇️ Lowest Modal Rate</option>
                </select>
              </div>
            </div>

            {/* ── Recharts Mandi Comparison Bar Chart ── */}
            <div className="h-60 w-full">
              {mandiLoading ? (
                <div className="h-full flex flex-col justify-end gap-2 px-2">
                  {[60, 80, 45, 70].map((h, i) => (
                    <div key={i} className="flex items-end gap-3">
                      <div className="w-24 h-3 bg-slate-700/60 rounded animate-pulse" />
                      <div className="flex-1 bg-slate-700/60 rounded-t animate-pulse" style={{ height: `${h}%` }} />
                    </div>
                  ))}
                </div>
              ) : filteredMandis.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl">🔍</span>
                  <p className="text-slate-400 font-semibold text-sm">No mandi data available yet</p>
                  <p className="text-slate-500 text-xs">Try refreshing or check back after Agmarknet updates.</p>
                </div>
              ) : (() => {
                const avg = filteredMandis.reduce((s, m) => s + m.modalPrice, 0) / filteredMandis.length;
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredMandis} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis
                        dataKey="mandiName"
                        tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        tickFormatter={v => v.length > 14 ? v.slice(0, 13) + '…' : v}
                      />
                      <YAxis unit=" ₹" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="saas-card p-3 shadow-xl border border-white/15 text-xs space-y-1 bg-slate-900/95 backdrop-blur-md">
                                <p className="font-bold text-white">{item.mandiName}</p>
                                <p className="text-emerald-400 font-semibold">Modal: ₹{item.modalPrice.toLocaleString('en-IN')}/qtl</p>
                                <p className="text-slate-400 text-[11px]">
                                  📍 {item.distanceKm != null ? `${item.distanceKm} km away` : 'Location unavailable'}
                                  {item.arrivalTons > 0 ? ` • ${item.arrivalTons}t arrivals` : ''}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="modalPrice" radius={[6, 6, 0, 0]} maxBarSize={52}>
                        {filteredMandis.map((m, idx) => (
                          <Cell key={`cell-${idx}`} fill={m.modalPrice >= avg ? '#10b981' : '#f59e0b'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </Card>

          {/* ── Mandi Detail Table ──────────────────────────────────────────── */}
          <Card variant="elevated" className="overflow-hidden">
            <div className="overflow-x-auto">
              {mandiLoading ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-400 font-semibold border-b border-white/10">
                      <th className="py-3 px-4">Mandi Name</th>
                      <th className="py-3 px-4">Distance</th>
                      <th className="py-3 px-4 text-right">Modal Rate</th>
                      <th className="py-3 px-4 text-right">Min – Max Range</th>
                      <th className="py-3 px-4 text-right">Arrivals</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[1, 2, 3, 4].map(i => (
                      <tr key={i}>
                        <td className="py-3.5 px-4"><div className="h-3 w-36 bg-slate-700/60 rounded animate-pulse" /></td>
                        <td className="py-3.5 px-4"><div className="h-3 w-16 bg-slate-700/60 rounded animate-pulse" /></td>
                        <td className="py-3.5 px-4 text-right"><div className="h-3 w-20 bg-slate-700/60 rounded animate-pulse ml-auto" /></td>
                        <td className="py-3.5 px-4 text-right"><div className="h-3 w-24 bg-slate-700/60 rounded animate-pulse ml-auto" /></td>
                        <td className="py-3.5 px-4 text-right"><div className="h-3 w-14 bg-slate-700/60 rounded animate-pulse ml-auto" /></td>
                        <td className="py-3.5 px-4 text-right"><div className="h-6 w-20 bg-slate-700/60 rounded animate-pulse ml-auto" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : filteredMandis.length === 0 && !mandiLoading ? (
                <div className="py-12 px-6 text-center space-y-2">
                  <p className="text-3xl">🔍</p>
                  <p className="text-slate-300 font-semibold text-sm">No mandi data available</p>
                  <p className="text-slate-500 text-xs">Try refreshing or check back when Agmarknet updates its records.</p>
                </div>
              ) : (
                <>
                  {/* Radius-fallback notice */}
                  {isRadiusFallback && (
                    <div className="flex items-center gap-2 mx-4 mt-3 mb-1 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300 font-medium">
                      <span>💡</span>
                      <span>
                        No mandis with mapped coordinates found within <strong>{mandiRadius} km</strong>.
                        Showing all <strong>{filteredMandis.length}</strong> available markets.
                        Distances may show as “unknown” until coordinates are mapped.
                      </span>
                    </div>
                  )}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-400 font-semibold border-b border-white/10">
                      <th className="py-3 px-4">Mandi Name</th>
                      <th className="py-3 px-4">Distance</th>
                      <th className="py-3 px-4 text-right">Modal Rate</th>
                      <th className="py-3 px-4 text-right">Min – Max Range</th>
                      <th className="py-3 px-4 text-right">Arrivals</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMandis.map((mandi, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        {/* Mandi Name */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white block">{mandi.mandiName}</span>
                          <span className="text-slate-500 text-[10px]">{mandi.district}{mandi.state ? `, ${mandi.state}` : ''}</span>
                        </td>

                        {/* Distance — show real distance or 'Unknown' */}
                        <td className="py-3.5 px-4">
                          {mandi.distanceKm != null ? (
                            <>
                              <span className="text-emerald-300 font-bold">{mandi.distanceKm} km</span>
                              <span className="text-slate-500 text-[10px] block">away</span>
                            </>
                          ) : (
                            <span className="text-slate-500 text-[10px] italic">Unknown</span>
                          )}
                        </td>

                        {/* Modal Rate */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-black text-emerald-400 text-sm">₹{mandi.modalPrice.toLocaleString('en-IN')}</span>
                          <span className="text-slate-500 text-[10px] block">/ quintal</span>
                        </td>

                        {/* Price Range */}
                        <td className="py-3.5 px-4 text-right text-slate-400">
                          ₹{mandi.minPrice.toLocaleString('en-IN')} – ₹{mandi.maxPrice.toLocaleString('en-IN')}
                        </td>

                        {/* Arrivals */}
                        <td className="py-3.5 px-4 text-right font-medium text-slate-300">
                          {mandi.arrivalTons > 0 ? `${mandi.arrivalTons} T` : '—'}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              if (currentCropRecord) {
                                setCurrentCropRecord({
                                  ...currentCropRecord,
                                  market: mandi.mandiName,
                                  modalPrice: mandi.modalPrice
                                });
                                setActiveSegment('prices');
                              }
                            }}
                          >
                            Target Mandi
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* SEGMENT 3: PRICE HISTORY */}
      {activeSegment === 'history' && (
        <Card variant="elevated" tone="price" className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Market Evolution</span>
              <h3 className="text-base font-bold text-white mt-0.5 font-display">30-Day APMC Price Trajectory</h3>
            </div>
            <Badge variant="harvest" size="md">
              Current: ₹{(currentCropRecord?.modalPrice || 3000).toLocaleString('en-IN')} / qtl
            </Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis unit=" ₹" domain={['dataMin - 100', 'dataMax + 100']} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="saas-card p-3 shadow-xl border border-white/15 text-xs space-y-1 bg-slate-900/95 backdrop-blur-md">
                          <p className="font-bold text-white">Date: {label}</p>
                          <p className="text-amber-400 font-semibold">Rate: ₹{payload[0].value}/quintal</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#priceGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* SEGMENT 4: REVENUE SIMULATOR */}
      {activeSegment === 'revenue' && (
        <Card variant="elevated" className="p-6 space-y-6">
          <div className="pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white font-display">Revenue Forecast & Price Simulator</h3>
            <p className="text-xs text-slate-400">Adjust target market rates to calculate estimated gross yield returns</p>
          </div>

          <div className="p-5 bg-slate-900/80 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">Simulated Selling Price:</span>
              <span className="text-lg font-black text-emerald-400 font-display">
                ₹{customPriceScenario.toLocaleString('en-IN')} <span className="text-xs font-semibold text-slate-400">/ Quintal</span>
              </span>
            </div>

            <input
              type="range"
              min={Math.round((currentCropRecord?.modalPrice || 3000) * 0.7)}
              max={Math.round((currentCropRecord?.modalPrice || 3000) * 1.4)}
              step={50}
              value={customPriceScenario}
              onChange={(e) => setCustomPriceScenario(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />

            <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
              <span>Min: ₹{Math.round((currentCropRecord?.modalPrice || 3000) * 0.7)}</span>
              <span>Baseline: ₹{currentCropRecord?.modalPrice || 3000}</span>
              <span>Max: ₹{Math.round((currentCropRecord?.modalPrice || 3000) * 1.4)}</span>
            </div>
          </div>

          <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-300 font-semibold block">Forecasted Gross Revenue</span>
              <span className="text-2xl font-black text-emerald-400 font-display">
                ₹{scenarioRevenue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-300 font-semibold block">Production Output</span>
              <span className="text-base font-bold text-white">{yieldResult?.totalProductionTons || 12.0} Tons</span>
            </div>
          </div>
        </Card>
      )}

      {/* SEGMENT 5: PRICE ALERTS */}
      {activeSegment === 'alerts' && (
        <Card variant="elevated" className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white font-display">Configured Price Alerts</h3>
              <p className="text-xs text-slate-400">Automated SMS/Push triggers when market rates cross thresholds</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAlertModalOpen(true)}
            >
              Add Alert
            </Button>
          </div>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No active price alerts. Click 'Add Alert' to track specific price triggers.
              </div>
            ) : (
              alerts.map((alr) => (
                <div key={alr.id} className="p-4 bg-slate-900/60 rounded-2xl border border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">{alr.crop}</span> — Notify when price goes {alr.condition} <strong className="text-emerald-400">₹{alr.targetPrice}/qtl</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAlert(alr.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* MODAL: ADD PRICE ALERT */}
      <AnimatePresence>
        {isAlertModalOpen && (
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
                  <h3 className="text-sm font-bold text-white font-display">Set Commodity Price Alert</h3>
                  <button type="button" onClick={() => setIsAlertModalOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveAlert} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Crop</label>
                    <input
                      type="text"
                      disabled
                      value={selectedCrop}
                      className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-slate-200 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Condition Trigger</label>
                    <select
                      value={alertCondition}
                      onChange={(e) => setAlertCondition(e.target.value as 'above' | 'below')}
                      className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-white font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    >
                      <option value="above" className="bg-slate-900 text-white">Rises ABOVE target price</option>
                      <option value="below" className="bg-slate-900 text-white">Drops BELOW target price</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Target Price (₹/qtl)</label>
                    <input
                      type="number"
                      required
                      value={alertTargetPrice}
                      onChange={(e) => setAlertTargetPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950/80 border border-white/10 rounded-xl text-white font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAlertModalOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                    >
                      Save Alert
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
        {isStrategyDrawerOpen && (
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
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> Market Selling Recommendations
                  </h3>
                  <button type="button" onClick={() => setIsStrategyDrawerOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <p>
                    Based on current market rates at <strong className="text-white">{currentCropRecord?.market || 'Local APMC'}</strong> (<span className="text-emerald-400">₹{currentCropRecord?.modalPrice}/qtl</span>) and your predicted output of <strong className="text-white">{yieldResult?.totalProductionTons || 12.0} Tons</strong>:
                  </p>

                  <div className="p-3.5 bg-slate-950/60 border border-white/10 rounded-xl space-y-2">
                    <div className="font-bold text-white">Key Recommendations:</div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      <li>Current market prices are +1.8% above the 30-day average.</li>
                      <li>Staggering sales across 2 batches post-harvest can mitigate price dip risks.</li>
                      <li>Dry storage for 30 days may offer an estimated +5% price premium.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsStrategyDrawerOpen(false)}
                  >
                    Done
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
