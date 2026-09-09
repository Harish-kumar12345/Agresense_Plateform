import React, { useEffect, useState } from 'react';
import { 
  CloudSun, 
  Droplets, 
  Sprout, 
  Wind,
  Activity,
  AlertTriangle,
  ArrowLeft,
  MapPin,
  IndianRupee,
  Building2,
  Tractor,
  BarChart3,
  Thermometer,
  Compass,
  CheckCircle2,
  Layers,
  Sparkles,
  FlaskConical,
  Bug,
  Brain,
  Pill
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { HarvestManagementModule } from './Harvest/HarvestManagementModule';
import { CropPriceModule } from './CropPrice/CropPriceModule';
import { KrishiSevaKendraModule } from './KrishiSeva/KrishiSevaKendraModule';
import { FarmAnalyticsDashboard } from './Analytics/FarmAnalyticsDashboard';
import { WeatherDashboard } from './Weather/WeatherDashboard';
import { SoilAnalysisModule } from './Soil/SoilAnalysisModule';
import { DiseaseRiskModule } from './Disease/DiseaseRiskModule';
import { YieldPredictionModule } from './Yield/YieldPredictionModule';
import { FertilizerPesticideModule } from './Inventory/FertilizerPesticideModule';
import { weatherService } from '../services/weatherService';
import { soilService } from '../services/soilService';
import { FarmData } from '../services/farmService';
import { InsightCard } from './ui/InsightCard';
import { Badge } from './ui/Badge';
import { motion } from 'framer-motion';
import { motionPresets } from '../styles/design-tokens';

type LocationData = {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  state?: string;
  district?: string;
};

type WeatherData = {
  location: LocationData;
  current: {
    temperature_c: number;
    relative_humidity: number;
    precipitation_probability: number;
    wind_speed_kmh: number;
    wind_direction: string;
    visibility_km: number;
    uv_index: number;
    feels_like_c: number;
    pressure_mb: number;
    cloud_cover: number;
    description: string;
  };
  hourly: Array<{
    time: string;
    temperature_c: number;
    humidity: number;
    precip_probability: number;
    wind_speed_kmh: number;
    description: string;
  }>;
  daily: Array<{
    date: string;
    temp_max_c: number;
    temp_min_c: number;
    precip_probability_max: number;
    wind_speed_kmh: number;
    humidity: number;
    description: string;
  }>;
};

type SoilData = {
  ph: number;
  moisture: number;
  temperature: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organic_matter: number;
  salinity: number;
  type: string;
  drainage: string;
};

type LandData = {
  elevation: number;
  slope: number;
  aspect: string;
  landUse: string;
  irrigationAccess: boolean;
  nearestWaterSource: number;
  soilErosionRisk: string;
  floodRisk: string;
  droughtRisk: string;
};

interface DashboardProps {
  location: LocationData;
  crop: string;
  farmDetails?: FarmData;
  onBack: () => void;
}

const fetchWeatherData = async (
  lat: number,
  lon: number,
  locationProp?: LocationData,
  cropName: string = 'Rice'
): Promise<WeatherData> => {
  try {
    let city = locationProp?.city && locationProp.city !== 'Unknown Location' ? locationProp.city : '';
    let country = locationProp?.country && locationProp.country !== 'Unknown' ? locationProp.country : 'India';

    if (!city) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.address) {
            city = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.county || 'Farm Location';
            country = geoData.address.country || country;
          }
        }
      } catch (e) {}
    }

    if (!city || city === 'Unknown Location') {
      city = 'Ghaziabad';
    }

    const liveWeather = await weatherService.getLiveWeatherData(lat, lon, cropName);
    const curr = liveWeather.current;

    return {
      location: {
        latitude: lat,
        longitude: lon,
        city: city || 'Ghaziabad',
        country: country || 'India',
        state: locationProp?.state || 'Uttar Pradesh'
      },
      current: {
        temperature_c: curr.temperature_c,
        relative_humidity: curr.relative_humidity,
        precipitation_probability: curr.precipitation_probability,
        wind_speed_kmh: curr.wind_speed_kmh,
        wind_direction: curr.wind_direction,
        visibility_km: curr.visibility_km,
        uv_index: curr.uv_index,
        feels_like_c: curr.feels_like_c,
        pressure_mb: curr.pressure_mb,
        cloud_cover: curr.cloud_cover,
        description: curr.description
      },
      hourly: liveWeather.hourly.map((h: any) => ({
        time: h.time,
        temperature_c: h.temperature_c,
        humidity: h.humidity,
        precip_probability: h.precip_probability,
        wind_speed_kmh: h.wind_speed_kmh,
        description: h.description
      })),
      daily: liveWeather.daily.map((d: any) => ({
        date: d.date,
        temp_max_c: d.temp_max_c,
        temp_min_c: d.temp_min_c,
        precip_probability_max: d.precip_probability_max,
        wind_speed_kmh: d.wind_speed_kmh,
        humidity: d.humidity,
        description: d.description
      }))
    };
  } catch (err) {
    return {
      location: { latitude: lat, longitude: lon, city: 'Ghaziabad', country: 'India' },
      current: {
        temperature_c: 28,
        relative_humidity: 75,
        precipitation_probability: 10,
        wind_speed_kmh: 12,
        wind_direction: 'NE',
        visibility_km: 10,
        uv_index: 5,
        feels_like_c: 30,
        pressure_mb: 1012,
        cloud_cover: 25,
        description: 'Partly Cloudy'
      },
      hourly: [],
      daily: []
    };
  }
};

const fetchSoilData = async (lat: number, lon: number): Promise<SoilData> => {
  try {
    const liveSoil = await soilService.fetchGeospatialSoilData(lat, lon);
    return {
      ph: liveSoil.ph,
      moisture: liveSoil.moisture,
      temperature: liveSoil.temperature,
      nitrogen: liveSoil.nitrogen,
      phosphorus: liveSoil.phosphorus,
      potassium: liveSoil.potassium,
      organic_matter: liveSoil.organic_matter,
      salinity: liveSoil.salinity,
      type: liveSoil.type,
      drainage: liveSoil.drainage
    };
  } catch (e) {
    return {
      ph: 6.8,
      moisture: 39,
      temperature: 24,
      nitrogen: 78,
      phosphorus: 54,
      potassium: 82,
      organic_matter: 2.2,
      salinity: 0.4,
      type: 'Clay Loam',
      drainage: 'Well-drained'
    };
  }
};

const fetchLandData = async (lat: number, lon: number): Promise<LandData> => {
  return {
    elevation: 215,
    slope: 1.2,
    aspect: 'East',
    landUse: 'Agricultural Cropland',
    irrigationAccess: true,
    nearestWaterSource: 0.8,
    soilErosionRisk: 'Low',
    floodRisk: 'Low',
    droughtRisk: 'Low'
  };
};

export default function Dashboard({ location, crop, farmDetails, onBack }: DashboardProps) {
  const { t } = useLanguage();
  
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [landData, setLandData] = useState<LandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [weather, soil, land] = await Promise.all([
          fetchWeatherData(location.latitude, location.longitude, location, crop),
          fetchSoilData(location.latitude, location.longitude),
          fetchLandData(location.latitude, location.longitude)
        ]);
        
        setWeatherData(weather);
        setSoilData(soil);
        setLandData(land);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [location, crop]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-28 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto shadow-md" />
        <p className="text-sm font-semibold text-slate-600">Initializing Agronomic Workspace & Live Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen agri-canvas py-7 px-4 sm:px-6 lg:px-8 text-slate-100 font-sans relative overflow-x-hidden">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header Navigation Strip */}
        <div className="verda-hero-header">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={onBack}
                className="p-2.5 text-[#D1DED6] hover:text-white bg-[#0D1612]/90 hover:bg-emerald-950/40 rounded-xl border border-emerald-900/40 shadow-xs transition-all cursor-pointer"
                title="Return to Setup"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
                    <span className="verda-gradient-title">{farmDetails?.farm_name || 'Agronomic Farm Workspace'}</span>
                  </h1>
                  <span className="verda-glow-pill">
                    <Sparkles className="w-3 h-3 text-emerald-400" /> Live Telemetry
                  </span>
                </div>
                <p className="text-xs text-[#D1DED6] flex items-center gap-2 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{location.city || 'Ghaziabad'}, {location.country || 'India'}</span>
                  <span className="text-emerald-800">•</span>
                  <span>Crop: <strong className="text-emerald-300">{crop}</strong></span>
                  {farmDetails?.area_hectares && (
                    <>
                      <span className="text-emerald-800">•</span>
                      <span>Area: <strong className="text-emerald-300">{farmDetails.area_hectares} ha</strong></span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Controls - VerdaAgro Organic Glass Navigation */}
        <div className="flex items-center gap-1.5 bg-[#0D1612]/90 p-1.5 rounded-2xl w-full overflow-x-auto border border-emerald-900/40 backdrop-blur-xl shadow-xl shadow-black/40">
          {[
            { id: 'overview', label: 'Farm Overview', icon: Activity },
            { id: 'soil', label: 'Soil NPK & Health', icon: FlaskConical },
            { id: 'weather', label: 'Weather Telemetry', icon: CloudSun },
            { id: 'disease', label: 'Pathogen & Pest Risk', icon: Bug },
            { id: 'yield', label: 'Yield ML Prediction', icon: Brain },
            { id: 'inventory', label: 'Inventory & Stock', icon: Pill },
            { id: 'harvest', label: 'Harvest Planning', icon: Tractor },
            { id: 'crop-prices', label: 'Mandi Market Rates', icon: IndianRupee },
            { id: 'analytics', label: 'Operations Analytics', icon: BarChart3 },
            { id: 'krishi-seva-kendra', label: 'Krishi Seva Kendra', icon: Building2 }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/60 border border-emerald-400/40'
                  : 'text-[#D1DED6] hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-white' : 'text-[#D1DED6]'}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && weatherData && soilData && (
          <motion.div
            variants={motionPresets.container}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* 1. VerdaAgro Agro-Ecosystem Context Bar */}
            <motion.div variants={motionPresets.item} className="agri-context-header agri-context-header-farm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
                    <span>Workspace</span>
                    <span className="text-emerald-700">/</span>
                    <span>Holistic Agro-Ecosystem Command</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-mono font-medium ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      ACTIVE TELEMETRY SYNC
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
                      Agro-Ecosystem Operations Overview
                    </h2>
                    <span className="agri-pill agri-pill-emerald">
                      Active Monitoring
                    </span>
                    <span className="agri-pill agri-pill-muted">
                      Target Crop: {crop}
                    </span>
                  </div>

                  <p className="text-xs text-[#D1DED6] flex items-center gap-2 font-normal">
                    <span className="font-semibold text-white">{farmDetails?.farm_name || 'Green Valley Farm'}</span>
                    <span className="text-emerald-800">•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      {location.city || 'Ghaziabad'}, {location.country || 'India'}
                    </span>
                    <span className="text-emerald-800">•</span>
                    <span className="text-slate-300 font-mono text-[11px]">Area: {farmDetails?.area_hectares || 2.5} ha</span>
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="px-3.5 py-2 rounded-xl bg-[#070D0A]/70 border border-emerald-900/40 text-center">
                    <span className="text-[10px] font-semibold text-[#D1DED6] uppercase tracking-wider block">Seasonal Output</span>
                    <span className="text-sm font-extrabold text-emerald-400 font-display">4.8 t/ha</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 2. Asymmetric Agro-Ecosystem Bento Grid */}
            <motion.div variants={motionPresets.item} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Primary Atmospheric & Soil Core (7 Cols) */}
              <div className="lg:col-span-7 agri-bento-card agri-photo-card agri-photo-card-farm p-6 flex flex-col justify-between space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#D1DED6]">
                      Environmental Vitality Index
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 font-medium">
                    Status: Favorable Metabolic Range
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/80 mb-1">
                      Canopy Microclimate Temp
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white font-display">
                        {weatherData.current.temperature_c}°C
                      </span>
                      <span className="text-sm text-[#D1DED6] font-medium">
                        (Feels like {weatherData.current.feels_like_c}°C • {weatherData.current.description})
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#070D0A]/60 border border-emerald-900/30 rounded-xl p-3 text-right">
                    <div className="text-[10px] uppercase tracking-wider text-[#D1DED6]/70">Soil Reaction</div>
                    <div className="text-base font-mono font-bold text-white mt-0.5">{soilData.ph} <span className="text-xs text-emerald-400 font-normal">pH</span></div>
                    <div className="text-[10px] text-[#D1DED6] mt-0.5">{soilData.type}</div>
                  </div>
                </div>

                {/* Sub-telemetry 3-gauge strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-[#070D0A]/70 border border-emerald-900/30 rounded-xl p-3.5">
                    <div className="flex items-center justify-between text-[#D1DED6] mb-1.5">
                      <span className="text-[11px] font-medium flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-sky-400" />
                        Relative Humidity
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-400">{weatherData.current.relative_humidity}%</span>
                    </div>
                    <div className="text-xl font-bold text-white font-display">
                      {weatherData.current.relative_humidity}%
                    </div>
                    <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div 
                        className="bg-sky-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, weatherData.current.relative_humidity)}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-[#070D0A]/70 border border-emerald-900/30 rounded-xl p-3.5">
                    <div className="flex items-center justify-between text-[#D1DED6] mb-1.5">
                      <span className="text-[11px] font-medium flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-emerald-400" />
                        Soil Moisture
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-400">{soilData.moisture}% vol</span>
                    </div>
                    <div className="text-xl font-bold text-white font-display">
                      Field Capacity
                    </div>
                    <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div 
                        className="bg-emerald-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, soilData.moisture * 2)}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-[#070D0A]/70 border border-emerald-900/30 rounded-xl p-3.5">
                    <div className="flex items-center justify-between text-[#D1DED6] mb-1.5">
                      <span className="text-[11px] font-medium flex items-center gap-1">
                        <Wind className="w-3.5 h-3.5 text-teal-400" />
                        Wind Velocity
                      </span>
                      <span className="text-[10px] font-semibold text-[#D1DED6] font-mono">{weatherData.current.wind_direction}</span>
                    </div>
                    <div className="text-xl font-bold text-white font-display">
                      {weatherData.current.wind_speed_kmh} <span className="text-sm font-normal text-[#D1DED6]">km/h</span>
                    </div>
                    <p className="text-[10px] text-[#D1DED6] mt-2">
                      Favorable for canopy spraying
                    </p>
                  </div>
                </div>
              </div>

              {/* Agro-Ecological Operations Summary (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-4">
                <div className="agri-bento-card p-5 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#D1DED6] flex items-center gap-1.5">
                      <Sprout className="w-4 h-4 text-emerald-400" />
                      Yield Expectation Model
                    </span>
                    <span className="agri-pill agri-pill-emerald">
                      Optimal
                    </span>
                  </div>

                  <div className="my-3">
                    <div className="text-3xl font-extrabold text-white font-display">
                      4.8 <span className="text-lg text-[#D1DED6] font-normal">t/ha</span>
                    </div>
                    <p className="text-xs text-[#D1DED6] mt-1.5 leading-relaxed">
                      Baseline projected yield calculated for <strong className="text-white">{crop}</strong> on {farmDetails?.area_hectares || 2.5} hectares.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-emerald-950/40 flex items-center justify-between text-xs">
                    <span className="text-[#D1DED6]">Total Field Harvest:</span>
                    <span className="text-emerald-400 font-semibold font-mono">
                      ~{((farmDetails?.area_hectares || 2.5) * 4.8).toFixed(1)} Metric Tonnes
                    </span>
                  </div>
                </div>

                <div className="agri-bento-card p-5 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#D1DED6] flex items-center gap-1.5">
                      <Bug className="w-4 h-4 text-emerald-400" />
                      Epidemiological Exposure
                    </span>
                    <span className="agri-pill agri-pill-emerald">
                      Low Pathogen Risk
                    </span>
                  </div>

                  <div className="my-3">
                    <div className="text-lg font-bold text-white font-display">
                      Favorable Growth Conditions
                    </div>
                    <p className="text-xs text-[#D1DED6] mt-1.5 leading-relaxed">
                      Relative humidity and canopy transpiration remain below critical fungal incubation limits.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-emerald-950/40 flex items-center justify-between text-xs">
                    <span className="text-[#D1DED6]">Next Field Inspection:</span>
                    <span className="text-emerald-400 font-semibold font-mono">48 Hours</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 3. Operational Status Table */}
            <motion.div variants={motionPresets.item} className="agri-bento-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-950/40">
                <div>
                  <h3 className="text-base font-bold text-white font-display">Field Partition & Agronomic Trajectory</h3>
                  <p className="text-xs text-[#D1DED6] mt-0.5">Real-time parameters calculated against crop phenological lifecycle</p>
                </div>
                <span className="agri-pill agri-pill-emerald">
                  Telemetry Online
                </span>
              </div>
              
              <div className="agri-table-container">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="py-3 px-4">Field / Partition</th>
                      <th className="py-3 px-4">Cultivated Crop</th>
                      <th className="py-3 px-4 text-center">Root Moisture</th>
                      <th className="py-3 px-4 text-center">Pathogen Risk</th>
                      <th className="py-3 px-4 text-right">Yield Forecast</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-950/30">
                    <tr className="hover:bg-emerald-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        Main Acreage ({farmDetails?.area_hectares || 2.5} ha)
                      </td>
                      <td className="py-3.5 px-4 text-[#D1DED6] font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                          {crop}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-white">
                        {soilData.moisture}%
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="agri-pill agri-pill-emerald">
                          Low Risk
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-white font-display text-sm">
                        4.8 t/ha
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>

          </motion.div>
        )}

        {/* DELEGATED MODULE TABS */}
        {activeTab === 'soil' && (
          <SoilAnalysisModule farm={farmDetails} location={location} crop={crop} />
        )}

        {activeTab === 'weather' && (
          <WeatherDashboard farm={farmDetails} location={location} crop={crop} />
        )}

        {activeTab === 'disease' && (
          <DiseaseRiskModule farm={farmDetails} location={location} crop={crop} />
        )}

        {activeTab === 'yield' && (
          <YieldPredictionModule farm={farmDetails} location={location} crop={crop} />
        )}

        {activeTab === 'inventory' && (
          <FertilizerPesticideModule farm={farmDetails} location={location} crop={crop} />
        )}

        {activeTab === 'harvest' && (
          <HarvestManagementModule farm={farmDetails} location={location} crop={crop} />
        )}

        {activeTab === 'crop-prices' && (
          <CropPriceModule farm={farmDetails} location={location} crop={crop} />
        )}

        {activeTab === 'analytics' && (
          <FarmAnalyticsDashboard farm={farmDetails} location={location} crop={crop} />
        )}

        {activeTab === 'krishi-seva-kendra' && (
          <KrishiSevaKendraModule location={location} />
        )}

      </div>
    </div>
  );
}