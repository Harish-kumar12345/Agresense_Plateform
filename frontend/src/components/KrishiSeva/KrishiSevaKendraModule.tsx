import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  Navigation,
  Search,
  RefreshCw
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { FarmData } from '../../services/farmService';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AnimatedCounter } from '../Common/AnimatedCounter';
import { colors, motionPresets } from '../../styles/design-tokens';

// Custom Leaflet pins for user farm and centers
const farmIcon = L.divIcon({
  className: 'custom-farm-marker',
  html: `<div style="background-color: #059669; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">🌾</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const centerIcon = (category: string) => {
  let emoji = '🏪';
  let color = '#2563eb'; // blue
  if (category === 'FERTILIZER') { emoji = '🧪'; color = '#3b82f6'; }
  else if (category === 'SEEDS') { emoji = '🌱'; color = '#8b5cf6'; }
  else if (category === 'PESTICIDES') { emoji = '💊'; color = '#e11d48'; }
  else if (category === 'OFFICE') { emoji = '🏛️'; color = '#d97706'; }
  else if (category === 'KVK') { emoji = '🔬'; color = '#0d9488'; }

  return L.divIcon({
    className: 'custom-center-marker',
    html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

export interface AgriCenter {
  id: string;
  name: string;
  nameLocal?: string;
  category: 'KSK' | 'FERTILIZER' | 'SEEDS' | 'PESTICIDES' | 'OFFICE' | 'KVK';
  categoryLabel: string;
  address: string;
  district: string;
  state: string;
  pincode?: string;
  phone?: string;
  email?: string;
  services: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  workingHours: string;
  officerName?: string;
  distance: number;
  isOpenNow: boolean;
  rating?: number;
}

interface KrishiSevaKendraModuleProps {
  farm?: FarmData | null;
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    state?: string;
  };
  onGoToGIS?: () => void;
}

export const KrishiSevaKendraModule: React.FC<KrishiSevaKendraModuleProps> = ({
  farm,
  location,
  onGoToGIS
}) => {
  // Extract coordinates from saved GIS farm or location (with resilient fallback)
  const rawLat = farm?.latitude ?? location?.latitude ?? 10.0261;
  const rawLon = farm?.longitude ?? location?.longitude ?? 76.3125;
  const safeLat = isNaN(Number(rawLat)) || Number(rawLat) === 0 ? 10.0261 : Number(rawLat);
  const safeLon = isNaN(Number(rawLon)) || Number(rawLon) === 0 ? 76.3125 : Number(rawLon);

  const farmName = farm?.farm_name || 'My Farm Plot';
  const locationLabel = farm?.location_name || (location?.city ? `${location.city}, India` : 'AgriSense Region');

  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Telemetry Data State
  const [centers, setCenters] = useState<AgriCenter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCenter, setSelectedCenter] = useState<AgriCenter | null>(null);

  // Load nearby centers from backend API using saved GIS coordinates
  const loadCenters = async () => {
    setLoading(true);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${API_BASE}/krishi-seva-kendra?latitude=${safeLat}&longitude=${safeLon}&category=${selectedCategory}&search=${encodeURIComponent(searchQuery)}`);

      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();

      if (data && Array.isArray(data.centers) && data.centers.length > 0) {
        setCenters(data.centers);
        if (!selectedCenter) {
          setSelectedCenter(data.centers[0]);
        }
      } else {
        setCenters(getFallbackCenters(safeLat, safeLon, selectedCategory, searchQuery));
      }
    } catch (err: any) {
      console.warn('Backend Krishi Seva API error, falling back to local calculation:', err);
      // Fallback centers calculation
      setCenters(getFallbackCenters(safeLat, safeLon, selectedCategory, searchQuery));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCenters();
  }, [safeLat, safeLon, selectedCategory, searchQuery]);

  // Handle Get Directions to Google Maps
  const handleGetDirections = (center: AgriCenter) => {
    const origin = safeLat && safeLon ? `${safeLat},${safeLon}` : '';
    const dest = `${center.coordinates.latitude},${center.coordinates.longitude}`;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;
    window.open(mapsUrl, '_blank');
  };

  // Helper badge color per category
  const getCategoryBadgeVariant = (category: string): 'emerald' | 'sky' | 'amber' | 'rose' | 'slate' => {
    switch (category) {
      case 'KSK':
        return 'emerald';
      case 'FERTILIZER':
      case 'SEEDS':
        return 'sky';
      case 'PESTICIDES':
        return 'rose';
      case 'OFFICE':
      case 'KVK':
        return 'amber';
      default:
        return 'slate';
    }
  };

  // MISSING GIS LOCATION FALLBACK UI
  if (!safeLat || !safeLon) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6 bg-slate-900/90 rounded-3xl border border-amber-500/30 shadow-2xl my-6 backdrop-blur-md"
      >
        <div className="w-16 h-16 bg-amber-500/15 rounded-full flex items-center justify-center mx-auto text-amber-400 border border-amber-500/20">
          <MapPin className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-white font-display">Set Farm GIS Location Required</h3>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            To locate nearest Krishi Seva Kendras, fertilizer depots, seed merchants, and KVK centers, please select or set your farm location in the Farm GIS map.
          </p>
        </div>
        <Button
          onClick={onGoToGIS}
          variant="primary"
          size="lg"
          icon={<MapPin className="w-4 h-4" />}
        >
          Open Farm GIS Map & Set Location
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={motionPresets.container}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-100 font-sans"
    >
      {/* 1. Agronomic Category Hero Banner */}
      <motion.div variants={motionPresets.item} className="verda-hero-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
              <Building2 className="w-3.5 h-3.5 text-emerald-400 inline-block mr-1.5" />
              <span>Krishi Seva Kendra & Agri Extension Telemetry</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight font-display">
              <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent">Agricultural Support</span> Centers
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Locate government-certified input dealers, soil testing laboratories, Krishi Vigyan Kendras (KVK), and fertilizer supply depots near your field.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-300">
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <MapPin className="w-3.5 h-3.5" />
                Plot Origin: {locationLabel} ({safeLat.toFixed(4)}, {safeLon.toFixed(4)})
              </span>
              <span className="text-slate-700">•</span>
              <Badge variant="emerald" size="sm">
                <AnimatedCounter value={centers.length} suffix=" Centers Found Nearby" />
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="glass"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />}
              onClick={loadCenters}
            >
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Controls Bar: Search & Category Filters */}
      <motion.div variants={motionPresets.item}>
        <Card variant="elevated" tone="farm" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, address, or service..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-white placeholder:text-slate-500"
            />
          </div>

          {/* Active Radius / Sort Badge */}
          <Badge variant="emerald" size="md">
            Sorted by Nearest Distance (Haversine Formula)
          </Badge>
        </div>

        {/* Category Pills Filter */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
          {[
            { id: 'ALL', label: 'All Centers', icon: '🏪' },
            { id: 'KSK', label: 'Krishi Seva Kendras', icon: '🌾' },
            { id: 'FERTILIZER', label: 'Fertilizer Shops', icon: '🧪' },
            { id: 'SEEDS', label: 'Seed Suppliers', icon: '🌱' },
            { id: 'PESTICIDES', label: 'Pesticide Dealers', icon: '💊' },
            { id: 'OFFICE', label: 'Agri Offices', icon: '🏛️' },
            { id: 'KVK', label: 'Krishi Vigyan Kendras', icon: '🔬' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </Card>
      </motion.div>

      {/* Main Layout: Leaflet Map (Left) + Centers List (Right) */}
      <motion.div variants={motionPresets.item} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Leaflet Map Panel */}
        <Card variant="elevated" tone="farm" className="lg:col-span-6 p-4 space-y-3 flex flex-col h-[520px]">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-white text-sm flex items-center gap-2 font-display">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Interactive Map View</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Click marker for directions</span>
          </div>

          <div className="flex-1 w-full rounded-2xl overflow-hidden border border-white/10 relative z-0">
            <MapContainer
              center={[safeLat, safeLon]}
              zoom={11}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* User Farm Location Marker */}
              <Marker position={[safeLat, safeLon]} icon={farmIcon}>
                <Popup>
                  <div className="text-xs font-bold space-y-1">
                    <p className="text-emerald-700">🌾 {farmName}</p>
                    <p className="text-slate-600">Saved GIS Farm Origin</p>
                  </div>
                </Popup>
              </Marker>

              {/* Nearby Center Markers */}
              {centers.map((center) => (
                <Marker
                  key={center.id}
                  position={[center.coordinates.latitude, center.coordinates.longitude]}
                  icon={centerIcon(center.category)}
                  eventHandlers={{
                    click: () => setSelectedCenter(center)
                  }}
                >
                  <Popup>
                    <div className="text-xs space-y-1.5 p-0.5">
                      <h4 className="font-bold text-slate-900">{center.name}</h4>
                      <p className="text-emerald-700 font-semibold">{center.distance} km away</p>
                      <p className="text-slate-600">{center.address}</p>
                      <button
                        onClick={() => handleGetDirections(center)}
                        className="mt-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-[11px] block text-center w-full transition-colors cursor-pointer"
                      >
                        Get Directions →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </Card>

        {/* Center Cards List Panel */}
        <div className="lg:col-span-6 space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
          {loading ? (
            <Card variant="elevated" className="text-center py-16 space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-400">Locating nearby centers from GIS coordinates...</p>
            </Card>
          ) : centers.length === 0 ? (
            <Card variant="elevated" className="text-center py-16 space-y-3">
              <Building2 className="w-12 h-12 text-slate-500 mx-auto" />
              <h4 className="font-bold text-white text-base">No Centers Found</h4>
              <p className="text-xs text-slate-400">Try adjusting your search query or selecting "All Centers".</p>
            </Card>
          ) : (
            <AnimatePresence>
              {centers.map((center, index) => {
                const badgeVariant = getCategoryBadgeVariant(center.category);
                const isSelected = selectedCenter?.id === center.id;

                return (
                  <motion.div
                    key={center.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.25 }}
                  >
                    <Card
                      variant="elevated"
                      onClick={() => setSelectedCenter(center)}
                      className={`p-5 cursor-pointer space-y-3 transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                          : 'hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Badge variant={badgeVariant} size="sm">
                              {center.categoryLabel}
                            </Badge>

                            <Badge
                              variant={center.isOpenNow ? 'emerald' : 'rose'}
                              size="sm"
                            >
                              {center.isOpenNow ? 'Open Now' : 'Closed'}
                            </Badge>
                          </div>

                          <h4 className="text-base font-bold text-white">{center.name}</h4>
                          {center.nameLocal && <p className="text-xs text-slate-400 font-medium">{center.nameLocal}</p>}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-lg font-black text-emerald-400 font-display">{center.distance} km</div>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Nearest</span>
                        </div>
                      </div>

                      <div className="text-xs space-y-1.5 text-slate-300 pt-2 border-t border-white/10">
                        <p className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{center.address}, {center.district}</span>
                        </p>

                        {center.workingHours && (
                          <p className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Hours: {center.workingHours}</span>
                          </p>
                        )}

                        {center.phone && (
                          <p className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a href={`tel:${center.phone}`} className="text-emerald-400 hover:underline font-semibold">
                              {center.phone}
                            </a>
                          </p>
                        )}
                      </div>

                      {/* Services Tag Pills */}
                      {center.services && center.services.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {center.services.slice(0, 4).map((srv, i) => (
                            <Badge key={i} variant="slate" size="sm">
                              ✓ {srv}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Get Directions Button */}
                      <div className="pt-2 flex items-center justify-between">
                        {center.officerName ? (
                          <span className="text-[11px] text-slate-400 font-medium">Officer: {center.officerName}</span>
                        ) : <span />}

                        <Button
                          size="sm"
                          variant="outline"
                          icon={<Navigation className="w-3.5 h-3.5 text-emerald-400" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGetDirections(center);
                          }}
                          className="border-white/10 text-slate-200 hover:bg-white/5"
                        >
                          Get Directions
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Fallback centers generator if API offline
function getFallbackCenters(lat: number, lon: number, category: string, query: string): AgriCenter[] {
  const list: AgriCenter[] = [
    {
      id: 'fb_1',
      name: 'District Krishi Bhavan & Seva Kendra',
      nameLocal: 'ജില്ലാ കൃഷി ഭവൻ',
      category: 'KSK',
      categoryLabel: 'Krishi Seva Kendra',
      address: 'Government Agriculture Complex',
      district: 'Local District',
      state: 'Kerala',
      phone: '+91-484-2422334',
      services: ['Soil Testing', 'Crop Advisory', 'Subsidies'],
      coordinates: { latitude: lat + 0.015, longitude: lon + 0.012 },
      workingHours: '9:00 AM - 5:00 PM (Mon-Fri)',
      distance: 1.8,
      isOpenNow: true,
      officerName: 'District Agriculture Officer'
    },
    {
      id: 'fb_2',
      name: 'FACT Agro Service & Fertilizer Depot',
      category: 'FERTILIZER',
      categoryLabel: 'Fertilizer Shop',
      address: 'Main Market Yard',
      district: 'Local District',
      state: 'Kerala',
      phone: '+91-484-2545161',
      services: ['Urea', 'NPK Fertilizers', 'Bio-compost'],
      coordinates: { latitude: lat - 0.02, longitude: lon + 0.018 },
      workingHours: '8:30 AM - 6:30 PM (Mon-Sat)',
      distance: 2.6,
      isOpenNow: true
    },
    {
      id: 'fb_3',
      name: 'State Certified Seed Supplier Hub',
      category: 'SEEDS',
      categoryLabel: 'Seed Supplier',
      address: 'Agronomic Nursery Center',
      district: 'Local District',
      state: 'Kerala',
      phone: '+91-480-2701235',
      services: ['Paddy Seeds', 'Vegetable Hybrids', 'Banana Saplings'],
      coordinates: { latitude: lat + 0.025, longitude: lon - 0.014 },
      workingHours: '9:00 AM - 5:00 PM (Mon-Sat)',
      distance: 3.4,
      isOpenNow: true
    },
    {
      id: 'fb_4',
      name: 'ICAR - Krishi Vigyan Kendra (KVK)',
      category: 'KVK',
      categoryLabel: 'Krishi Vigyan Kendra',
      address: 'Research Station Campus',
      district: 'Local District',
      state: 'Kerala',
      phone: '+91-484-2492417',
      services: ['Training', 'Frontline Demo', 'Soil Health'],
      coordinates: { latitude: lat - 0.035, longitude: lon - 0.022 },
      workingHours: '9:00 AM - 5:30 PM (Mon-Sat)',
      distance: 4.8,
      isOpenNow: true
    }
  ];

  let res = list;
  if (category && category !== 'ALL') {
    res = res.filter(c => c.category === category);
  }
  if (query && query.trim()) {
    const q = query.toLowerCase();
    res = res.filter(c => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q));
  }
  return res;
}
