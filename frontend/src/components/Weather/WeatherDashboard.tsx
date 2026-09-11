import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  CloudRain,
  Droplets,
  Wind,
  RefreshCw,
  MapPin,
  Clock,
  Calendar,
  Thermometer,
  Sun,
  ShieldAlert,
  AlertTriangle,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { weatherService, ComprehensiveWeatherData, DailyForecast } from '../../services/weatherService';
import { FarmData } from '../../services/farmService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InsightCard } from '../ui/InsightCard';
import { colors, motionPresets } from '../../styles/design-tokens';

import { AnimatedCounter } from '../Common/AnimatedCounter';
import { AgronomicMotif } from '../Common/AgronomicMotif';

interface WeatherDashboardProps {
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

export const WeatherDashboard: React.FC<WeatherDashboardProps> = ({
  farm,
  location,
  crop = 'Rice'
}) => {
  const lat = farm?.latitude || location?.latitude || 28.6692;
  const lon = farm?.longitude || location?.longitude || 77.4538;
  const selectedCrop = farm?.crop || crop || 'Rice';
  const farmTitle = farm?.farm_name || 'Green Valley Rice Farm';
  const locationLabel = farm?.location_name || (location ? `${location.city}, ${location.country}` : 'Ghaziabad, Uttar Pradesh');

  const [weatherData, setWeatherData] = useState<ComprehensiveWeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadWeather = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await weatherService.getLiveWeatherData(lat, lon, selectedCrop, farmTitle);
      setWeatherData(data);
    } catch (err: any) {
      console.error('Weather error:', err);
      setError(err.message || 'Failed to load weather data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, [lat, lon, selectedCrop]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Loading live weather telemetry...</p>
      </div>
    );
  }

  if (error || !weatherData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center justify-between shadow-lg">
          <span>{error || 'Unable to load weather data.'}</span>
          <button type="button" onClick={loadWeather} className="font-bold text-rose-200 hover:text-white underline cursor-pointer">Retry</button>
        </div>
      </div>
    );
  }

  const { current, hourly, daily, microClimate } = weatherData;

  // Weather-reactive gradient tint
  const desc = (current.description || '').toLowerCase();
  const isRainy = desc.includes('rain') || desc.includes('drizzle') || desc.includes('shower');
  const isSunny = desc.includes('clear') || desc.includes('sun');
  const headerGradient = isRainy
    ? 'bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border-sky-900/40'
    : isSunny
    ? 'bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 border-emerald-900/40'
    : 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-slate-700/40';

  // Hourly chart data transformation
  const hourlyChartData = hourly.map(h => ({
    time: h.time,
    temp: h.temperature_c,
    humidity: h.humidity,
    rainProb: h.precip_probability,
    desc: h.description
  }));

  const getWeatherIcon = (d: DailyForecast) => {
    const text = (d.description || '').toLowerCase();
    if (text.includes('rain') || d.precip_probability_max > 40) {
      return <CloudRain className="w-6 h-6 text-sky-500" />;
    }
    if (text.includes('cloud')) {
      return <CloudSun className="w-6 h-6 text-amber-500" />;
    }
    return <Sun className="w-6 h-6 text-amber-500" />;
  };

  return (
    <motion.div
      variants={motionPresets.container}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-100 font-sans"
    >
      {/* 1. VerdaAgro Agronomic Context Bar - Atmospheric Sky/Teal Theme */}
      <motion.div variants={motionPresets.item} className="verda-hero-header agri-context-header-weather rounded-3xl rounded-tr-xl relative overflow-hidden">
        <AgronomicMotif variant="contour" className="right-0 top-0 text-sky-400" opacity={0.08} />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-sky-300 uppercase">
              <span>Telemetry</span>
              <span className="text-sky-700">/</span>
              <span>Atmospheric & Canopy Station</span>
              <Badge variant="sky" shape="live" size="sm" className="ml-1">
                LIVE SENSORS
              </Badge>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                Microclimate & Canopy Intelligence
              </h1>
              <Badge variant="sky" size="md">
                {current.description}
              </Badge>
              <Badge variant="harvest" size="md">
                Crop: {selectedCrop}
              </Badge>
            </div>

            <p className="text-xs text-slate-200 flex items-center gap-2 font-medium">
              <span className="font-bold text-white">{farmTitle}</span>
              <span className="text-sky-800">•</span>
              <span className="flex items-center gap-1 text-sky-300">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                {locationLabel}
              </span>
              <span className="text-sky-800">•</span>
              <span className="text-slate-300 font-mono text-[11px]">Coord: {lat.toFixed(3)}°N, {lon.toFixed(3)}°E</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="sky"
              size="sm"
              onClick={loadWeather}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Sync Weather Sensors
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 2. Asymmetric VerdaAgro Telemetry Bento Grid */}
      <motion.div variants={motionPresets.item} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Primary Atmospheric Core Station (7 Cols) - Asymmetric Radius & Signature Motif */}
        <div className="lg:col-span-7 p-6 flex flex-col gap-6 rounded-3xl rounded-tr-xl bg-[#0a1520]/92 border border-sky-900/40 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.7)] backdrop-blur-xl relative overflow-hidden">
          <AgronomicMotif variant="contour" className="right-1 bottom-1 text-sky-500" opacity={0.06} />
          
          <div className="flex items-center justify-between pb-3 border-b border-sky-950/60 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500/20 to-sky-950/40 border border-sky-500/35 flex items-center justify-center shadow-inner">
                <Thermometer className="w-4 h-4 text-sky-300" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Canopy Ambient Thermal Core
              </span>
            </div>
            <span className="text-[11px] font-mono text-sky-300 font-semibold bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-500/30">
              Thermal Index: {current.temperature_c > 32 ? 'High Heat Risk' : 'Optimal Metabolic Range'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 relative z-10">
            <div>
              <div className="text-[11px] font-semibold text-sky-300/90 mb-1">
                Real-Time Field Temperature
              </div>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-5xl sm:text-6xl font-black tracking-tight text-white font-display">
                  <AnimatedCounter value={current.temperature_c} decimals={1} suffix="°C" />
                </span>
                <span className="text-sm text-slate-300 font-medium">
                  (Feels like {current.feels_like_c}°C)
                </span>
              </div>
            </div>

            <div className="bg-[#070D0A]/75 border border-sky-900/40 rounded-xl p-3 text-right shadow-sm">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-300">Barometric Pressure</div>
              <div className="text-base font-mono font-black text-white mt-0.5">{current.pressure_mb} <span className="text-xs text-sky-300 font-normal">hPa</span></div>
              <div className="text-[10px] text-sky-300 font-medium mt-0.5">Atmospheric equilibrium stable</div>
            </div>
          </div>

          {/* Sub-telemetry 3-gauge strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 relative z-10 mt-auto">
            <div className="bg-[#070D0A]/80 border border-sky-900/40 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-300 mb-1.5">
                <span className="text-[11px] font-semibold flex items-center gap-1.5 text-sky-200">
                  <Droplets className="w-3.5 h-3.5 text-sky-400" />
                  Canopy Air Moisture
                </span>
                <span className="text-[10px] font-bold text-sky-300">{current.relative_humidity > 75 ? 'Saturated' : 'Optimal'}</span>
              </div>
              <div className="text-2xl font-bold text-white font-display">
                {current.relative_humidity}%
              </div>
              <div className="w-full bg-slate-800/90 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-sky-400 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, current.relative_humidity)}%` }}
                />
              </div>
            </div>

            <div className="bg-[#070D0A]/80 border border-sky-900/40 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-300 mb-1.5">
                <span className="text-[11px] font-semibold flex items-center gap-1.5 text-sky-200">
                  <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                  Precipitation Risk
                </span>
                <span className="text-[10px] font-bold text-sky-300">{current.precipitation_probability}% prob</span>
              </div>
              <div className="text-2xl font-bold text-white font-display">
                {current.precipitation_probability}%
              </div>
              <div className="w-full bg-slate-800/90 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-sky-400 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, current.precipitation_probability)}%` }}
                />
              </div>
            </div>

            <div className="bg-[#070D0A]/80 border border-sky-900/40 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-300 mb-1.5">
                <span className="text-[11px] font-semibold flex items-center gap-1.5 text-teal-200">
                  <Wind className="w-3.5 h-3.5 text-teal-400" />
                  Spray-Zone Wind
                </span>
                <span className="text-[10px] font-bold text-teal-300 font-mono">{current.wind_direction}</span>
              </div>
              <div className="text-2xl font-bold text-white font-display">
                {current.wind_speed_kmh} <span className="text-xs font-normal text-slate-300">km/h</span>
              </div>
              <p className="text-[10px] text-slate-300 font-medium mt-2 truncate">
                {current.wind_speed_kmh > 20 ? 'Advisory: High spray drift' : 'Favorable for canopy spraying'}
              </p>
            </div>
          </div>
        </div>

        {/* Agronomic Operation Readiness Station (5 Cols) - Sky & Field Operations */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          {/* Irrigation Need - Sky Palette */}
          <div className="p-5 flex-1 flex flex-col justify-between rounded-2xl bg-[#0c1824]/92 border border-sky-900/40 backdrop-blur-xl shadow-[0_8px_24px_-4px_rgba(0,0,0,0.65)] hover:border-sky-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-sky-500/20 border border-sky-500/35 flex items-center justify-center">
                  <Droplets className="w-3.5 h-3.5 text-sky-400" />
                </div>
                Root-Zone Irrigation Demand
              </span>
              <Badge 
                variant={microClimate.irrigationNeed.level === 'High' ? 'amber' : microClimate.irrigationNeed.level === 'Low' ? 'emerald' : 'sky'} 
                size="sm"
              >
                {microClimate.irrigationNeed.level} Demand
              </Badge>
            </div>

            <div className="my-3">
              <div className="text-xl font-bold text-white font-display">
                {microClimate.irrigationNeed.level === 'High' ? 'Irrigation Recommended Today' : 'Moisture Retention Adequate'}
              </div>
              <p className="text-xs text-slate-200 mt-1.5 leading-relaxed">
                {microClimate.irrigationNeed.description}
              </p>
            </div>

            <div className="pt-2 border-t border-sky-950/60 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Canopy Transpiration:</span>
              <span className="text-sky-300 font-bold font-mono">
                {current.relative_humidity < 40 ? 'High Loss Rate' : 'Balanced Vapor Pressure'}
              </span>
            </div>
          </div>

          {/* Spraying & Field Operations */}
          <div className="p-5 flex-1 flex flex-col justify-between rounded-2xl bg-[#0D1612]/92 border border-emerald-900/40 backdrop-blur-xl shadow-[0_8px_24px_-4px_rgba(0,0,0,0.65)] hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                Field Spray Window
              </span>
              <Badge 
                variant={microClimate.fieldOperations.level.toLowerCase().includes('good') || microClimate.fieldOperations.level.toLowerCase().includes('optimal') ? 'emerald' : 'amber'} 
                size="sm"
              >
                {microClimate.fieldOperations.level}
              </Badge>
            </div>

            <div className="my-3">
              <div className="text-xl font-bold text-white font-display">
                Foliar Spray & Treatment Suitability
              </div>
              <p className="text-xs text-slate-200 mt-1.5 leading-relaxed">
                {microClimate.fieldOperations.description}
              </p>
            </div>

            <div className="pt-2 border-t border-emerald-950/60 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Drift Risk Index:</span>
              <span className="text-emerald-300 font-bold font-mono">
                {current.wind_speed_kmh < 15 ? 'Safe (< 15 km/h)' : 'Cautionary (High drift)'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. 24-Hour Forecast Line/Area Chart */}
      {hourly.length > 0 && (
        <motion.div variants={motionPresets.item}>
          <div className="agri-bento-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-950/40">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white font-display">24-Hour Microclimate Diurnal Trajectory</h3>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-white font-medium">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Temperature (°C)
                </span>
                <span className="flex items-center gap-1.5 text-[#D1DED6] font-medium">
                  <span className="w-3 h-3 rounded-full bg-sky-400 inline-block" /> Humidity (%)
                </span>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#13231B" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#D1DED6', fontSize: 11 }}
                    axisLine={{ stroke: '#1B3125' }}
                    tickLine={false}
                  />
                  <YAxis
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
                              Temperature: {payload[0]?.value}°C
                            </p>
                            <p className="text-sky-400 font-semibold">
                              Relative Humidity: {payload[1]?.value}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="temp"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#tempGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="humidity"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#humidityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. 7-Day Agricultural Forecast Strip */}
      {daily.length > 0 && (
        <motion.div variants={motionPresets.item}>
          <div className="agri-bento-card p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-emerald-950/40">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h3 className="text-base font-bold text-white font-display">7-Day Agronomic Forecast Outlook</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {daily.map((d, idx) => {
                const isToday = idx === 0;
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl text-center flex flex-col items-center justify-between space-y-2 transition-all ${
                      isToday
                        ? 'border border-sky-500/50 bg-sky-950/40 shadow-md ring-1 ring-sky-500/30'
                        : 'border border-sky-950/40 bg-[#070D0A]/60 hover:border-sky-800/50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className={`text-xs font-bold block ${isToday ? 'text-sky-300 font-display' : 'text-white'}`}>
                        {isToday ? 'Today' : d.day_name}
                      </span>
                      <span className="text-[10px] text-[#D1DED6] font-medium block">
                        {d.date.split('-').slice(1).join('/')}
                      </span>
                    </div>

                    <div className="my-1">
                      {getWeatherIcon(d)}
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-sm font-extrabold text-white font-display">
                        {d.temp_max_c}°
                        <span className="text-xs font-medium text-[#D1DED6] ml-1">/ {d.temp_min_c}°</span>
                      </div>

                      <div className="text-[10px] font-semibold text-sky-400 flex items-center justify-center gap-0.5">
                        <Droplets className="w-3 h-3" />
                        <span>{d.precip_probability_max}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
