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
    <form onSubmit={handleSubmit} className="saas-card p-6 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
        <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
          <Sprout className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-white text-sm font-display">Farm Information & Details</h3>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Farm Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Farm Plot Name <span className="text-emerald-400">*</span>
          </label>
          <input
            type="text"
            required
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
            placeholder="e.g. North Acre Paddy Field"
            className="w-full px-3.5 py-2.5 bg-[#070D0A]/90 border border-emerald-900/40 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:bg-[#070D0A] focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
          />
        </div>

        {/* Crop Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Cultivated Crop <span className="text-emerald-400">*</span>
          </label>
          <select
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#070D0A]/90 border border-emerald-900/40 rounded-xl text-xs text-white focus:border-emerald-500 focus:bg-[#070D0A] focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer"
          >
            {CROPS.map(c => (
              <option key={c} value={c} className="bg-[#070D0A] text-white">{c}</option>
            ))}
          </select>
        </div>

        {/* Season Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Agronomic Season</label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#070D0A]/90 border border-emerald-900/40 rounded-xl text-xs text-white focus:border-emerald-500 focus:bg-[#070D0A] focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer"
          >
            {SEASONS.map(s => (
              <option key={s} value={s} className="bg-[#070D0A] text-white">{s}</option>
            ))}
          </select>
        </div>

        {/* Soil Type */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Soil Classification</label>
          <select
            value={soilType}
            onChange={(e) => setSoilType(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#070D0A]/90 border border-emerald-900/40 rounded-xl text-xs text-white focus:border-emerald-500 focus:bg-[#070D0A] focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer"
          >
            {SOIL_TYPES.map(st => (
              <option key={st} value={st} className="bg-[#070D0A] text-white">{st}</option>
            ))}
          </select>
        </div>

        {/* Irrigation Type */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Irrigation Scheme</label>
          <select
            value={irrigationType}
            onChange={(e) => setIrrigationType(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#070D0A]/90 border border-emerald-900/40 rounded-xl text-xs text-white focus:border-emerald-500 focus:bg-[#070D0A] focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer"
          >
            {IRRIGATION_TYPES.map(it => (
              <option key={it} value={it} className="bg-[#070D0A] text-white">{it}</option>
            ))}
          </select>
        </div>

        {/* Farmer ID */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Farmer Cadastral ID</label>
          <input
            type="text"
            value={farmerId}
            onChange={(e) => setFarmerId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#070D0A]/90 border border-emerald-900/40 rounded-xl text-xs text-white focus:border-emerald-500 focus:bg-[#070D0A] focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-mono"
          />
        </div>
      </div>

      {/* Auto-populated Cadastral Summary Box */}
      <div className="p-3.5 bg-[#070D0A]/80 rounded-xl border border-emerald-900/40 text-xs space-y-1.5 text-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Location:</span>
          <span className="font-semibold text-white truncate max-w-[200px]">{locationName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Coordinates:</span>
          <span className="font-mono text-emerald-400">{latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-emerald-950/40">
          <span className="text-slate-400">Calculated Land Area:</span>
          <span className="font-bold text-white">{areaMetrics.areaHectares} ha ({areaMetrics.areaAcres} ac)</span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSaving}
        className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Synchronizing Plot to Database...</span>
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            <span>Save Field to Cadastral Database</span>
          </>
        )}
      </button>
    </form>
  );
};
