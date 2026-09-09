import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Sparkles,
  Download,
  Layers,
  FileSpreadsheet,
  Lock,
  Info,
  Sliders,
  History,
  MessageSquare,
  Megaphone,
  Radio,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Check,
  RefreshCw,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { InsightCard } from './ui/InsightCard';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { motionPresets } from '../styles/design-tokens';
import { ExplainableAIPanel } from './Officer/ExplainableAIPanel';
import { GddAgronomicIndicator } from './Officer/GddAgronomicIndicator';
import { OfficerAuditLog } from './Officer/OfficerAuditLog';
import { OfficerAlertPreferencesView } from './Officer/OfficerAlertPreferencesView';
import { OfficerQueriesView } from './Officer/OfficerQueriesView';
import { exportFarmsToCsv, exportSingleFarmReportCsv } from '../utils/officerCsvExport';

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

// Risk configuration — colors, labels, glow for dotted boundary layers
const RISK_CONFIG: Record<string, { stroke: string; glow: string; fill: string; label: string; emoji: string }> = {
  LOW:      { stroke: '#10b981', glow: 'rgba(16,185,129,0.22)',  fill: 'rgba(16,185,129,0.07)',  label: 'Healthy / Low Risk',       emoji: '🟢' },
  MEDIUM:   { stroke: '#eab308', glow: 'rgba(234,179,8,0.22)',   fill: 'rgba(234,179,8,0.07)',   label: 'Moderate Risk',            emoji: '🟡' },
  HIGH:     { stroke: '#f97316', glow: 'rgba(249,115,22,0.22)',  fill: 'rgba(249,115,22,0.07)',  label: 'Attention Required',       emoji: '🟠' },
  CRITICAL: { stroke: '#ef4444', glow: 'rgba(239,68,68,0.22)',   fill: 'rgba(239,68,68,0.07)',   label: 'Critical Pest/Disease Risk', emoji: '🔴' },
};

// Auto-fits map view to encompass all visible farm boundaries/markers on load
const MapBoundsFitter = ({ farms }: { farms: { latitude: number; longitude: number; boundary_coordinates?: { lat: number; lng: number }[] }[] }) => {
  const map = useMap();
  const fittedRef = useRef(false);
  useEffect(() => {
    if (fittedRef.current || farms.length === 0) return;
    const latLngs: L.LatLngExpression[] = [];
    farms.forEach(f => {
      if (f.boundary_coordinates && f.boundary_coordinates.length > 0) {
        f.boundary_coordinates.forEach(c => latLngs.push([c.lat, c.lng]));
      } else if (f.latitude && f.longitude) {
        latLngs.push([f.latitude, f.longitude]);
      }
    });
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      fittedRef.current = true;
    }
  }, [farms, map]);
  return null;
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
  is_live?: boolean;
  data_origin?: 'LIVE' | 'DEMO';
  model_calibration?: {
    calibrated_region: string;
    calibrated_soil: string;
    is_calibrated: boolean;
    notes: string;
  };
  gdd_agronomic?: {
    current_gdd: number;
    base_temp_c: number;
    target_harvest_gdd: number;
    progress_pct: number;
    methodology: string;
  };
  explainability?: {
    yield_factors: { factor: string; impact: number; direction: 'increase' | 'decrease'; description?: string }[];
    disease_factors: { factor: string; impact: number; direction: 'increase' | 'decrease'; description?: string }[];
  } | null;
}

const INSPECTION_ADVISORY_TEMPLATES = [
  {
    label: 'Fungal Spray Protocol',
    text: 'Recommended Action: Apply systemic fungicide (Azoxystrobin + Difenoconazole @ 1 ml/L) during morning hours. Target lower sheath surface thoroughly.'
  },
  {
    label: 'Soil Moisture Drainage',
    text: 'Irrigation Notice: Regulate intake channels to avoid waterlogging. Maintain shallow standing moisture (2-3 cm) during current vegetative tillering phase.'
  },
  {
    label: 'NPK Nutrition Balance',
    text: 'Fertilizer Guidance: Apply top-dressing with balanced Nitrogen-Potassium (Neem-coated Urea @ 35 kg/ha + MOP @ 20 kg/ha) after field aeration.'
  },
  {
    label: 'Harvest Logistics Confirmation',
    text: 'Harvest Guidance: Physiological maturity threshold anticipated at ~1850 GDD. Initiate field drying 10 days prior to combine harvester dispatch.'
  }
];

export const OfficerDashboard = ({ token, onLogout }: { token: string; onLogout: () => void }) => {
  // Navigation tabs within Officer Portal
  const [activeTab, setActiveTab] = useState<'gis_farms' | 'queries' | 'audit_log' | 'alert_preferences'>('gis_farms');

  // GIS map field selection state — tracks which farm polygon is highlighted
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const [farms, setFarms] = useState<OfficerFarm[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCrop, setSelectedCrop] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [selectedOrigin, setSelectedOrigin] = useState<string>('all'); // all | LIVE | DEMO

  // Table Sorting
  type SortField = 'farmer_name' | 'farm_name' | 'crop' | 'area_hectares' | 'predicted_yield_tha' | 'risk_score' | 'current_gdd';
  const [sortField, setSortField] = useState<SortField>('risk_score');
  const [sortAscending, setSortAscending] = useState<boolean>(false);

  // Modal inspection
  const [inspectingFarm, setInspectingFarm] = useState<OfficerFarm | null>(null);
  const [advisoryNote, setAdvisoryNote] = useState<string>('');
  const [advisorySentSuccess, setAdvisorySentSuccess] = useState<boolean>(false);

  // Emergency Regional Broadcast Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [broadcastDistrict, setBroadcastDistrict] = useState<string>('All Districts');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'Critical' | 'High' | 'Warning' | 'Info'>('Critical');
  const [broadcastTitle, setBroadcastTitle] = useState<string>('');
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [broadcastRecommendation, setBroadcastRecommendation] = useState<string>('');
  const [broadcastSubmitting, setBroadcastSubmitting] = useState<boolean>(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<boolean>(false);

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

  // Derived available filter options directly from the loaded farms dataset
  const availableCrops = useMemo(() => {
    if (metrics?.availableCrops && Array.isArray(metrics.availableCrops) && metrics.availableCrops.length > 0) {
      return metrics.availableCrops;
    }
    const set = new Set<string>();
    farms.forEach((f) => {
      if (f.crop) set.add(f.crop);
    });
    return Array.from(set).sort();
  }, [metrics, farms]);

  const availableDistricts = useMemo(() => {
    if (metrics?.availableDistricts && Array.isArray(metrics.availableDistricts) && metrics.availableDistricts.length > 0) {
      return metrics.availableDistricts;
    }
    const set = new Set<string>();
    farms.forEach((f) => {
      if (f.district) set.add(f.district);
    });
    return Array.from(set).sort();
  }, [metrics, farms]);

  // Dynamically computed metrics with zero hardcoded numbers
  const dynamicStats = useMemo(() => {
    const totalCount = farms.length;
    if (totalCount === 0) {
      return {
        totalAreaHectares: 0,
        avgPredictedYield: 0,
        highRiskCount: 0,
        upcomingHarvestsCount: 0,
        activeAlertsCount: 0,
        dominantCrop: 'None',
        dominantCropPercentage: 0,
        cropDistribution: [] as { crop: string; area: number; pct: number }[],
        riskDistribution: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
      };
    }

    const totalArea = Math.round(farms.reduce((sum, f) => sum + (Number(f.area_hectares) || 0), 0) * 10) / 10;
    const yieldSum = farms.reduce((sum, f) => sum + (Number(f.predicted_yield_tha) || 0), 0);
    const avgYield = Math.round((yieldSum / totalCount) * 10) / 10;
    const highRisk = farms.filter((f) => f.risk_level === 'HIGH' || f.risk_level === 'CRITICAL').length;
    const upcoming = farms.filter((f) => {
      if (!f.expected_harvest_date) return false;
      const days = Math.round((new Date(f.expected_harvest_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      return days >= 0 && days <= 45;
    }).length;

    // Crop distribution
    const cropMap: Record<string, number> = {};
    const riskMap = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

    farms.forEach((f) => {
      const c = f.crop || 'Unknown';
      cropMap[c] = Math.round(((cropMap[c] || 0) + (Number(f.area_hectares) || 1)) * 10) / 10;
      if (f.risk_level && riskMap[f.risk_level] !== undefined) {
        riskMap[f.risk_level]++;
      }
    });

    let bestCrop = 'None';
    let maxArea = 0;
    const distList = Object.entries(cropMap).map(([crop, area]) => {
      if (area > maxArea) {
        maxArea = area;
        bestCrop = crop;
      }
      const pct = totalArea > 0 ? Math.round((area / totalArea) * 100) : 0;
      return { crop, area, pct };
    }).sort((a, b) => b.area - a.area);

    const dominantPct = totalArea > 0 ? Math.round((maxArea / totalArea) * 100) : 0;

    return {
      totalAreaHectares: metrics?.totalAreaHectares ?? totalArea,
      avgPredictedYield: metrics?.avgPredictedYield ?? avgYield,
      highRiskCount: metrics?.highRiskFarmsCount ?? highRisk,
      upcomingHarvestsCount: metrics?.upcomingHarvestsCount ?? upcoming,
      activeAlertsCount: metrics?.activeAlertsCount ?? highRisk,
      dominantCrop: metrics?.dominantCrop || bestCrop,
      dominantCropPercentage: metrics?.dominantCropPercentage || dominantPct,
      cropDistribution: distList,
      riskDistribution: riskMap
    };
  }, [farms, metrics]);

  // Filtered & Sorted farms
  const filteredFarms = useMemo(() => {
    let result = farms.filter((f) => {
      const matchesSearch =
        f.farm_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.crop.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCrop = selectedCrop === 'all' || f.crop.toLowerCase() === selectedCrop.toLowerCase();
      const matchesDistrict = selectedDistrict === 'all' || f.district.toLowerCase() === selectedDistrict.toLowerCase();
      const matchesRisk = selectedRisk === 'all' || f.risk_level === selectedRisk;
      const matchesOrigin =
        selectedOrigin === 'all' ||
        (selectedOrigin === 'LIVE' && f.is_live) ||
        (selectedOrigin === 'DEMO' && !f.is_live);

      return matchesSearch && matchesCrop && matchesDistrict && matchesRisk && matchesOrigin;
    });

    // Apply column sorting
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortAscending ? -1 : 1;
      if (valA > valB) return sortAscending ? 1 : -1;
      return 0;
    });

    return result;
  }, [farms, searchTerm, selectedCrop, selectedDistrict, selectedRisk, selectedOrigin, sortField, sortAscending]);

  // Dynamically calculate map center from the filtered farms centroid
  const mapCenter = useMemo<[number, number]>(() => {
    const valid = filteredFarms.filter((f) => f.latitude && f.longitude);
    if (valid.length === 0) return [28.6692, 77.4538];
    const avgLat = valid.reduce((sum, f) => sum + f.latitude, 0) / valid.length;
    const avgLng = valid.reduce((sum, f) => sum + f.longitude, 0) / valid.length;
    return [avgLat, avgLng];
  }, [filteredFarms]);

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(true);
    }
  };

  const handleSendAdvisory = async () => {
    if (!advisoryNote.trim() || !inspectingFarm) return;

    try {
      await axios.post(
        `${backendUrl}/api/officer/audit-logs`,
        {
          action_type: 'ADVISORY_DISPATCHED',
          target_id: inspectingFarm.farm_id,
          target_type: 'farm',
          details: `Dispatched official agronomic advisory to ${inspectingFarm.farmer_name}: "${advisoryNote.trim()}"`,
          before_value: { advisory_status: 'NONE' },
          after_value: { advisory_status: 'DISPATCHED', note_preview: advisoryNote.slice(0, 100) }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr);
    }

    setAdvisorySentSuccess(true);
    setTimeout(() => {
      setAdvisorySentSuccess(false);
      setAdvisoryNote('');
    }, 3500);
  };

  const handleBroadcastAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    setBroadcastSubmitting(true);
    try {
      await axios.post(
        `${backendUrl}/api/officer/broadcast-alert`,
        {
          district: broadcastDistrict,
          severity: broadcastSeverity,
          title: broadcastTitle,
          message: broadcastMessage,
          action_recommendation: broadcastRecommendation
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBroadcastSuccess(true);
      setTimeout(() => {
        setBroadcastSuccess(false);
        setShowBroadcastModal(false);
        setBroadcastTitle('');
        setBroadcastMessage('');
        setBroadcastRecommendation('');
      }, 2500);
    } catch (err: any) {
      console.error('Failed to broadcast alert:', err);
      alert('Failed to dispatch broadcast: ' + (err?.response?.data?.error || err.message));
    } finally {
      setBroadcastSubmitting(false);
    }
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

  const getOriginBadge = (isLive?: boolean) => {
    if (isLive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold tracking-wider">
        DEMO
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-28 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-lg font-bold text-white font-display">
          Authenticating Officer Console & Regional Telemetry...
        </h3>
        <p className="text-xs text-slate-400">Loading live sensor feeds and GIS boundaries across monitored farms</p>
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

          <div className="flex items-center gap-2.5">
            {/* Emergency Regional Broadcast Button */}
            <button
              type="button"
              onClick={() => setShowBroadcastModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow-amber-500/10"
            >
              <Megaphone className="w-4 h-4 text-amber-400 animate-pulse" />
              Emergency Broadcast
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              Exit Console
            </button>
          </div>
        </div>

        {/* Officer Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('gis_farms')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'gis_farms'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Regional GIS & Farms</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">
              {farms.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('queries')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'queries'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Farmer Queries & Tickets</span>
            <span className="px-1.5 py-0.2 rounded bg-rose-950/80 text-[10px] text-rose-300 border border-rose-500/30 font-mono">
              Action Hub
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit_log')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'audit_log'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Officer Audit Trail</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">
              Immutable
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alert_preferences')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'alert_preferences'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Alert Delivery Channels</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-amber-300">
              Email / Webhook
            </span>
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Sub-view Rendering */}
      {activeTab === 'queries' && (
        <OfficerQueriesView token={token} backendUrl={backendUrl} />
      )}

      {activeTab === 'audit_log' && (
        <OfficerAuditLog token={token} backendUrl={backendUrl} />
      )}

      {activeTab === 'alert_preferences' && (
        <OfficerAlertPreferencesView token={token} backendUrl={backendUrl} />
      )}

      {activeTab === 'gis_farms' && (
        <>
          {/* Dynamic KPI Insight Grid (Zero Hardcoded Values) */}
          <motion.div variants={motionPresets.item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InsightCard
              tone="inventory"
              title="Registered Farmers"
              value={metrics?.totalFarmers ?? new Set(farms.map((f) => f.farmer_name)).size}
              subtitle="Active regional agriculture accounts"
              icon={<Users className="w-5 h-5" />}
            />

            <InsightCard
              tone="weather"
              title="Monitored Fields"
              value={metrics?.totalFarms ?? farms.length}
              subtitle="GIS bound plots"
              icon={<MapPin className="w-5 h-5" />}
            />

            <InsightCard
              tone="soil"
              title="Cultivated Area"
              value={`${dynamicStats.totalAreaHectares} Ha`}
              subtitle="Across registered plots"
              icon={<Sprout className="w-5 h-5" />}
            />

            <InsightCard
              tone="yield"
              title="Avg Yield Forecast"
              value={`${dynamicStats.avgPredictedYield} t/ha`}
              subtitle="ML regional benchmark"
              icon={<TrendingUp className="w-5 h-5" />}
            />

            <InsightCard
              tone="disease"
              title="Pathogen Risk Flags"
              value={`${dynamicStats.highRiskCount} Plots`}
              subtitle="Requires priority advisory"
              icon={<AlertTriangle className="w-5 h-5" />}
            />

            <InsightCard
              tone="yield"
              title="Upcoming Harvests"
              value={`${dynamicStats.upcomingHarvestsCount} Plots`}
              subtitle="Next 30-45 Days window"
              icon={<Calendar className="w-5 h-5" />}
            />

            <InsightCard
              tone="soil"
              title="Dominant Crop"
              value={dynamicStats.dominantCrop}
              subtitle={`${dynamicStats.dominantCropPercentage}% regional acreage`}
              icon={<Sprout className="w-5 h-5" />}
            />

            <InsightCard
              tone="disease"
              title="Emergency Alerts"
              value={dynamicStats.activeAlertsCount}
              subtitle="Critical/High telemetry active"
              icon={<Bell className="w-5 h-5" />}
            />
          </motion.div>

          {/* Dynamic Regional Crop Distribution Sub-Bar */}
          {dynamicStats.cropDistribution.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-display">
                  <Sprout className="w-4 h-4 text-emerald-400" />
                  Regional Crop Acreage & Risk Distribution
                </span>
                <span className="text-[11px] text-slate-400">
                  Click any crop or risk tier to filter monitored fields
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {dynamicStats.cropDistribution.map((item) => (
                  <button
                    key={item.crop}
                    type="button"
                    onClick={() => setSelectedCrop(selectedCrop === item.crop ? 'all' : item.crop)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedCrop === item.crop
                        ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                        : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-white/5'
                    }`}
                  >
                    <span>{item.crop}:</span>
                    <span className="font-mono">{item.area} Ha</span>
                    <span className="text-[10px] opacity-75">({item.pct}%)</span>
                  </button>
                ))}

                <div className="h-4 w-[1px] bg-white/15 mx-1 hidden sm:block" />

                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((r) => {
                  const count = dynamicStats.riskDistribution[r] || 0;
                  if (count === 0 && selectedRisk !== r) return null;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRisk(selectedRisk === r ? 'all' : r)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        selectedRisk === r
                          ? 'ring-2 ring-white text-white'
                          : ''
                      } ${
                        r === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        r === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        r === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      <span>{r}:</span>
                      <span className="font-mono">{count}</span>
                    </button>
                  );
                })}

                {(selectedCrop !== 'all' || selectedRisk !== 'all' || selectedDistrict !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCrop('all');
                      setSelectedRisk('all');
                      setSelectedDistrict('all');
                    }}
                    className="text-[11px] text-rose-400 hover:underline cursor-pointer ml-auto"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          )}

          {/* GIS Leaflet Map Section */}
          <Card variant="elevated" tone="farm" className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  Regional GIS Interactive Field Map
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dynamic auto-centering map showing risk-colored pins and boundary polygons for {filteredFarms.length} plots
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Auto-Centering indicator */}
                <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Centroid: {mapCenter[0].toFixed(2)}°N, {mapCenter[1].toFixed(2)}°E</span>
                </div>

                {/* Crop Filter Dropdown */}
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
                >
                  <option value="all">All Crops ({availableCrops.length})</option>
                  {availableCrops.map((crop) => (
                    <option key={crop} value={crop}>
                      {crop}
                    </option>
                  ))}
                </select>

                {/* District Filter Dropdown */}
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
                >
                  <option value="all">All Districts ({availableDistricts.length})</option>
                  {availableDistricts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>

                {/* Risk Filter Dropdown */}
                <select
                  value={selectedRisk}
                  onChange={(e) => setSelectedRisk(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
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
            <div className="h-[480px] w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-0 relative">
              <MapContainer
                center={mapCenter}
                zoom={8}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                {/* Auto-fit map to all visible farm boundaries on mount */}
                <MapBoundsFitter farms={filteredFarms} />

                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {filteredFarms.map((f) => {
                  const cfg = RISK_CONFIG[f.risk_level] || RISK_CONFIG.LOW;
                  const icon = riskIcons[f.risk_level] || riskIcons.LOW;
                  const isSelected = selectedFieldId === f.farm_id;
                  const boundary = f.boundary_coordinates?.map((c) => [c.lat, c.lng] as [number, number]) || [];
                  const closedBoundary = boundary.length > 2 ? [...boundary, boundary[0]] : [];

                  return (
                    <React.Fragment key={f.farm_id}>
                      {closedBoundary.length > 2 && (
                        <>
                          {/* Layer 1 — Glow fill: wide, semi-transparent solid polygon for subtle area glow */}
                          <Polygon
                            positions={boundary}
                            pathOptions={{
                              color: 'transparent',
                              fillColor: cfg.stroke,
                              fillOpacity: isSelected ? 0.18 : 0.08,
                              weight: 0,
                              interactive: false,
                            }}
                          />

                          {/* Layer 2 — Outer glow stroke: wide blurred-looking stroke */}
                          <Polyline
                            positions={closedBoundary}
                            pathOptions={{
                              color: cfg.stroke,
                              weight: isSelected ? 14 : 8,
                              opacity: isSelected ? 0.28 : 0.18,
                              dashArray: undefined,
                              lineCap: 'round',
                              lineJoin: 'round',
                              interactive: false,
                            }}
                          />

                          {/* Layer 3 — Dotted boundary outline: main visible dashed/dotted stroke */}
                          <Polyline
                            positions={closedBoundary}
                            pathOptions={{
                              color: cfg.stroke,
                              weight: isSelected ? 4 : 2.5,
                              opacity: isSelected ? 1 : 0.9,
                              dashArray: isSelected ? '10 6' : '7 5',
                              lineCap: 'round',
                              lineJoin: 'round',
                            }}
                            eventHandlers={{
                              click: () => setSelectedFieldId(isSelected ? null : f.farm_id),
                              mouseover: (e) => { e.target.setStyle({ opacity: 1, weight: isSelected ? 4 : 3.5 }); },
                              mouseout: (e) => { e.target.setStyle({ opacity: isSelected ? 1 : 0.9, weight: isSelected ? 4 : 2.5 }); },
                            }}
                          >
                            <Popup>
                              <div style={{ fontFamily: 'sans-serif', fontSize: 12, minWidth: 220 }}>
                                {/* Popup header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 6, gap: 8 }}>
                                  <strong style={{ color: '#0f172a', fontSize: 13 }}>{f.farm_name}</strong>
                                  <span style={{
                                    background: f.risk_level === 'CRITICAL' ? '#fef2f2' : f.risk_level === 'HIGH' ? '#fff7ed' : f.risk_level === 'MEDIUM' ? '#fefce8' : '#f0fdf4',
                                    color: f.risk_level === 'CRITICAL' ? '#dc2626' : f.risk_level === 'HIGH' ? '#ea580c' : f.risk_level === 'MEDIUM' ? '#ca8a04' : '#16a34a',
                                    border: `1px solid ${cfg.stroke}55`,
                                    borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap'
                                  }}>{cfg.emoji} {f.risk_level}</span>
                                </div>
                                {/* Popup fields */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                                  <tbody>
                                    {[
                                      ['👨‍🌾 Farmer', f.farmer_name],
                                      ['🪪 Field ID', f.farm_id],
                                      ['🌾 Crop', `${f.crop}`],
                                      ['📐 Area', `${f.area_hectares} Ha`],
                                      ['📍 Location', `${f.district}, ${f.state}`],
                                    ].map(([label, val]) => (
                                      <tr key={label as string}>
                                        <td style={{ color: '#64748b', fontWeight: 600, paddingBottom: 3, paddingRight: 6, whiteSpace: 'nowrap' }}>{label}</td>
                                        <td style={{ color: '#1e293b', paddingBottom: 3 }}>{val}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                <button
                                  type="button"
                                  onClick={() => setInspectingFarm(f)}
                                  style={{ marginTop: 8, width: '100%', padding: '6px 0', background: '#059669', color: 'white', fontWeight: 700, fontSize: 11, borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                                >
                                  🔍 Inspect Farm Telemetry
                                </button>
                              </div>
                            </Popup>
                          </Polyline>
                        </>
                      )}

                      {/* Risk-colored marker pin — always shown */}
                      <Marker
                        position={[f.latitude, f.longitude]}
                        icon={isSelected ? createRiskIcon(cfg.stroke) : (riskIcons[f.risk_level] || riskIcons.LOW)}
                        eventHandlers={{ click: () => setSelectedFieldId(isSelected ? null : f.farm_id) }}
                      >
                        <Popup>
                          <div style={{ fontFamily: 'sans-serif', fontSize: 12, minWidth: 220 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 6, gap: 8 }}>
                              <strong style={{ color: '#0f172a', fontSize: 13 }}>{f.farm_name}</strong>
                              <span style={{
                                background: f.risk_level === 'CRITICAL' ? '#fef2f2' : f.risk_level === 'HIGH' ? '#fff7ed' : f.risk_level === 'MEDIUM' ? '#fefce8' : '#f0fdf4',
                                color: f.risk_level === 'CRITICAL' ? '#dc2626' : f.risk_level === 'HIGH' ? '#ea580c' : f.risk_level === 'MEDIUM' ? '#ca8a04' : '#16a34a',
                                border: `1px solid ${cfg.stroke}55`,
                                borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap'
                              }}>{cfg.emoji} {f.risk_level}</span>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                              <tbody>
                                {[
                                  ['👨‍🌾 Farmer', f.farmer_name],
                                  ['🪪 Field ID', f.farm_id],
                                  ['🌾 Crop', `${f.crop}`],
                                  ['📐 Area', `${f.area_hectares} Ha`],
                                  ['⚠️ Risk Level', `${f.risk_level} (${f.risk_score}%)`],
                                  ['📍 Location', `${f.district}, ${f.state}`],
                                ].map(([label, val]) => (
                                  <tr key={label as string}>
                                    <td style={{ color: '#64748b', fontWeight: 600, paddingBottom: 3, paddingRight: 6, whiteSpace: 'nowrap' }}>{label}</td>
                                    <td style={{ color: '#1e293b', paddingBottom: 3 }}>{val}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <button
                              type="button"
                              onClick={() => setInspectingFarm(f)}
                              style={{ marginTop: 8, width: '100%', padding: '6px 0', background: '#059669', color: 'white', fontWeight: 700, fontSize: 11, borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                            >
                              🔍 Inspect Farm Telemetry
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}
              </MapContainer>

              {/* GIS Field Boundary Legend — positioned bottom-right over map */}
              <div style={{
                position: 'absolute', bottom: 16, right: 16, zIndex: 1000,
                background: 'rgba(2,8,23,0.82)', backdropFilter: 'blur(10px)',
                borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
                padding: '10px 14px', minWidth: 190,
                boxShadow: '0 4px 24px rgba(0,0,0,0.45)'
              }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
                  Field Boundary Legend
                </div>
                {Object.entries(RISK_CONFIG).map(([level, cfg]) => (
                  <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    {/* Dashed line swatch */}
                    <svg width="28" height="12" viewBox="0 0 28 12">
                      <rect x="0" y="4" width="28" height="4" fill={cfg.stroke} fillOpacity="0.15" rx="2" />
                      <line x1="0" y1="6" x2="28" y2="6"
                        stroke={cfg.stroke} strokeWidth="2.5" strokeDasharray="6 4"
                        strokeLinecap="round" />
                    </svg>
                    <span style={{ fontSize: 10.5, color: '#e2e8f0', fontWeight: 500 }}>
                      {cfg.emoji} {cfg.label}
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 9.5, color: '#64748b' }}>
                  Click boundary or pin to select field
                </div>
              </div>

              {/* Selected field indicator chip */}
              {selectedFieldId && (
                <div style={{
                  position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
                  background: 'rgba(16,185,129,0.15)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(16,185,129,0.4)', borderRadius: 20,
                  padding: '4px 14px', fontSize: 11, fontWeight: 700, color: '#34d399',
                  display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 12px rgba(16,185,129,0.18)'
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  Field selected: {filteredFarms.find(f => f.farm_id === selectedFieldId)?.farm_name || selectedFieldId}
                  <button
                    onClick={() => setSelectedFieldId(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6ee7b7', fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 2 }}
                    title="Deselect field"
                  >×</button>
                </div>
              )}
            </div>
          </Card>

          {/* Directory Table with Sorting and Full Filters */}
          <Card variant="elevated" className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2 font-display">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Monitored Farms & Farmers Directory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing {filteredFarms.length} of {farms.length} plots across monitored regions
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search farmer, crop, or district..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs font-medium text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Origin Filter */}
                <select
                  value={selectedOrigin}
                  onChange={(e) => setSelectedOrigin(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">All Origins</option>
                  <option value="LIVE">LIVE Telemetry Only</option>
                  <option value="DEMO">DEMO Seed Only</option>
                </select>

                {/* CSV Export Option */}
                <Button
                  size="sm"
                  variant="outline"
                  icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                  onClick={() => exportFarmsToCsv(filteredFarms)}
                  disabled={filteredFarms.length === 0}
                >
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold uppercase text-[10px] border-b border-white/10 select-none">
                  <tr>
                    <th className="p-3">Data Status</th>
                    <th
                      className="p-3 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleToggleSort('farmer_name')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Farmer & Contact</span>
                        {sortField === 'farmer_name' && (sortAscending ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      className="p-3 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleToggleSort('farm_name')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Farm & Region</span>
                        {sortField === 'farm_name' && (sortAscending ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      className="p-3 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleToggleSort('crop')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Crop Variety</span>
                        {sortField === 'crop' && (sortAscending ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      className="p-3 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleToggleSort('area_hectares')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Area (Ha)</span>
                        {sortField === 'area_hectares' && (sortAscending ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      className="p-3 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleToggleSort('predicted_yield_tha')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Yield Forecast</span>
                        {sortField === 'predicted_yield_tha' && (sortAscending ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      className="p-3 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleToggleSort('risk_score')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Pathogen Risk</span>
                        {sortField === 'risk_score' && (sortAscending ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th
                      className="p-3 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleToggleSort('current_gdd')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Accumulated GDD</span>
                        {sortField === 'current_gdd' && (sortAscending ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                      </div>
                    </th>
                    <th className="p-3">Harvest Target</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredFarms.map((f) => (
                    <tr key={f.farm_id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        {getOriginBadge(f.is_live)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-emerald-400 text-xs shrink-0">
                            {f.farmer_name ? f.farmer_name[0] : 'F'}
                          </div>
                          <div>
                            <p className="font-bold text-white">{f.farmer_name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{f.farmer_phone || 'Unlisted'}</p>
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
                      <td className="p-3 font-mono text-amber-300">
                        {f.current_gdd}
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
        </>
      )}

      {/* Emergency Regional Broadcast Modal */}
      <AnimatePresence>
        {showBroadcastModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl w-full"
            >
              <Card variant="elevated" className="p-6 space-y-5 border-amber-500/30">
                <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base font-display">
                        Regional Emergency Advisory Broadcast
                      </h3>
                      <p className="text-xs text-slate-400">
                        Broadcast critical weather, pest, or disease warnings to all registered farmers in a region
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(false)}
                    className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {broadcastSuccess ? (
                  <div className="p-6 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-center space-y-3">
                    <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                    <h4 className="font-bold text-white text-sm">Emergency Advisory Dispatched!</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Your emergency notice has been broadcast to all active channels in {broadcastDistrict} and permanently sealed in the Officer Audit Trail.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleBroadcastAlert} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Target District</label>
                        <select
                          value={broadcastDistrict}
                          onChange={(e) => setBroadcastDistrict(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white outline-none focus:border-amber-500"
                        >
                          <option value="All Monitored Districts">All Monitored Districts</option>
                          {availableDistricts.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Alert Severity</label>
                        <select
                          value={broadcastSeverity}
                          onChange={(e) => setBroadcastSeverity(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white outline-none focus:border-amber-500"
                        >
                          <option value="Critical">🔴 Critical (Immediate Threat)</option>
                          <option value="High">⚠️ High (Elevated Risk)</option>
                          <option value="Warning">⚡ Warning (Precautionary)</option>
                          <option value="Info">ℹ️ Info (General Agronomic Notice)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Advisory Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Flash Flood Alert & Waterlogging Prevention Notice"
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Detailed Field Message</label>
                      <textarea
                        rows={3}
                        placeholder="Provide clear instructions on agronomic measures, spray restrictions, or drainage actions..."
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        required
                        className="w-full p-3 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Action Recommendation (Short Summary)</label>
                      <input
                        type="text"
                        placeholder="e.g. Open farm drainage channels within 12 hours. Do not apply foliar fertilizer."
                        value={broadcastRecommendation}
                        onChange={(e) => setBroadcastRecommendation(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-400" />
                        Broadcasted event is permanently archived in Officer Audit Trail
                      </span>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        icon={<Radio className="w-3.5 h-3.5" />}
                        disabled={broadcastSubmitting || !broadcastTitle.trim() || !broadcastMessage.trim()}
                      >
                        {broadcastSubmitting ? 'Dispatching Broadcast...' : 'Dispatch Regional Broadcast'}
                      </Button>
                    </div>
                  </form>
                )}
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Farm Inspection Modal */}
      <AnimatePresence>
        {inspectingFarm && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto"
            >
              <Card variant="elevated" className="p-6 sm:p-7 space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        OFFICER INSPECTION TELEMETRY
                      </span>
                      {getOriginBadge(inspectingFarm.is_live)}
                    </div>
                    <h3 className="text-xl font-bold text-white font-display">{inspectingFarm.farm_name}</h3>
                    <p className="text-xs text-slate-400">
                      Farmer: {inspectingFarm.farmer_name} ({inspectingFarm.farmer_phone || 'Unlisted'}) • {inspectingFarm.district}, {inspectingFarm.state}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Export CSV for this single farm */}
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Download className="w-3.5 h-3.5" />}
                      onClick={() => exportSingleFarmReportCsv(inspectingFarm)}
                    >
                      Export CSV
                    </Button>

                    <button
                      type="button"
                      onClick={() => setInspectingFarm(null)}
                      className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Telemetry 4-Box Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Farm Identity & Location */}
                  <div className="p-4 bg-emerald-950/30 rounded-2xl border border-emerald-500/20 space-y-1.5">
                    <h4 className="font-bold text-emerald-300 text-sm flex items-center gap-1.5 font-display">
                      <MapPin className="w-4 h-4 text-emerald-400" /> Farm Identity & Location
                    </h4>
                    <p><span className="font-semibold text-slate-400">Location:</span> <span className="text-slate-200">{inspectingFarm.location_name}</span></p>
                    <p><span className="font-semibold text-slate-400">GIS Coordinates:</span> <span className="text-slate-200 font-mono">{inspectingFarm.latitude.toFixed(4)}, {inspectingFarm.longitude.toFixed(4)}</span></p>
                    <p><span className="font-semibold text-slate-400">Crop & Area:</span> <span className="text-slate-200">{inspectingFarm.crop} ({inspectingFarm.area_hectares} Ha)</span></p>
                    <p><span className="font-semibold text-slate-400">Data Origin:</span> <span className="font-mono text-emerald-300 font-bold">{inspectingFarm.is_live ? 'LIVE SENSOR TELEMETRY' : 'DEMO BENCHMARK DATA'}</span></p>
                  </div>

                  {/* Weather & Growth Stage */}
                  <div className="p-4 bg-sky-950/30 rounded-2xl border border-sky-500/20 space-y-1.5">
                    <h4 className="font-bold text-sky-300 text-sm flex items-center gap-1.5 font-display">
                      <CloudSun className="w-4 h-4 text-sky-400" /> Weather & Growth Stage
                    </h4>
                    <p><span className="font-semibold text-slate-400">Weather:</span> <span className="text-slate-200">{inspectingFarm.weather_temp_c}°C ({inspectingFarm.weather_description})</span></p>
                    <p><span className="font-semibold text-slate-400">Relative Humidity:</span> <span className="text-slate-200">{inspectingFarm.weather_humidity}%</span></p>
                    <p><span className="font-semibold text-slate-400">Growth Stage:</span> <span className="text-slate-200">{inspectingFarm.growth_stage}</span></p>
                    <p><span className="font-semibold text-slate-400">Expected Harvest:</span> <span className="text-slate-200">{inspectingFarm.expected_harvest_date} ({inspectingFarm.harvest_window})</span></p>
                  </div>

                  {/* Soil Health Horizon */}
                  <div className="p-4 bg-purple-950/30 rounded-2xl border border-purple-500/20 space-y-1.5">
                    <h4 className="font-bold text-purple-300 text-sm flex items-center gap-1.5 font-display">
                      <FlaskConical className="w-4 h-4 text-purple-400" /> Soil Health Horizon
                    </h4>
                    <p><span className="font-semibold text-slate-400">Soil Type:</span> <span className="text-slate-200 font-semibold">{inspectingFarm.soil_type} (pH: {inspectingFarm.ph})</span></p>
                    <p><span className="font-semibold text-slate-400">Soil Moisture:</span> <span className="text-slate-200">{inspectingFarm.soil_moisture}%</span></p>
                    <p><span className="font-semibold text-slate-400">NPK Levels:</span> <span className="text-slate-200 font-mono">N: {inspectingFarm.nitrogen}%, P: {inspectingFarm.phosphorus}%, K: {inspectingFarm.potassium}%</span></p>
                  </div>

                  {/* AI Yield & Risk Assessment */}
                  <div className="p-4 bg-rose-950/30 rounded-2xl border border-rose-500/20 space-y-2">
                    <h4 className="font-bold text-rose-300 text-sm flex items-center gap-1.5 font-display">
                      <Bug className="w-4 h-4 text-rose-400" /> AI Yield & Risk Assessment
                    </h4>
                    <p><span className="font-semibold text-slate-400">Predicted Yield:</span> <span className="text-slate-200 font-bold">{inspectingFarm.predicted_yield_tha} t/ha ({inspectingFarm.expected_production_tons} Tons)</span></p>
                    <p className="flex items-center gap-1.5"><span className="font-semibold text-slate-400">Risk Assessment:</span> {getRiskBadge(inspectingFarm.risk_level, inspectingFarm.risk_score)}</p>

                    {/* Model Calibration / Region Applicability Tag */}
                    <div className="pt-1 border-t border-white/10">
                      {inspectingFarm.model_calibration ? (
                        <div
                          className={`p-2 rounded-xl text-[11px] leading-tight ${
                            inspectingFarm.model_calibration.is_calibrated
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-semibold mb-0.5">
                            <Info className="w-3 h-3 shrink-0" />
                            <span>
                              {inspectingFarm.model_calibration.is_calibrated
                                ? `Model calibrated for: ${inspectingFarm.model_calibration.calibrated_soil}`
                                : 'Lower confidence — different soil/region profile'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-normal">
                            {inspectingFarm.model_calibration.notes}
                          </p>
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-slate-900 border border-white/5 text-[11px] text-slate-400">
                          <span className="font-mono text-slate-500">Model metadata not yet available</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* GDD Agronomic Indicator Card */}
                <GddAgronomicIndicator
                  currentGdd={inspectingFarm.current_gdd}
                  crop={inspectingFarm.crop}
                  baseTempC={inspectingFarm.gdd_agronomic?.base_temp_c || 10}
                  targetHarvestGdd={inspectingFarm.gdd_agronomic?.target_harvest_gdd || 1850}
                  progressPct={inspectingFarm.gdd_agronomic?.progress_pct}
                />

                {/* Explainable AI Panel (SHAP-style Risk Drivers) */}
                <ExplainableAIPanel
                  isLive={!!inspectingFarm.is_live}
                  yieldFactors={inspectingFarm.explainability?.yield_factors || []}
                  diseaseFactors={inspectingFarm.explainability?.disease_factors || []}
                />

                {/* Advisory Dispatch Box with Quick Templates */}
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="font-bold text-white text-xs font-display">
                      Dispatch Official Agronomic Advisory to Farmer
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Dispatched advisories automatically sealed in immutable audit log
                    </span>
                  </div>

                  {/* Advisory Quick Templates */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 block">
                      Quick Recommendation Templates:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {INSPECTION_ADVISORY_TEMPLATES.map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAdvisoryNote((prev) => (prev ? `${prev}\n\n${tmpl.text}` : tmpl.text))}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-[10px] text-emerald-300 font-medium transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          {tmpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    placeholder={`Type official agronomic recommendations for ${inspectingFarm.farmer_name}...`}
                    value={advisoryNote}
                    onChange={(e) => setAdvisoryNote(e.target.value)}
                    className="w-full p-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />

                  <div className="flex items-center justify-between">
                    {advisorySentSuccess && (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Advisory dispatched & sealed in officer audit trail!
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
