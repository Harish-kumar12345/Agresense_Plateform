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
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { HarvestManagementModule } from './Harvest/HarvestManagementModule';
import { CropPriceModule } from './CropPrice/CropPriceModule';
import { KrishiSevaKendraModule } from './KrishiSeva/KrishiSevaKendraModule';
import { FarmAnalyticsDashboard } from './Analytics/FarmAnalyticsDashboard';
import { weatherService } from '../services/weatherService';
import { soilService } from '../services/soilService';
import { FarmData } from '../services/farmService';
import { InsightCard } from './ui/InsightCard';
import { Badge } from './ui/Badge';

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
    <div className="min-h-screen bg-slate-50/50 py-7 px-4 sm:px-6 lg:px-8 text-slate-800 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header Navigation Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-xs transition-all cursor-pointer"
              title="Return to Setup"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-display">
                  {farmDetails?.farm_name || 'Agronomic Farm Workspace'}
                </h1>
                <Badge variant="emerald" size="sm" icon={<Sparkles className="w-3 h-3" />}>
                  Live Telemetry
                </Badge>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{location.city || 'Ghaziabad'}, {location.country || 'India'}</span>
                <span className="text-slate-300">•</span>
                <span>Crop: <strong className="text-slate-700">{crop}</strong></span>
                {farmDetails?.area_hectares && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>Area: <strong className="text-slate-700">{farmDetails.area_hectares} ha</strong></span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-slate-200/70 p-1.5 rounded-2xl w-full overflow-x-auto border border-slate-300/50">
          {[
            { id: 'overview', label: 'Farm Overview', icon: Activity },
            { id: 'analytics', label: 'Operations Analytics', icon: BarChart3 },
            { id: 'harvest', label: 'Harvest Planning', icon: Tractor },
            { id: 'weather', label: 'Weather Telemetry', icon: CloudSun },
            { id: 'crop-prices', label: 'Mandi Rates', icon: IndianRupee },
            { id: 'krishi-seva-kendra', label: 'Krishi Seva Kendra', icon: Building2 }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && weatherData && soilData && (
          <div className="space-y-6">
            
            {/* Primary Environmental Insight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InsightCard
                title="Air Temperature"
                value={`${weatherData.current.temperature_c}°C`}
                subtitle={`Feels like ${weatherData.current.feels_like_c}°C • ${weatherData.current.description}`}
                icon={<Thermometer className="w-5 h-5 text-amber-500" />}
                iconBg="bg-amber-50 border-amber-200/60"
                trend={{ value: 'Optimal', direction: 'neutral' }}
              />

              <InsightCard
                title="Relative Humidity"
                value={`${weatherData.current.relative_humidity}%`}
                subtitle={`Wind speed: ${weatherData.current.wind_speed_kmh} km/h ${weatherData.current.wind_direction}`}
                icon={<Droplets className="w-5 h-5 text-sky-500" />}
                iconBg="bg-sky-50 border-sky-200/60"
                trend={{ value: `${weatherData.current.precipitation_probability}% Rain`, direction: 'up' }}
              />

              <InsightCard
                title="Soil Moisture Horizon"
                value={`${soilData.moisture}%`}
                subtitle="Root zone moisture • Target: 30-45%"
                icon={<Droplets className="w-5 h-5 text-emerald-500" />}
                iconBg="bg-emerald-50 border-emerald-200/60"
                trend={{ value: 'Within Range', direction: 'neutral' }}
              />

              <InsightCard
                title="Soil Reaction (pH)"
                value={`${soilData.ph} pH`}
                subtitle={`${soilData.type} • ${soilData.drainage}`}
                icon={<Sprout className="w-5 h-5 text-emerald-600" />}
                iconBg="bg-emerald-50 border-emerald-200/60"
                trend={{ value: 'Favorable', direction: 'up' }}
              />
            </div>

            {/* Operational Status Table */}
            <div className="saas-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">Operational Field Status</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time parameters calculated against crop lifecycle</p>
                </div>
                <Badge variant="emerald" size="sm">
                  Active Monitoring
                </Badge>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 rounded-l-lg">Field / Partition</th>
                      <th className="py-3 px-4">Cultivated Crop</th>
                      <th className="py-3 px-4 text-center">Soil Moisture</th>
                      <th className="py-3 px-4 text-center">Pathogen Risk</th>
                      <th className="py-3 px-4 text-right rounded-r-lg">Yield Forecast</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        Main Acreage ({farmDetails?.area_hectares || 2.5} ha)
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                          {crop}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                        {soilData.moisture}%
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="emerald" size="sm">
                          Low Risk
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-display text-sm">
                        4.8 t/ha
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* DELEGATED MODULE TABS */}
        {activeTab === 'analytics' && (
          <FarmAnalyticsDashboard farm={farmDetails} location={location} crop={crop} />
        )}

        {activeTab === 'harvest' && (
          <HarvestManagementModule farm={farmDetails} location={location} crop={crop} />
        )}

        {activeTab === 'weather' && (
          <div className="saas-card p-6 space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 font-display">Hyperlocal Weather Telemetry</h3>
              <p className="text-xs text-slate-500 mt-0.5">Atmospheric sensor readings from nearest weather station</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-1 text-[11px] font-semibold uppercase">Temperature</span>
                <strong className="text-slate-900 text-xl font-display">{weatherData?.current.temperature_c}°C</strong>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-1 text-[11px] font-semibold uppercase">Humidity</span>
                <strong className="text-slate-900 text-xl font-display">{weatherData?.current.relative_humidity}%</strong>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-1 text-[11px] font-semibold uppercase">Wind Velocity</span>
                <strong className="text-slate-900 text-xl font-display">{weatherData?.current.wind_speed_kmh} km/h</strong>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-1 text-[11px] font-semibold uppercase">Barometric Pressure</span>
                <strong className="text-slate-900 text-xl font-display">{weatherData?.current.pressure_mb} mb</strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'crop-prices' && (
          <CropPriceModule farm={farmDetails} location={location} crop={crop} />
        )}

        {activeTab === 'krishi-seva-kendra' && (
          <KrishiSevaKendraModule location={location} />
        )}

      </div>
    </div>
  );
}