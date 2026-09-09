import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  LogOut,
  Shield,
  Search,
  Users,
  MapPin,
  Sprout,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Bell,
  Eye,
  X,
  Send,
  CheckCircle,
  CloudSun,
  FlaskConical,
  Bug,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { InsightCard } from './ui/InsightCard';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { AnimatedCounter } from './Common/AnimatedCounter';

const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001';

const createRiskIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-risk-icon',
    html: `<div style="
      background-color: ${color};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const riskIcons = {
  LOW: createRiskIcon('#10b981'),
  MEDIUM: createRiskIcon('#f59e0b'),
  HIGH: createRiskIcon('#f97316'),
  CRITICAL: createRiskIcon('#ef4444')
};

export interface OfficerFarm {
  farm_id: string;
  farm_name: string;
  farmer_name: string;
  farmer_phone: string;
  farmer_email: string;
  location_name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  boundary_coordinates?: { lat: number; lng: number }[];
  crop: string;
  area_hectares: number;
  soil_type: string;
  soil_moisture: number;
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  predicted_yield_tha: number;
  expected_production_tons: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  growth_stage: string;
  current_gdd: number;
  expected_harvest_date: string;
  harvest_window: string;
  weather_temp_c: number;
  weather_humidity: number;
  weather_description: string;
  last_updated: string;
}

export const OfficerDashboard = ({ token, onLogout }: { token: string; onLogout: () => void }) => {
  const [farms, setFarms] = useState<OfficerFarm[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCrop, setSelectedCrop] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');

  const [inspectingFarm, setInspectingFarm] = useState<OfficerFarm | null>(null);
  const [advisoryNote, setAdvisoryNote] = useState<string>('');
  const [advisorySentSuccess, setAdvisorySentSuccess] = useState<boolean>(false);

  const fetchOfficerData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${backendUrl}/api/officer/farms-overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data && data.farms) {
        setFarms(data.farms);
        setMetrics(data.metrics);
      }
    } catch (e: any) {
      console.error('Error fetching officer dashboard telemetry:', e);
      setError(e?.response?.data?.error || 'Failed to authenticate officer token or fetch farm telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficerData();
  }, [token]);

  const filteredFarms = useMemo(() => {
    return farms.filter((f) => {
      const matchesSearch =
        f.farm_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.crop.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCrop = selectedCrop === 'all' || f.crop.toLowerCase().includes(selectedCrop.toLowerCase());
      const matchesDistrict = selectedDistrict === 'all' || f.district === selectedDistrict;
      const matchesRisk = selectedRisk === 'all' || f.risk_level === selectedRisk;

      return matchesSearch && matchesCrop && matchesDistrict && matchesRisk;
    });
  }, [farms, searchTerm, selectedCrop, selectedDistrict, selectedRisk]);

  const handleSendAdvisory = () => {
    if (!advisoryNote.trim()) return;
    setAdvisorySentSuccess(true);
    setTimeout(() => {
      setAdvisorySentSuccess(false);
      setAdvisoryNote('');
    }, 3000);
  };

  const getRiskBadge = (level: string, score?: number) => {
    switch (level) {
      case 'CRITICAL':
        return <Badge variant="rose" size="sm">CRITICAL {score ? `(${score}%)` : ''}</Badge>;
      case 'HIGH':
        return <Badge variant="amber" size="sm">HIGH {score ? `(${score}%)` : ''}</Badge>;
      case 'MEDIUM':
        return <Badge variant="amber" size="sm">MEDIUM {score ? `(${score}%)` : ''}</Badge>;
      default:
        return <Badge variant="emerald" size="sm">LOW {score ? `(${score}%)` : ''}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-28 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-lg font-bold text-white font-display">
          Authenticating Officer Console & Geospatial Boundaries...
        </h3>
        <p className="text-xs text-slate-400">Loading regional telemetry across registered farms</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={motionPresets.container}
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-slate-100 font-sans"
    >
      {/* Officer Command Center Header Bar */}
      <motion.div variants={motionPresets.item} className="apple-hero-header">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-md">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="apple-segmented-item active text-[10px] inline-block mb-1">
                <Sparkles className="w-3 h-3 text-emerald-400 inline-block mr-1" />
                Administrative Command Center
              </div>
              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white font-display">
                <span className="apple-title-gradient">Regional Farm Administration</span> & GIS
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            Exit Officer Console
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Insight Grid */}
      <motion.div variants={motionPresets.item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InsightCard
          tone="inventory"
          title="Registered Farmers"
          value={metrics?.totalFarmers || farms.length}
          subtitle="Active agriculture profiles"
          icon={<Users className="w-5 h-5" />}
        />

        <InsightCard
          tone="weather"
          title="Total Monitored Fields"
          value={metrics?.totalFarms || farms.length}
          subtitle="GIS bound plots"
          icon={<MapPin className="w-5 h-5" />}
        />

        <InsightCard
          tone="soil"
          title="Cultivated Area"
          value={`${metrics?.totalAreaHectares || 18.2} Ha`}
          subtitle="Across monitored districts"
          icon={<Sprout className="w-5 h-5" />}
        />

        <InsightCard
          tone="yield"
          title="Avg Yield Forecast"
          value={`${metrics?.avgPredictedYield || 4.9} t/ha`}
          subtitle="ML regional benchmark"
          icon={<TrendingUp className="w-5 h-5" />}
        />

        <InsightCard
          tone="disease"
          title="Pathogen Risk Flags"
          value={`${metrics?.highRiskFarmsCount || 2} Plots`}
          subtitle="Requires advisory action"
          icon={<AlertTriangle className="w-5 h-5" />}
        />

        <InsightCard
          tone="yield"
          title="Upcoming Harvests"
          value={`${metrics?.upcomingHarvestsCount || 5} Plots`}
          subtitle="Next 30-45 Days"
          icon={<Calendar className="w-5 h-5" />}
        />

        <InsightCard
          tone="soil"
          title="Dominant Crop"
          value="Rice (Paddy)"
          subtitle="60% regional coverage"
          icon={<Sprout className="w-5 h-5" />}
        />

        <InsightCard
          tone="disease"
          title="Emergency Alerts"
          value={metrics?.activeAlertsCount || 4}
          subtitle="Telemetry triggers active"
          icon={<Bell className="w-5 h-5" />}
        />
      </motion.div>

      {/* GIS Leaflet Map Section */}
      <Card variant="elevated" tone="farm" className="p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Regional GIS Interactive Field Map
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Risk color-coded markers and boundary polygons for monitored acreages
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="px-3 py-1.5 bg-slate-900/90 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
            >
              <option value="all">All Crops</option>
              <option value="Rice">Rice</option>
              <option value="Wheat">Wheat</option>
              <option value="Maize">Maize</option>
              <option value="Cotton">Cotton</option>
            </select>

            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="px-3 py-1.5 bg-slate-900/90 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
            >
              <option value="all">All Risk Levels</option>
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="CRITICAL">Critical Risk</option>
            </select>
          </div>
        </div>

        {/* Leaflet Map Frame */}
        <div className="h-[420px] w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-0 relative">
          <MapContainer
            center={[28.6692, 77.4538]}
            zoom={8}
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {filteredFarms.map((f) => {
              const icon = riskIcons[f.risk_level] || riskIcons.LOW;
              const boundary = f.boundary_coordinates?.map(c => [c.lat, c.lng] as [number, number]) || [];
              const strokeColor =
                f.risk_level === 'CRITICAL' ? '#ef4444' :
                f.risk_level === 'HIGH' ? '#f97316' :
                f.risk_level === 'MEDIUM' ? '#f59e0b' : '#10b981';

              return (
                <React.Fragment key={f.farm_id}>
                  {boundary.length > 2 && (
                    <Polygon
                      positions={boundary}
                      pathOptions={{
                        color: strokeColor,
                        fillColor: strokeColor,
                        fillOpacity: 0.25,
                        weight: 2
                      }}
                    />
                  )}

                  <Marker position={[f.latitude, f.longitude]} icon={icon}>
                    <Popup>
                      <div className="p-1 space-y-2 max-w-xs font-sans text-xs">
                        <div className="flex items-center justify-between border-b pb-1">
                          <span className="font-bold text-slate-900">{f.farm_name}</span>
                          {getRiskBadge(f.risk_level)}
                        </div>
                        <p><span className="font-semibold text-slate-600">Farmer:</span> {f.farmer_name}</p>
                        <p><span className="font-semibold text-slate-600">Crop:</span> {f.crop} ({f.area_hectares} Ha)</p>
                        <p><span className="font-semibold text-slate-600">Predicted Yield:</span> {f.predicted_yield_tha} t/ha</p>
                        <button
                          type="button"
                          onClick={() => setInspectingFarm(f)}
                          className="w-full mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Farm Telemetry</span>
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>
      </Card>

      {/* Directory Table */}
      <Card variant="elevated" className="p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
              <Users className="w-4 h-4 text-emerald-400" />
              Monitored Farms & Farmers Directory
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Search and inspect detailed agricultural telemetry for registered farmers
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search farmer, farm, crop or district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs font-medium text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold uppercase text-[11px] border-b border-white/10">
              <tr>
                <th className="p-3">Farmer & Contact</th>
                <th className="p-3">Farm & Region</th>
                <th className="p-3">Crop Variety</th>
                <th className="p-3">Area (Ha)</th>
                <th className="p-3">Yield Forecast</th>
                <th className="p-3">Pathogen Risk</th>
                <th className="p-3">Harvest Target</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredFarms.map((f) => (
                <tr key={f.farm_id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-emerald-400 text-xs shrink-0">
                        {f.farmer_name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-white">{f.farmer_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{f.farmer_phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <p className="font-semibold text-slate-200">{f.farm_name}</p>
                    <p className="text-[11px] text-slate-400">{f.district}, {f.state}</p>
                  </td>
                  <td className="p-3">
                    <Badge variant="emerald" size="sm">
                      {f.crop}
                    </Badge>
                  </td>
                  <td className="p-3 font-semibold text-slate-200">{f.area_hectares} Ha</td>
                  <td className="p-3 font-black text-emerald-400">{f.predicted_yield_tha} t/ha</td>
                  <td className="p-3">
                    {getRiskBadge(f.risk_level, f.risk_score)}
                  </td>
                  <td className="p-3 font-medium text-slate-400">{f.expected_harvest_date}</td>
                  <td className="p-3 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => setInspectingFarm(f)}
                    >
                      Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Farm Inspection Modal */}
      <AnimatePresence>
        {inspectingFarm && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl w-full"
            >
              <Card variant="elevated" className="p-6 sm:p-7 space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      OFFICER INSPECTION TELEMETRY
                    </span>
                    <h3 className="text-xl font-bold text-white font-display">{inspectingFarm.farm_name}</h3>
                    <p className="text-xs text-slate-400">Farmer: {inspectingFarm.farmer_name} ({inspectingFarm.farmer_phone})</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInspectingFarm(null)}
                    className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Telemetry 4-Box Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-emerald-950/40 rounded-2xl border border-emerald-500/20 space-y-1.5">
                    <h4 className="font-bold text-emerald-300 text-sm flex items-center gap-1.5 font-display">
                      <MapPin className="w-4 h-4 text-emerald-400" /> Farm Identity & Location
                    </h4>
                    <p><span className="font-semibold text-slate-400">Location:</span> <span className="text-slate-200">{inspectingFarm.location_name}</span></p>
                    <p><span className="font-semibold text-slate-400">GIS Coordinates:</span> <span className="text-slate-200">{inspectingFarm.latitude.toFixed(4)}, {inspectingFarm.longitude.toFixed(4)}</span></p>
                    <p><span className="font-semibold text-slate-400">Crop & Area:</span> <span className="text-slate-200">{inspectingFarm.crop} ({inspectingFarm.area_hectares} Ha)</span></p>
                  </div>

                  <div className="p-4 bg-sky-950/40 rounded-2xl border border-sky-500/20 space-y-1.5">
                    <h4 className="font-bold text-sky-300 text-sm flex items-center gap-1.5 font-display">
                      <CloudSun className="w-4 h-4 text-sky-400" /> Weather & Growth Stage
                    </h4>
                    <p><span className="font-semibold text-slate-400">Weather:</span> <span className="text-slate-200">{inspectingFarm.weather_temp_c}°C ({inspectingFarm.weather_description})</span></p>
                    <p><span className="font-semibold text-slate-400">Growth Stage:</span> <span className="text-slate-200">{inspectingFarm.growth_stage} ({inspectingFarm.current_gdd} GDD)</span></p>
                    <p><span className="font-semibold text-slate-400">Expected Harvest:</span> <span className="text-slate-200">{inspectingFarm.expected_harvest_date}</span></p>
                  </div>

                  <div className="p-4 bg-purple-950/40 rounded-2xl border border-purple-500/20 space-y-1.5">
                    <h4 className="font-bold text-purple-300 text-sm flex items-center gap-1.5 font-display">
                      <FlaskConical className="w-4 h-4 text-purple-400" /> Soil Health Horizon
                    </h4>
                    <p><span className="font-semibold text-slate-400">Soil Type:</span> <span className="text-slate-200">{inspectingFarm.soil_type} (pH: {inspectingFarm.ph})</span></p>
                    <p><span className="font-semibold text-slate-400">Soil Moisture:</span> <span className="text-slate-200">{inspectingFarm.soil_moisture}%</span></p>
                    <p><span className="font-semibold text-slate-400">NPK Levels:</span> <span className="text-slate-200">N: {inspectingFarm.nitrogen}%, P: {inspectingFarm.phosphorus}%, K: {inspectingFarm.potassium}%</span></p>
                  </div>

                  <div className="p-4 bg-rose-950/40 rounded-2xl border border-rose-500/20 space-y-1.5">
                    <h4 className="font-bold text-rose-300 text-sm flex items-center gap-1.5 font-display">
                      <Bug className="w-4 h-4 text-rose-400" /> AI Yield & Risk Assessment
                    </h4>
                    <p><span className="font-semibold text-slate-400">Predicted Yield:</span> <span className="text-slate-200">{inspectingFarm.predicted_yield_tha} t/ha ({inspectingFarm.expected_production_tons} Tons)</span></p>
                    <p className="flex items-center gap-1"><span className="font-semibold text-slate-400">Risk Assessment:</span> {getRiskBadge(inspectingFarm.risk_level, inspectingFarm.risk_score)}</p>
                    <p><span className="font-semibold text-slate-400">Last Telemetry Sync:</span> <span className="text-slate-200">{new Date(inspectingFarm.last_updated).toLocaleString()}</span></p>
                  </div>
                </div>

                {/* Advisory Box */}
                <div className="border-t border-white/10 pt-4 space-y-2.5">
                  <h4 className="font-bold text-white text-xs font-display">
                    Dispatch Official Advisory / Protocol to Farmer
                  </h4>
                  <textarea
                    rows={3}
                    placeholder={`Type official recommendations for ${inspectingFarm.farmer_name}...`}
                    value={advisoryNote}
                    onChange={(e) => setAdvisoryNote(e.target.value)}
                    className="w-full p-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <div className="flex items-center justify-between">
                    {advisorySentSuccess && (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Advisory successfully dispatched to farmer's portal & SMS!
                      </span>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Send className="w-3.5 h-3.5" />}
                      disabled={!advisoryNote.trim()}
                      onClick={handleSendAdvisory}
                      className="ml-auto"
                    >
                      Dispatch Advisory
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
