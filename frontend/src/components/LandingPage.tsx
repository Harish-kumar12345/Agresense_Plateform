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
  Search
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/farm-background.css';

// API endpoints from environment variables
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

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
  // 1. Try OpenStreetMap Nominatim (Free, Keyless, Highly Detailed)
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

  // 2. OpenWeather API if key exists
  if (OPENWEATHER_API_KEY) {
    try {
      const res = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_API_KEY}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          return {
            city: data[0].name,
            country: data[0].country || 'India',
            state: data[0].state || ''
          };
        }
      }
    } catch (e) {}
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
    // 1. OpenStreetMap Nominatim Direct Search
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
          state
        };
      }
    }
  } catch (e) {
    console.warn('Nominatim direct search error:', e);
  }

  // 2. OpenWeather Direct Geocoding if API key available
  if (OPENWEATHER_API_KEY) {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(locationString)}&limit=1&appid=${OPENWEATHER_API_KEY}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const result = data[0];
          return {
            latitude: result.lat,
            longitude: result.lon,
            city: result.name,
            country: result.country,
            state: result.state,
            district: result.local_names?.en || result.name
          };
        }
      }
    } catch (e) {}
  }

  // Safe Fallback
  return {
    latitude: 28.6692,
    longitude: 77.4538,
    city: locationString || 'Ghaziabad',
    state: 'Uttar Pradesh',
    country: 'India'
  };
};

// Get user's current location
const getCurrentLocation = (): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      reject(new Error('Geolocation requires HTTPS or localhost'));
      return;
    }

    console.log('Requesting browser geolocation...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('Geolocation success:', latitude, longitude);
        
        try {
          const locationDetails = await reverseGeocodeCoords(latitude, longitude);
          resolve({
            latitude,
            longitude,
            city: locationDetails.city,
            country: locationDetails.country,
            state: locationDetails.state,
            district: locationDetails.district
          });
        } catch (error) {
          console.warn('Reverse geocoding error:', error);
          resolve({
            latitude,
            longitude,
            city: 'Ghaziabad',
            state: 'Uttar Pradesh',
            country: 'India'
          });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Failed to get location: ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out';
            break;
          default:
            errorMessage += error.message;
            break;
        }
        reject(new Error(errorMessage));
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 300000 
      }
    );
  });
};

function LandingPage({ onSubmit }: LandingPageProps) {
  const { t } = useLanguage();
  const [location, setLocation] = useState('');
  const [crop, setCrop] = useState('Rice');
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [manualLocationLoading, setManualLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<'live' | 'manual'>('live');

  const handleGetCurrentLocation = async () => {
    setLocationLoading(true);
    setError(null);
    setLocationSource('live');
    try {
      const locationData = await getCurrentLocation();
      setCurrentLocation(locationData);
      setLocation(`${locationData.city}, ${locationData.country}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get current location');
      // Fallback to Delhi coordinates
      const fallbackLocation = {
        latitude: 28.6139,
        longitude: 77.2090,
        city: 'Delhi',
        country: 'India'
      };
      setCurrentLocation(fallbackLocation);
      setLocation('Delhi, India');
      setLocationSource('manual');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleManualLocationSearch = async () => {
    if (!location.trim()) {
      setError('Please enter a location');
      return;
    }

    setManualLocationLoading(true);
    setError(null);
    setLocationSource('manual');
    
    try {
      const locationData = await geocodeLocation(location.trim());
      setCurrentLocation(locationData);
      setLocation(`${locationData.city}, ${locationData.country}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find location');
      setCurrentLocation(null);
    } finally {
      setManualLocationLoading(false);
    }
  };

  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(e.target.value);
    setError(null);
    // Clear current location if user is typing manually
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
    // If no current location but location text is entered, try to geocode it first
    if (!currentLocation && location.trim()) {
      await handleManualLocationSearch();
      return;
    }
    
    if (!currentLocation) {
      setError('Please select a location or use your current location');
      return;
    }
    
    onSubmit(currentLocation, crop);
  };

  // Don't automatically get location on mount - let users choose
  useEffect(() => {
    // Optional: You can still auto-get location if desired
    // handleGetCurrentLocation();
  }, []);

  return (
    <div className="split-screen">
      {/* Left Panel - Agricultural Background */}
      <div className="left-panel flex items-center justify-center p-8 lg:p-12 relative">
        <div className="max-w-md text-center relative z-10">
          {/* Animated Tractor Icon */}
          <div className="farm-tractor-icon floating-tractor mb-8">
            <Tractor className="w-16 h-16 text-white" />
          </div>
          
          {/* Hero Content */}
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 drop-shadow-lg">
            {t('home.title')}
          </h1>
          <p className="text-xl text-white mb-8 drop-shadow-md opacity-90">
            AgriSense — Smart Agriculture Platform
          </p>
          <p className="text-lg text-white/80 leading-relaxed drop-shadow-sm">
            {t('home.subtitle')}
          </p>

          {/* Floating Features */}
          <div className="grid grid-cols-3 gap-4 mt-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-2">
                <CloudSun className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm text-white/80 font-medium">Weather</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm text-white/80 font-medium">Soil</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm text-white/80 font-medium">AI Insights</p>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-16 h-16 bg-yellow-300/20 rounded-full flex items-center justify-center">
          <Sun className="w-8 h-8 text-yellow-300" />
        </div>
        <div className="absolute bottom-20 right-20 w-12 h-12 bg-blue-300/20 rounded-full flex items-center justify-center">
          <Wind className="w-6 h-6 text-blue-300" />
        </div>
        <div className="absolute top-1/2 right-10 w-10 h-10 bg-blue-400/20 rounded-full flex items-center justify-center">
          <Droplets className="w-5 h-5 text-blue-400" />
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="right-panel">
        <div className="w-full max-w-md">

          {/* Farm Login Form */}
          <div className="glass-panel rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sprout className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Get Started</h2>
              <p className="text-gray-600">Select your location and crop to receive personalized farming insights</p>
            </div>

            <div className="space-y-6">
              {/* Location Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <MapPin className="w-4 h-4 inline mr-2 text-green-600" />
                  Location
                </label>
                <div className="space-y-3">
                  {/* Location Input Field */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={location}
                      onChange={handleLocationInputChange}
                      onKeyPress={handleLocationInputKeyPress}
                      placeholder="Enter city, state, or address (e.g., Kochi, Kerala)"
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white"
                    />
                    <button
                      onClick={handleManualLocationSearch}
                      disabled={manualLocationLoading || !location.trim()}
                      className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      title="Search Location"
                    >
                      {manualLocationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Location Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={locationLoading}
                      className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
                      title="Use Current Location"
                    >
                      {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                      <span>Use My Location</span>
                    </button>
                    
                    {/* Popular Kerala locations quick select */}
                    <div className="w-full">
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
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm font-medium text-gray-700"
                      >
                        <option value="">Quick Select Region</option>
                        <optgroup label="Kerala Districts">
                          <option value="Kochi, Kerala">Kochi, Kerala</option>
                          <option value="Thiruvananthapuram, Kerala">Thiruvananthapuram, Kerala</option>
                          <option value="Thrissur, Kerala">Thrissur, Kerala</option>
                          <option value="Kozhikode, Kerala">Kozhikode, Kerala</option>
                          <option value="Kottayam, Kerala">Kottayam, Kerala</option>
                          <option value="Palakkad, Kerala">Palakkad, Kerala</option>
                          <option value="Alappuzha, Kerala">Alappuzha, Kerala</option>
                          <option value="Kollam, Kerala">Kollam, Kerala</option>
                          <option value="Kannur, Kerala">Kannur, Kerala</option>
                          <option value="Wayanad, Kerala">Wayanad, Kerala</option>
                          <option value="Idukki, Kerala">Idukki, Kerala</option>
                          <option value="Malappuram, Kerala">Malappuram, Kerala</option>
                          <option value="Kasaragod, Kerala">Kasaragod, Kerala</option>
                          <option value="Pathanamthitta, Kerala">Pathanamthitta, Kerala</option>
                        </optgroup>
                        <optgroup label="Other Agricultural Centers">
                          <option value="Mumbai, Maharashtra">Mumbai, Maharashtra</option>
                          <option value="Pune, Maharashtra">Pune, Maharashtra</option>
                          <option value="Bangalore, Karnataka">Bangalore, Karnataka</option>
                          <option value="Chennai, Tamil Nadu">Chennai, Tamil Nadu</option>
                          <option value="Hyderabad, Telangana">Hyderabad, Telangana</option>
                          <option value="Vijayawada, Andhra Pradesh">Vijayawada, Andhra Pradesh</option>
                          <option value="Mysore, Karnataka">Mysore, Karnataka</option>
                          <option value="Coimbatore, Tamil Nadu">Coimbatore, Tamil Nadu</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Location Status */}
                {currentLocation && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">
                        {locationSource === 'live' ? 'Live Location:' : 'Selected Location:'}
                      </span>
                      <span>{currentLocation.city}, {currentLocation.state || currentLocation.country}</span>
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Coordinates: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm flex items-center gap-2">
                      <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                      {error}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Crop Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <Sprout className="w-4 h-4 inline mr-2 text-green-600" />
                  {t('home.select_crop')}
                </label>
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white"
                >
                  {/* Major Indian crops */}
                  <optgroup label="Cereal & Grain Crops">
                    <option value="Rice">{t('crops.rice')}</option>
                    <option value="Wheat">{t('crops.wheat')}</option>
                    <option value="Maize">{t('crops.maize')}</option>
                    <option value="Bajra">{t('crops.bajra')}</option>
                    <option value="Jowar">{t('crops.jowar')}</option>
                    <option value="Barley">{t('crops.barley')}</option>
                  </optgroup>
                  <optgroup label="Cash Crops">
                    <option value="Sugarcane">{t('crops.sugarcane')}</option>
                    <option value="Cotton">{t('crops.cotton')}</option>
                    <option value="Mustard">{t('crops.mustard')}</option>
                  </optgroup>
                  <optgroup label="Pulses & Legumes">
                    <option value="Arhar">{t('crops.arhar')}</option>
                    <option value="Gram">{t('crops.gram')}</option>
                    <option value="Peas">{t('crops.peas')}</option>
                    <option value="Masoor">{t('crops.masoor')}</option>
                  </optgroup>
                  <optgroup label="Vegetables & Tubers">
                    <option value="Potato">{t('crops.potato')}</option>
                    <option value="Tapioca">{t('crops.tapioca')}</option>
                    <option value="Ginger">{t('crops.ginger')}</option>
                    <option value="Turmeric">{t('crops.turmeric')}</option>
                  </optgroup>
                  <optgroup label="Fruits">
                    <option value="Banana">{t('crops.banana')}</option>
                    <option value="Mango">{t('crops.mango')}</option>
                    <option value="Papaya">{t('crops.papaya')}</option>
                    <option value="Pineapple">{t('crops.pineapple')}</option>
                    <option value="Jackfruit">{t('crops.jackfruit')}</option>
                    <option value="Coconut">{t('crops.coconut')}</option>
                  </optgroup>
                  <optgroup label="Plantation & Spices">
                    <option value="Black Pepper">{t('crops.black_pepper')}</option>
                    <option value="Cardamom">{t('crops.cardamom')}</option>
                    <option value="Tea">{t('crops.tea')}</option>
                    <option value="Coffee">{t('crops.coffee')}</option>
                    <option value="Rubber">{t('crops.rubber')}</option>
                    <option value="Cashew">{t('crops.cashew')}</option>
                    <option value="Areca Nut">{t('crops.areca_nut')}</option>
                    <option value="Vanilla">{t('crops.vanilla')}</option>
                    <option value="Cocoa">{t('crops.cocoa')}</option>
                    <option value="Nutmeg">{t('crops.nutmeg')}</option>
                    <option value="Cloves">{t('crops.cloves')}</option>
                    <option value="Cinnamon">{t('crops.cinnamon')}</option>
                  </optgroup>
                </select>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={locationLoading || manualLocationLoading}
                className="w-full farm-button px-6 py-4 text-white text-lg font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {locationLoading || manualLocationLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing Location...</span>
                  </>
                ) : currentLocation ? (
                  <>
                    <span>Get My Farm Dashboard</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : location.trim() ? (
                  <>
                    <span>Search & Continue</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    <span>Enter Location to Continue</span>
                    <MapPin className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            {/* Quick Features */}
            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-100">
              <div className="text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <CloudSun className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs text-gray-600 font-medium">Weather</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Leaf className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-xs text-gray-600 font-medium">Soil</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-xs text-gray-600 font-medium">AI Insights</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;