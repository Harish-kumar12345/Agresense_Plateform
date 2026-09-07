import React, { useState, useEffect } from 'react';
import { Save, Sprout, MapPin, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { FarmData } from '../../services/farmService';

const CROPS = [
  'Rice',
  'Wheat',
  'Maize',
  'Cotton',
  'Sugarcane',
  'Coconut',
  'Pepper',
  'Cardamom',
  'Rubber',
  'Other'
];

const SEASONS = ['Kharif', 'Rabi', 'Zaid', 'Year-round'];

const SOIL_TYPES = [
  'Clay Loam',
  'Sandy Loam',
  'Loamy',
  'Alluvial Soil',
  'Black Soil',
  'Red Soil',
  'Laterite Soil',
  'Peaty/Marshy'
];

const IRRIGATION_TYPES = [
  'Canal',
  'Drip Irrigation',
  'Sprinkler',
  'Flood / Surface',
  'Rainfed',
  'Sub-surface'
];

interface FarmDetailsFormProps {
  latitude: number;
  longitude: number;
  locationName: string;
  areaMetrics: {
    areaSqm: number;
    areaHectares: number;
    areaAcres: number;
    areaBigha: number;
  };
  boundaryGeoJSON: any;
  onSave: (farm: Omit<FarmData, 'farm_id'>) => Promise<void>;
  isSaving: boolean;
  farmerId?: string;
  farmerName?: string;
}

export const FarmDetailsForm: React.FC<FarmDetailsFormProps> = ({
  latitude,
  longitude,
  locationName,
  areaMetrics,
  boundaryGeoJSON,
  onSave,
  isSaving,
  farmerId: propsFormerId,
  farmerName
}) => {
  const [farmName, setFarmName] = useState('');
  const [crop, setCrop] = useState('Rice');
  const [season, setSeason] = useState('Kharif');
  const [soilType, setSoilType] = useState('Clay Loam');
  const [irrigationType, setIrrigationType] = useState('Canal');
  const [farmerId, setFarmerId] = useState(propsFormerId || 'FARMER_001');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!farmName.trim()) {
      setError('Please enter a valid Farm Name');
      return;
    }

    if (!areaMetrics || areaMetrics.areaHectares <= 0) {
      setError('Please draw a valid farm boundary on the map first to calculate area');
      return;
    }

    try {
      await onSave({
        farm_name: farmName.trim(),
        farmer_id: farmerId.trim(),
        crop,
        season,
        latitude,
        longitude,
        area_hectares: areaMetrics.areaHectares,
        area_acres: areaMetrics.areaAcres,
        area_sqm: areaMetrics.areaSqm,
        area_bigha: areaMetrics.areaBigha,
        boundary_geojson: boundaryGeoJSON,
        location_name: locationName || 'Unknown Location',
        soil_type: soilType,
        irrigation_type: irrigationType
      });
      setFarmName('');
    } catch (err: any) {
      setError(err.message || 'Failed to save farm. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-md space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
          <Sprout className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-gray-800">Farm Information & Details</h3>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Farm Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Farm Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
            placeholder="e.g. Green Valley Rice Field"
            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
          />
        </div>

        {/* Crop Selection */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Primary Crop <span className="text-rose-500">*</span>
          </label>
          <select
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
          >
            {CROPS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Season Selection */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Cropping Season</label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
          >
            {SEASONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Soil Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Soil Type</label>
          <select
            value={soilType}
            onChange={(e) => setSoilType(e.target.value)}
            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
          >
            {SOIL_TYPES.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        {/* Irrigation Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Irrigation System</label>
          <select
            value={irrigationType}
            onChange={(e) => setIrrigationType(e.target.value)}
            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
          >
            {IRRIGATION_TYPES.map(it => (
              <option key={it} value={it}>{it}</option>
            ))}
          </select>
        </div>

        {/* Farmer ID */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Farmer / Owner ID</label>
          <input
            type="text"
            value={farmerId}
            onChange={(e) => setFarmerId(e.target.value)}
            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
          />
        </div>
      </div>

      {/* Auto-populated Auto Readonly Summary Fields */}
      <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs space-y-1 text-gray-600">
        <div className="flex items-center justify-between">
          <span>Location: <strong>{locationName}</strong></span>
          <span>Coordinates: <strong>{latitude.toFixed(4)}, {longitude.toFixed(4)}</strong></span>
        </div>
        <div className="flex items-center justify-between">
          <span>Calculated Area: <strong>{areaMetrics.areaHectares} ha ({areaMetrics.areaAcres} ac)</strong></span>
          <span>Boundary Status: <strong className="text-emerald-700">{boundaryGeoJSON ? 'Boundary Defined ✓' : 'Point Marker'}</strong></span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving Farm...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Farm Field
          </>
        )}
      </button>
    </form>
  );
};
