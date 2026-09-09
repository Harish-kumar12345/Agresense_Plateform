import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, Layers, CheckCircle2, ArrowRight, RefreshCw, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { FarmMap } from './FarmMap';
import { FarmBoundaryDrawer } from './FarmBoundaryDrawer';
import { FarmAreaCalculator } from './FarmAreaCalculator';
import { FarmDetailsForm } from './FarmDetailsForm';
import { SavedFields } from './SavedFields';
import { farmService, FarmData } from '../../services/farmService';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { colors, motionPresets } from '../../styles/design-tokens';

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

  useEffect(() => {
    if (initialTab === 'saved-fields' && savedFarms.length > 0 && savedFieldsRef.current) {
      setTimeout(() => {
        savedFieldsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [initialTab, savedFarms]);

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

  const handleSaveFarm = async (farmPayload: Omit<FarmData, 'farm_id'>) => {
    setIsSaving(true);
    setSuccessMessage('');

    let geojsonBoundary = null;
    if (polygonPoints.length >= 3) {
      const coords = polygonPoints.map(p => [p[1], p[0]]);
      coords.push([polygonPoints[0][1], polygonPoints[0][0]]);
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
    <motion.div
      variants={motionPresets.container}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-slate-100 font-sans"
    >
      {/* Header Banner */}
      <motion.div variants={motionPresets.item} className="hero-banner-aurora hero-aurora-emerald">
        <div className="hero-banner-content space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold backdrop-blur-md border border-emerald-400/30">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>GIS & Precision Cadastral Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-white">
            Farm Boundary & Geodesic Mapping
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Locate your field on live satellite maps, draw precision polygon boundaries, automatically calculate geodesic land area, and synchronize plots with AgriSense predictive models.
          </p>
        </div>
      </motion.div>

      {/* Setup Step Progress Stepper */}
      <motion.div variants={motionPresets.item}>
        <Card variant="elevated" tone="farm" className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          <div className={`p-3 rounded-2xl border transition-all ${userGpsLocation || mapCenter ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-xs' : 'bg-[#070D0A]/70 border-emerald-900/40 text-slate-400'}`}>
            <span className="font-bold text-sm block">Step 1</span>
            Set Location
          </div>
          <div className={`p-3 rounded-2xl border transition-all ${polygonPoints.length > 0 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-xs' : 'bg-[#070D0A]/70 border-emerald-900/40 text-slate-400'}`}>
            <span className="font-bold text-sm block">Step 2</span>
            Draw Boundary
          </div>
          <div className={`p-3 rounded-2xl border transition-all ${isClosed ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-xs' : 'bg-[#070D0A]/70 border-emerald-900/40 text-slate-400'}`}>
            <span className="font-bold text-sm block">Step 3</span>
            Calculate Area
          </div>
          <div className={`p-3 rounded-2xl border transition-all ${savedFarms.length > 0 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-xs' : 'bg-[#070D0A]/70 border-emerald-900/40 text-slate-400'}`}>
            <span className="font-bold text-sm block">Step 4</span>
            Save & Sync
          </div>
        </div>
      </Card>
      </motion.div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs sm:text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold text-white">{successMessage}</span>
          </div>
          {onGoToDashboard && (
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={onGoToDashboard}
            >
              Go to Dashboard
            </Button>
          )}
        </div>
      )}

      {/* Error Notification Alert */}
      {locationError && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{locationError}</span>
        </div>
      )}

      {/* Location Search Bar & Live GPS Button */}
      <Card variant="elevated" className="p-4 flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchLocation} className="flex-1 flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-emerald-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city, district, village, or landmark (e.g. Palakkad, Ghaziabad)..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#070D0A]/90 border border-emerald-900/40 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none placeholder:text-slate-500"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </form>

        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<Navigation className="w-4 h-4 text-emerald-400" />}
          onClick={handleUseCurrentLocation}
          className="w-full md:w-auto border-white/10 text-slate-200 hover:bg-white/5"
        >
          Use Current GPS Location
        </Button>
      </Card>

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
    </motion.div>
  );
};
