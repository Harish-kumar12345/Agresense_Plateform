import axios from 'axios';

export type GeoJSONPolygon = {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
  };
  properties?: Record<string, any>;
};

export type FarmData = {
  farm_id: string;
  farm_name: string;
  farmer_id: string;
  crop: string;
  season: string;
  latitude: number;
  longitude: number;
  area_hectares: number;
  area_acres: number;
  area_sqm?: number;
  area_bigha?: number;
  boundary_geojson?: GeoJSONPolygon | null;
  location_name: string;
  soil_type?: string;
  irrigation_type?: string;
  created_at?: string;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const STORAGE_KEY = 'agrisense_saved_farms';

// Helper: get auth headers if a token exists
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('agrisense_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export const farmService = {
  // Fetch all saved farms
  async getFarms(farmerId: string = 'default_farmer'): Promise<FarmData[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/farms`, {
        params: { farmer_id: farmerId },
        headers: getAuthHeaders(),
        timeout: 5000
      });
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        // Sync local storage cache
        localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data.data));
        return response.data.data;
      }
    } catch (error) {
      console.warn('Backend API unavailable, loading farms from local storage:', error);
    }
    
    // Local storage fallback
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached farms:', e);
      }
    }
    return [];
  },

  // Save a new farm
  async saveFarm(farm: Omit<FarmData, 'farm_id'> & { farm_id?: string }): Promise<FarmData> {
    const farmId = farm.farm_id || 'farm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newFarm: FarmData = {
      ...farm,
      farm_id: farmId,
      created_at: new Date().toISOString()
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/farms`, newFarm, {
        headers: getAuthHeaders(),
        timeout: 5000
      });
      if (response.data && response.data.success && response.data.data) {
        // Update local cache
        const farms = await this.getFarms(farm.farmer_id);
        const updatedFarms = [response.data.data, ...farms.filter(f => f.farm_id !== response.data.data.farm_id)];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFarms));
        return response.data.data;
      }
    } catch (error) {
      console.warn('Backend API unreachable, saving farm locally:', error);
    }

    // Local storage fallback
    const cached = localStorage.getItem(STORAGE_KEY);
    let farms: FarmData[] = [];
    if (cached) {
      try {
        farms = JSON.parse(cached);
      } catch (e) {}
    }
    const updated = [newFarm, ...farms.filter(f => f.farm_id !== newFarm.farm_id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newFarm;
  },

  // Delete a farm
  async deleteFarm(farmId: string): Promise<boolean> {
    try {
      await axios.delete(`${API_BASE_URL}/farms/${farmId}`, {
        headers: getAuthHeaders(),
        timeout: 5000
      });
    } catch (error) {
      console.warn('Backend API delete error, removing from local storage:', error);
    }

    // Local storage fallback
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const farms: FarmData[] = JSON.parse(cached);
        const filtered = farms.filter(f => f.farm_id !== farmId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      } catch (e) {}
    }
    return true;
  }
};
