import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Sprout, 
  Tractor,
  Navigation,
  Loader2,
  ArrowRight,
  Leaf,
  CloudSun,
  Activity,
  Sun,
  Wind,
  Droplets,
  Search,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/farm-background.css';

type LocationData = {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  state?: string;
  district?: string;
};

interface LandingPageProps {
  onSubmit: (location: LocationData, crop: string) => void;
}

// Reverse geocode coordinates to City, State, Country
const reverseGeocodeCoords = async (lat: number, lon: number): Promise<{ city: string; country: string; state?: string; district?: string }> => {
  // 1. Try OpenStreetMap Nominatim
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.state_district || 'Ghaziabad';
        const state = addr.state || 'Uttar Pradesh';
        const country = addr.country || 'India';
        const district = addr.county || addr.state_district || city;
        return { city, country, state, district };
      }
    }
  } catch (e) {
    console.warn('Nominatim reverse geocoding error:', e);
  }

  // 3. Fallback based on coordinate region bounds
  if (lat >= 28.0 && lat <= 29.0 && lon >= 77.0 && lon <= 78.0) {
    return { city: 'Ghaziabad', state: 'Uttar Pradesh', country: 'India' };
  } else if (lat >= 9.5 && lat <= 10.5 && lon >= 76.0 && lon <= 77.0) {
    return { city: 'Kochi', state: 'Kerala', country: 'India' };
  } else if (lat >= 18.5 && lat <= 19.5 && lon >= 72.5 && lon <= 73.5) {
    return { city: 'Mumbai', state: 'Maharashtra', country: 'India' };
  }

  return { city: 'AgriSense Farm Region', state: 'India', country: 'India' };
};

// Geocode a location string to coordinates
const geocodeLocation = async (locationString: string): Promise<LocationData> => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationString)}&format=json&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const displayParts = item.display_name.split(', ');
        const city = displayParts[0] || locationString;
        const country = displayParts[displayParts.length - 1] || 'India';
        const state = displayParts.length > 2 ? displayParts[displayParts.length - 2] : '';
        return {
          latitude: lat,
          longitude: lon,
          city,
          country,
          state,
          district: city
        };
      }
    }
  } catch (e) {
    console.warn('Nominatim search geocoding error:', e);
  }

  // Fallback for known regions
  const lower = locationString.toLowerCase();
  if (lower.includes('kochi') || lower.includes('cochin')) {
    return { latitude: 9.9312, longitude: 76.2673, city: 'Kochi', state: 'Kerala', country: 'India' };
  } else if (lower.includes('trivandrum') || lower.includes('thiruvananthapuram')) {
    return { latitude: 8.5241, longitude: 76.9366, city: 'Thiruvananthapuram', state: 'Kerala', country: 'India' };
  } else if (lower.includes('thrissur')) {
    return { latitude: 10.5276, longitude: 76.2144, city: 'Thrissur', state: 'Kerala', country: 'India' };
  } else if (lower.includes('kozhikode') || lower.includes('calicut')) {
    return { latitude: 11.2588, longitude: 75.7804, city: 'Kozhikode', state: 'Kerala', country: 'India' };
  } else if (lower.includes('ghaziabad')) {
    return { latitude: 28.6692, longitude: 77.4538, city: 'Ghaziabad', state: 'Uttar Pradesh', country: 'India' };
  } else if (lower.includes('delhi')) {
    return { latitude: 28.6139, longitude: 77.2090, city: 'Delhi', state: 'Delhi', country: 'India' };
  } else if (lower.includes('mumbai')) {
    return { latitude: 19.0760, longitude: 72.8777, city: 'Mumbai', state: 'Maharashtra', country: 'India' };
  }

  return { latitude: 28.6692, longitude: 77.4538, city: locationString, state: 'India', country: 'India' };
};

export const LandingPage: React.FC<LandingPageProps> = ({ onSubmit }) => {
  const { t } = useLanguage();
  const [location, setLocation] = useState<string>('');
  const [crop, setCrop] = useState<string>('Rice');
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [manualLocationLoading, setManualLocationLoading] = useState(false);
  const [locationSource, setLocationSource] = useState<'live' | 'manual' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // HTML5 Geolocation detection
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const geo = await reverseGeocodeCoords(lat, lon);
          
          const locData: LocationData = {
            latitude: lat,
            longitude: lon,
            city: geo.city,
            country: geo.country,
            state: geo.state,
            district: geo.district
          };

          setCurrentLocation(locData);
          setLocation(`${geo.city}, ${geo.state || geo.country}`);
          setLocationSource('live');
        } catch (err) {
          setError('Failed to resolve address coordinates');
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        setLocationLoading(false);
        // Fallback gracefully to default Ghaziabad/Delhi
        const fallbackLocation: LocationData = {
          latitude: 28.6692,
          longitude: 77.4538,
          city: 'Ghaziabad',
          state: 'Uttar Pradesh',
          country: 'India'
        };
        setCurrentLocation(fallbackLocation);
        setLocation('Ghaziabad, Uttar Pradesh');
        setLocationSource('manual');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleManualLocationSearch = async () => {
    if (!location.trim()) {
      setError('Please enter a valid farm location');
      return;
    }

    setManualLocationLoading(true);
    setError(null);
    setLocationSource('manual');
    
    try {
      const locationData = await geocodeLocation(location.trim());
      setCurrentLocation(locationData);
      setLocation(`${locationData.city}, ${locationData.state || locationData.country}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to locate region');
      setCurrentLocation(null);
    } finally {
      setManualLocationLoading(false);
    }
  };

  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(e.target.value);
    setError(null);
    if (locationSource === 'live' && e.target.value !== `${currentLocation?.city}, ${currentLocation?.country}`) {
      setCurrentLocation(null);
      setLocationSource('manual');
    }
  };

  const handleLocationInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleManualLocationSearch();
    }
  };

  const handleSubmit = async () => {
    if (!currentLocation && location.trim()) {
      await handleManualLocationSearch();
      return;
    }
    
    if (!currentLocation) {
      handleGetCurrentLocation();
      return;
    }
    
    onSubmit(currentLocation, crop);
  };

  return (
    <div className="split-screen select-none">
      
      {/* Left Panel - Hero Presentation */}
      <div className="left-panel flex flex-col justify-between p-8 lg:p-16 relative">
        <div className="aurora-glow -top-20 -left-20 bg-emerald-500" />
        <div className="aurora-glow -bottom-20 -right-20 bg-amber-500" />

        {/* Top Floating Badge */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-xs font-semibold text-emerald-300 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="tracking-wider uppercase">Precision Agronomic Intelligence</span>
          </div>
        </div>

        {/* Hero Headline & Illustration */}
        <div className="max-w-lg my-auto relative z-10 py-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="farm-hero-icon floating-hero mb-8"
          >
            <Tractor className="w-10 h-10 text-emerald-300 drop-shadow-md" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6 font-display"
          >
            Smart Farming <br />
            <span className="text-gradient-emerald">Dashboard</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed mb-10"
          >
            Real-time sensory telemetry, soil NPK horizon diagnostics, Random Forest pathogen forecasting, and bilingual AI agronomy — built for modern farm management.
          </motion.p>

          {/* Feature Pill Row - Unified Brand Green Accent */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="pt-8 border-t border-white/10 flex flex-wrap items-center gap-3"
          >
            <div className="glass-pill px-4 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium text-slate-200 hover:border-emerald-500/40">
              <CloudSun className="w-4 h-4 text-emerald-400" />
              <span>Weather Telemetry</span>
            </div>
            <div className="glass-pill px-4 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium text-slate-200 hover:border-emerald-500/40">
              <Leaf className="w-4 h-4 text-emerald-400" />
              <span>Soil Horizon & NPK</span>
            </div>
            <div className="glass-pill px-4 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium text-slate-200 hover:border-emerald-500/40">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>ML Yield & Disease</span>
            </div>
          </motion.div>
        </div>

        {/* Footer Subtext in Left Panel */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Agricultural decision engine verified for Indian agronomy</span>
        </div>
      </div>

      {/* Right Panel - Action Card */}
      <div className="right-panel">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="glass-action-card p-7 sm:p-9">
            
            {/* Header Lockup */}
            <div className="mb-7">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-600/30 mb-4 border border-emerald-300/40">
                <Sprout className="w-6 h-6 text-slate-950" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight font-display mb-1.5">
                Setup Your Field
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Connect your coordinates and crop type to receive hyper-local telemetry and agronomic forecasts.
              </p>
            </div>

            <div className="space-y-5">
              
              {/* Location Input Section */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Farm Location / Coordinates
                </label>

                {/* Unified Search Input with Integrated Icons */}
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                  </div>
                  <input
                    type="text"
                    value={location}
                    onChange={handleLocationInputChange}
                    onKeyPress={handleLocationInputKeyPress}
                    placeholder="Enter city, district, or PIN (e.g. Kochi, Kerala)"
                    className="w-full pl-10 pr-20 py-3 bg-[#070D0A]/90 border border-emerald-900/40 rounded-xl text-sm text-white placeholder:text-emerald-700/60 focus:border-emerald-500 focus:bg-[#070D0A] focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                  />
                  <div className="absolute right-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleManualLocationSearch}
                      disabled={manualLocationLoading || !location.trim()}
                      className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      title="Search Coordinates"
                    >
                      {manualLocationLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Balanced Action Buttons: Locate Me + Quick Region */}
                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={locationLoading}
                    className="h-10 px-3 bg-[#070D0A]/90 hover:bg-emerald-950/40 border border-emerald-900/40 rounded-xl text-xs font-medium text-[#D1DED6] hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {locationLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Use My Location</span>
                  </button>

                  <div className="relative h-10">
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setLocation(e.target.value);
                          setLocationSource('manual');
                          setError(null);
                          setCurrentLocation(null);
                        }
                      }}
                      className="w-full h-full px-3 pr-7 bg-[#070D0A]/90 hover:bg-emerald-950/40 border border-emerald-900/40 rounded-xl text-xs font-medium text-[#D1DED6] hover:text-white transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Quick Regions</option>
                      <optgroup label="Kerala Districts" className="bg-[#070D0A] text-white">
                        <option value="Kochi, Kerala">Kochi, Kerala</option>
                        <option value="Thiruvananthapuram, Kerala">Thiruvananthapuram, Kerala</option>
                        <option value="Thrissur, Kerala">Thrissur, Kerala</option>
                        <option value="Kozhikode, Kerala">Kozhikode, Kerala</option>
                        <option value="Palakkad, Kerala">Palakkad, Kerala</option>
                        <option value="Wayanad, Kerala">Wayanad, Kerala</option>
                        <option value="Idukki, Kerala">Idukki, Kerala</option>
                      </optgroup>
                      <optgroup label="Major Agricultural Zones" className="bg-[#070D0A] text-white">
                        <option value="Ghaziabad, Uttar Pradesh">Ghaziabad, UP</option>
                        <option value="Punjab, India">Punjab Agricultural Belt</option>
                        <option value="Mumbai, Maharashtra">Mumbai Region</option>
                        <option value="Pune, Maharashtra">Pune, Maharashtra</option>
                        <option value="Bangalore, Karnataka">Bangalore, Karnataka</option>
                        <option value="Coimbatore, Tamil Nadu">Coimbatore, Tamil Nadu</option>
                      </optgroup>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Location Resolved Status Badge */}
                {currentLocation && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 text-xs text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-medium truncate max-w-[220px]">
                        {currentLocation.city}, {currentLocation.state || currentLocation.country}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400/80 font-mono">
                      {currentLocation.latitude.toFixed(2)}°, {currentLocation.longitude.toFixed(2)}°
                    </span>
                  </motion.div>
                )}

                {/* Error Banner */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </div>

              {/* Crop Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Cultivated Crop Type
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none">
                    <Sprout className="w-4 h-4 text-emerald-400" />
                  </div>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-[#070D0A]/90 border border-emerald-900/40 rounded-xl text-sm text-white focus:border-emerald-500 focus:bg-[#070D0A] focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none appearance-none cursor-pointer"
                  >
                    <optgroup label="Cereal & Grain Crops" className="bg-[#070D0A] text-white">
                      <option value="Rice">{t('crops.rice') || 'Rice'}</option>
                      <option value="Wheat">{t('crops.wheat') || 'Wheat'}</option>
                      <option value="Maize">{t('crops.maize') || 'Maize'}</option>
                      <option value="Bajra">{t('crops.bajra') || 'Bajra'}</option>
                      <option value="Jowar">{t('crops.jowar') || 'Jowar'}</option>
                      <option value="Barley">{t('crops.barley') || 'Barley'}</option>
                    </optgroup>
                    <optgroup label="Cash & Commercial Crops" className="bg-[#070D0A] text-white">
                      <option value="Sugarcane">{t('crops.sugarcane') || 'Sugarcane'}</option>
                      <option value="Cotton">{t('crops.cotton') || 'Cotton'}</option>
                      <option value="Mustard">{t('crops.mustard') || 'Mustard'}</option>
                      <option value="Tea">{t('crops.tea') || 'Tea'}</option>
                      <option value="Coffee">{t('crops.coffee') || 'Coffee'}</option>
                      <option value="Rubber">{t('crops.rubber') || 'Rubber'}</option>
                    </optgroup>
                    <optgroup label="Plantation & Horticulture" className="bg-[#070D0A] text-white">
                      <option value="Coconut">{t('crops.coconut') || 'Coconut'}</option>
                      <option value="Black Pepper">{t('crops.black_pepper') || 'Black Pepper'}</option>
                      <option value="Cardamom">{t('crops.cardamom') || 'Cardamom'}</option>
                      <option value="Banana">{t('crops.banana') || 'Banana'}</option>
                      <option value="Potato">{t('crops.potato') || 'Potato'}</option>
                    </optgroup>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Primary Submit CTA */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={locationLoading || manualLocationLoading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-600/30 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100 mt-2"
              >
                {locationLoading || manualLocationLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Resolving Coordinates...</span>
                  </>
                ) : currentLocation ? (
                  <>
                    <span>Initialize Farm Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : location.trim() ? (
                  <>
                    <span>Locate & Open Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Enter Location to Continue</span>
                    <MapPin className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Bottom Mini Themed Feature Cards - Unified Brand Green Accent */}
            <div className="grid grid-cols-3 gap-2.5 mt-6 pt-5 border-t border-emerald-900/30">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center hover:bg-emerald-500/20 transition-colors">
                <CloudSun className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-[11px] font-semibold text-[#D1DED6] block">Weather</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center hover:bg-emerald-500/20 transition-colors">
                <Leaf className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-[11px] font-semibold text-[#D1DED6] block">Soil NPK</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center hover:bg-emerald-500/20 transition-colors">
                <Activity className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-[11px] font-semibold text-[#D1DED6] block">AI Insights</span>
              </div>
            </div>

          </div>
        </motion.div>
      </div>

    </div>
  );
};

export default LandingPage;