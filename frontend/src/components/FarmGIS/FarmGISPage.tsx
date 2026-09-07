import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, Layers, CheckCircle2, ArrowRight, RefreshCw, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { FarmMap } from './FarmMap';
import { FarmBoundaryDrawer } from './FarmBoundaryDrawer';
import { FarmAreaCalculator } from './FarmAreaCalculator';
import { FarmDetailsForm } from './FarmDetailsForm';
import { SavedFields } from './SavedFields';
import { farmService, FarmData } from '../../services/farmService';
import { useAuth } from '../../contexts/AuthContext';

type Point = [number, number]; // [lat, lng]

interface FarmGISPageProps {
  onSelectFarmForDashboard?: (farm: FarmData) => void;
  onGoToDashboard?: () => void;
  initialTab?: 'saved-fields' | 'new-field';
}

export const FarmGISPage: React.FC<FarmGISPageProps> = ({
  onSelectFarmForDashboard,
  onGoToDashboard,
  initialTab
}) => {
  const { user } = useAuth();
  const farmerId = user?.id || 'default_farmer';
  const savedFieldsRef = useRef<HTMLDivElement>(null);
  // Map position state (Default: Ghaziabad/Delhi region or Kerala fallback)
  const [mapCenter, setMapCenter] = useState<Point>([28.6692, 77.4538]);
  const [userGpsLocation, setUserGpsLocation] = useState<Point | null>(null);
  const [locationName, setLocationName] = useState('Ghaziabad, Uttar Pradesh');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Boundary drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  const [isClosed, setIsClosed] = useState(false);

  // Calculated area state
  const [areaMetrics, setAreaMetrics] = useState({
    areaSqm: 0,
    areaHectares: 0,
    areaAcres: 0,
    areaBigha: 0
  });

  // Saved farms state
  const [savedFarms, setSavedFarms] = useState<FarmData[]>([]);
  const [activeFarmId, setActiveFarmId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load saved farms on mount
  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    try {
      const farms = await farmService.getFarms(farmerId);
      setSavedFarms(farms);
      if (farms.length > 0 && !activeFarmId) {
        setActiveFarmId(farms[0].farm_id);
      }
    } catch (e) {
      console.error('Failed to load farms:', e);
    }
  };

  // Auto-scroll to saved fields section when navigated with initialTab='saved-fields'
  useEffect(() => {
    if (initialTab === 'saved-fields' && savedFarms.length > 0 && savedFieldsRef.current) {
      setTimeout(() => {
        savedFieldsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [initialTab, savedFarms]);

  // 1. Live GPS Location Handler
  const handleUseCurrentLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: Point = [pos.coords.latitude, pos.coords.longitude];
        setUserGpsLocation(coords);
        setMapCenter(coords);
        
        // Reverse Geocode location
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords[0]}&lon=${coords[1]}&format=json`);
          const data = await res.json();
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.county || 'Detected Location';
            const state = data.address.state || '';
            const country = data.address.country || 'India';
            setLocationName(`${city}${state ? ', ' + state : ''}, ${country}`);
          } else {
            setLocationName(`Lat: ${coords[0].toFixed(4)}, Lon: ${coords[1].toFixed(4)}`);
          }
        } catch (e) {
          setLocationName(`Lat: ${coords[0].toFixed(4)}, Lon: ${coords[1].toFixed(4)}`);
        }
      },
      (err) => {
        console.error('GPS Error:', err);
        setLocationError(`GPS Location Error: ${err.message}. You can manually search or pick a location below.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 2. Search Location Handler
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setLocationError('');

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const newCoords: Point = [parseFloat(item.lat), parseFloat(item.lon)];
        setMapCenter(newCoords);
        setLocationName(item.display_name.split(',').slice(0, 3).join(','));
      } else {
        setLocationError('Location not found. Please try searching another city or region.');
      }
    } catch (err) {
      setLocationError('Search service temporary error. Please enter coordinates manually.');
    } finally {
      setIsSearching(false);
    }
  };

  // 3. Boundary Drawing Handlers
  const handleMapClick = (pt: Point) => {
    if (isClosed) return;
    setPolygonPoints(prev => [...prev, pt]);
  };

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setPolygonPoints([]);
    setIsClosed(false);
  };

  const handleFinishPolygon = () => {
    if (polygonPoints.length < 3) return;
    setIsClosed(true);
    setIsDrawing(false);
  };

  const handleClearPoints = () => {
    setPolygonPoints([]);
    setIsClosed(false);
    setIsDrawing(false);
    setAreaMetrics({ areaSqm: 0, areaHectares: 0, areaAcres: 0, areaBigha: 0 });
  };

  const handleRedraw = () => {
    handleClearPoints();
    setIsDrawing(true);
  };

  // 4. Save Farm Handler
  const handleSaveFarm = async (farmPayload: Omit<FarmData, 'farm_id'>) => {
    setIsSaving(true);
    setSuccessMessage('');

    // Generate GeoJSON boundary polygon feature
    let geojsonBoundary = null;
    if (polygonPoints.length >= 3) {
      const coords = polygonPoints.map(p => [p[1], p[0]]); // [lng, lat]
      coords.push([polygonPoints[0][1], polygonPoints[0][0]]); // Close loop
      geojsonBoundary = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        },
        properties: {
          name: farmPayload.farm_name,
          crop: farmPayload.crop,
          area_ha: farmPayload.area_hectares
        }
      };
    }

    try {
      const saved = await farmService.saveFarm({
        ...farmPayload,
        farmer_id: farmerId,
        boundary_geojson: geojsonBoundary
      });

      setSuccessMessage(`Farm "${saved.farm_name}" saved successfully!`);
      setActiveFarmId(saved.farm_id);
      await loadFarms();

      if (onSelectFarmForDashboard) {
        onSelectFarmForDashboard(saved);
      }
    } catch (e: any) {
      throw new Error(e.message || 'Failed to save farm.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectFarm = (farm: FarmData) => {
    setActiveFarmId(farm.farm_id);
    if (onSelectFarmForDashboard) {
      onSelectFarmForDashboard(farm);
    }
    if (onGoToDashboard) {
      onGoToDashboard();
    }
  };

  const handleViewOnMap = (farm: FarmData) => {
    setMapCenter([farm.latitude, farm.longitude]);
    setLocationName(farm.location_name);
  };

  const handleDeleteFarm = async (farmId: string) => {
    if (window.confirm('Are you sure you want to delete this farm field?')) {
      await farmService.deleteFarm(farmId);
      await loadFarms();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" /> GIS & Precision Location Intelligence
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Farm GIS Boundary & Location Setup</h2>
          <p className="text-sm text-emerald-100 max-w-2xl">
            Locate your field on live satellite maps, draw precision farm boundaries, automatically calculate geodesic land area, and save fields to sync with AgriSense AI intelligence.
          </p>
        </div>
      </div>

      {/* Setup Step Progress Workflow */}
      <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-medium">
          <div className={`p-2.5 rounded-xl border ${userGpsLocation || mapCenter ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
            <span className="font-bold text-sm block">Step 1</span>
            1. Set Location
          </div>
          <div className={`p-2.5 rounded-xl border ${polygonPoints.length > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
            <span className="font-bold text-sm block">Step 2</span>
            2. Draw Boundary
          </div>
          <div className={`p-2.5 rounded-xl border ${isClosed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
            <span className="font-bold text-sm block">Step 3</span>
            3. Calculate Area
          </div>
          <div className={`p-2.5 rounded-xl border ${savedFarms.length > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
            <span className="font-bold text-sm block">Step 4</span>
            4. Save & Launch
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          {onGoToDashboard && (
            <button
              onClick={onGoToDashboard}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-xs flex items-center gap-1 transition-all shadow-sm"
            >
              Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Error Notification Alert */}
      {locationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{locationError}</span>
        </div>
      )}

      {/* Location Search Bar & Live GPS Button */}
      <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-md flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchLocation} className="flex-1 flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city, district, village, or landmark (e.g. Ghaziabad, Palakkad)..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shrink-0"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="w-full md:w-auto px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <Navigation className="w-4 h-4 text-emerald-600" />
          Use My Current GPS Location
        </button>
      </div>

      {/* Main Map & Boundary Drawing Section */}
      <div className="space-y-3">
        <FarmBoundaryDrawer
          isDrawing={isDrawing}
          pointCount={polygonPoints.length}
          isClosed={isClosed}
          onStartDrawing={handleStartDrawing}
          onFinishPolygon={handleFinishPolygon}
          onClearPoints={handleClearPoints}
          onRedraw={handleRedraw}
        />

        <FarmMap
          center={mapCenter}
          userLocation={userGpsLocation}
          polygonPoints={polygonPoints}
          isClosed={isClosed}
          isDrawing={isDrawing}
          onMapClick={handleMapClick}
          savedFarms={savedFarms}
          onSelectSavedFarm={handleSelectFarm}
        />
      </div>

      {/* GIS Area Calculation & Details Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FarmAreaCalculator
          polygonPoints={polygonPoints}
          onAreaCalculated={setAreaMetrics}
        />

        <FarmDetailsForm
          latitude={mapCenter[0]}
          longitude={mapCenter[1]}
          locationName={locationName}
          areaMetrics={areaMetrics}
          boundaryGeoJSON={polygonPoints.length >= 3 ? { type: 'Feature', geometry: { type: 'Polygon', coordinates: [polygonPoints.map(p => [p[1], p[0]])] } } : null}
          onSave={handleSaveFarm}
          isSaving={isSaving}
          farmerId={farmerId}
          farmerName={user?.name}
        />
      </div>

      {/* Saved Farms Fields Manager */}
      <div ref={savedFieldsRef}>
        <SavedFields
          farms={savedFarms}
          activeFarmId={activeFarmId}
          onSelectFarm={handleSelectFarm}
          onViewOnMap={handleViewOnMap}
          onDeleteFarm={handleDeleteFarm}
        />
      </div>
    </div>
  );
};
