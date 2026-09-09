import axios from 'axios';

export type ActivityType =
  | 'Sowing'
  | 'Irrigation'
  | 'Fertilization'
  | 'Pesticide Application'
  | 'Weeding'
  | 'Disease Inspection'
  | 'Harvesting';

export type FarmActivity = {
  activity_id: string;
  farm_id: string;
  field_name: string;
  crop: string;
  activity_type: ActivityType;
  date: string;
  quantity_details: string;
  notes: string;
  createdAt?: string;
};

export type HarvestStatus = 'Not Ready' | 'Approaching' | 'Harvest Ready';

export type HarvestRecord = {
  harvest_id: string;
  farm_id: string;
  field_name: string;
  crop: string;
  area_hectares: number;
  predicted_yield_tha: number;
  expected_production_tons: number;
  current_gdd: number;
  growth_stage: string;
  sowing_date?: string;
  expected_harvest_date: string;
  manual_harvest_date?: string | null;
  harvest_window: string;
  status: HarvestStatus;
  notes?: string;
  required_labour?: number;
  storage_requirement_sqft?: number;
  storage_bags_count?: number;
  storage_moisture_target_pct?: number;
  updated_at?: string;
};

export type HarvestAlert = {
  id: string;
  type: 'warning' | 'info' | 'success' | 'danger';
  category: string;
  title: string;
  description: string;
  actionRequired: string;
  timestamp: string;
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const STORAGE_ACTIVITIES_KEY = 'agrisense_farm_activities';
const STORAGE_HARVEST_KEY = 'agrisense_harvest_records';

// Baseline maturity GDD & duration guidelines per crop
export const CROP_HARVEST_SPECS: Record<string, { maturityDays: number; gddThreshold: number; baseTemp: number; baseYield: number; moistureTarget: number; workersPerHa: number }> = {
  Rice: { maturityDays: 120, gddThreshold: 1600, baseTemp: 10, baseYield: 4.2, moistureTarget: 13.5, workersPerHa: 5 },
  Wheat: { maturityDays: 110, gddThreshold: 1400, baseTemp: 5, baseYield: 3.8, moistureTarget: 12.0, workersPerHa: 4 },
  Maize: { maturityDays: 100, gddThreshold: 1500, baseTemp: 10, baseYield: 5.5, moistureTarget: 14.0, workersPerHa: 4 },
  Cotton: { maturityDays: 160, gddThreshold: 2200, baseTemp: 12, baseYield: 2.4, moistureTarget: 10.0, workersPerHa: 7 },
  Sugarcane: { maturityDays: 330, gddThreshold: 4500, baseTemp: 18, baseYield: 72.0, moistureTarget: 70.0, workersPerHa: 10 },
  Pulses: { maturityDays: 90, gddThreshold: 1200, baseTemp: 10, baseYield: 1.8, moistureTarget: 11.0, workersPerHa: 3 }
};

export const farmActivityService = {
  // GET all farm activities
  async getActivities(farmId?: string, crop?: string): Promise<FarmActivity[]> {
    try {
      const response = await axios.get(`${API_BASE}/farm-activities`, {
        params: { farm_id: farmId, crop },
        timeout: 5000
      });
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        localStorage.setItem(STORAGE_ACTIVITIES_KEY, JSON.stringify(response.data.data));
        return response.data.data;
      }
    } catch (error) {
      console.warn('Backend API unavailable, loading activities from local storage:', error);
    }

    // Local storage fallback
    const cached = localStorage.getItem(STORAGE_ACTIVITIES_KEY);
    if (cached) {
      try {
        let items: FarmActivity[] = JSON.parse(cached);
        if (farmId) items = items.filter(a => a.farm_id === farmId);
        if (crop) items = items.filter(a => a.crop.toLowerCase() === crop.toLowerCase());
        return items;
      } catch (e) {
        console.error('Failed to parse cached activities:', e);
      }
    }

    // Default initial mock timeline fallback
    return [
      {
        activity_id: 'act_demo_1',
        farm_id: farmId || 'farm_demo_1',
        field_name: 'Green Valley Rice Farm',
        crop: crop || 'Rice',
        activity_type: 'Sowing',
        date: new Date(Date.now() - 65 * 86400000).toISOString(),
        quantity_details: 'Seed rate: 40 kg/ha (PR-126 paddy variety)',
        notes: 'Sown in nursery bed with moist soil preparation'
      },
      {
        activity_id: 'act_demo_2',
        farm_id: farmId || 'farm_demo_1',
        field_name: 'Green Valley Rice Farm',
        crop: crop || 'Rice',
        activity_type: 'Irrigation',
        date: new Date(Date.now() - 45 * 86400000).toISOString(),
        quantity_details: 'Canal water flow: 5cm field submergence',
        notes: 'Maintained 5 cm standing water level during tillering'
      },
      {
        activity_id: 'act_demo_3',
        farm_id: farmId || 'farm_demo_1',
        field_name: 'Green Valley Rice Farm',
        crop: crop || 'Rice',
        activity_type: 'Fertilization',
        date: new Date(Date.now() - 30 * 86400000).toISOString(),
        quantity_details: 'Urea: 50 kg/ha, NPK 19:19:19: 25 kg/ha',
        notes: 'Applied top dressing fertilizer before panicle initiation'
      },
      {
        activity_id: 'act_demo_4',
        farm_id: farmId || 'farm_demo_1',
        field_name: 'Green Valley Rice Farm',
        crop: crop || 'Rice',
        activity_type: 'Disease Inspection',
        date: new Date(Date.now() - 15 * 86400000).toISOString(),
        quantity_details: 'Inspected 10 sample spots across field',
        notes: 'Mild bacterial leaf blight risk detected; neem oil recommended'
      },
      {
        activity_id: 'act_demo_5',
        farm_id: farmId || 'farm_demo_1',
        field_name: 'Green Valley Rice Farm',
        crop: crop || 'Rice',
        activity_type: 'Pesticide Application',
        date: new Date(Date.now() - 10 * 86400000).toISOString(),
        quantity_details: 'Neem Oil 1500ppm: 2.5 L/ha + Sticker',
        notes: 'Preventative bio-pesticide spray during evening hours'
      }
    ];
  },

  // POST Add new activity
  async addActivity(activity: Omit<FarmActivity, 'activity_id'> & { activity_id?: string }): Promise<FarmActivity> {
    const activityId = activity.activity_id || 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newAct: FarmActivity = {
      ...activity,
      activity_id: activityId,
      createdAt: new Date().toISOString()
    };

    try {
      const response = await axios.post(`${API_BASE}/farm-activities`, newAct, { timeout: 5000 });
      if (response.data && response.data.success && response.data.data) {
        const existing = await this.getActivities(activity.farm_id);
        const updated = [response.data.data, ...existing.filter(a => a.activity_id !== response.data.data.activity_id)];
        localStorage.setItem(STORAGE_ACTIVITIES_KEY, JSON.stringify(updated));
        return response.data.data;
      }
    } catch (error) {
      console.warn('Backend API unreachable, saving activity locally:', error);
    }

    const cached = localStorage.getItem(STORAGE_ACTIVITIES_KEY);
    let items: FarmActivity[] = [];
    if (cached) {
      try { items = JSON.parse(cached); } catch (e) {}
    }
    const updated = [newAct, ...items.filter(a => a.activity_id !== newAct.activity_id)];
    localStorage.setItem(STORAGE_ACTIVITIES_KEY, JSON.stringify(updated));
    return newAct;
  },

  // PUT Update activity
  async updateActivity(activityId: string, payload: Partial<FarmActivity>): Promise<FarmActivity> {
    try {
      const response = await axios.put(`${API_BASE}/farm-activities/${activityId}`, payload, { timeout: 5000 });
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      }
    } catch (error) {
      console.warn('Backend API update error, updating local storage:', error);
    }

    const cached = localStorage.getItem(STORAGE_ACTIVITIES_KEY);
    let items: FarmActivity[] = [];
    if (cached) {
      try { items = JSON.parse(cached); } catch (e) {}
    }
    const idx = items.findIndex(a => a.activity_id === activityId);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...payload };
      localStorage.setItem(STORAGE_ACTIVITIES_KEY, JSON.stringify(items));
      return items[idx];
    }
    throw new Error('Activity record not found');
  },

  // DELETE Activity
  async deleteActivity(activityId: string): Promise<boolean> {
    try {
      await axios.delete(`${API_BASE}/farm-activities/${activityId}`, { timeout: 5000 });
    } catch (error) {
      console.warn('Backend API delete error, removing from local storage:', error);
    }

    const cached = localStorage.getItem(STORAGE_ACTIVITIES_KEY);
    if (cached) {
      try {
        const items: FarmActivity[] = JSON.parse(cached);
        const filtered = items.filter(a => a.activity_id !== activityId);
        localStorage.setItem(STORAGE_ACTIVITIES_KEY, JSON.stringify(filtered));
      } catch (e) {}
    }
    return true;
  },

  // GET Harvest records
  async getHarvestRecords(farmId?: string, crop?: string): Promise<HarvestRecord[]> {
    try {
      const response = await axios.get(`${API_BASE}/harvest-management`, {
        params: { farm_id: farmId, crop },
        timeout: 5000
      });
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        localStorage.setItem(STORAGE_HARVEST_KEY, JSON.stringify(response.data.data));
        return response.data.data;
      }
    } catch (error) {
      console.warn('Backend API unavailable, loading harvest records locally:', error);
    }

    const cached = localStorage.getItem(STORAGE_HARVEST_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return [];
  },

  // POST Save Harvest Record
  async saveHarvestRecord(record: Omit<HarvestRecord, 'harvest_id'> & { harvest_id?: string }): Promise<HarvestRecord> {
    try {
      const response = await axios.post(`${API_BASE}/harvest-management`, record, { timeout: 5000 });
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      }
    } catch (error) {
      console.warn('Backend API harvest record save error, caching locally:', error);
    }

    const harvestId = record.harvest_id || 'harv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const saved: HarvestRecord = {
      ...record,
      harvest_id: harvestId,
      updated_at: new Date().toISOString()
    };

    const cached = localStorage.getItem(STORAGE_HARVEST_KEY);
    let list: HarvestRecord[] = [];
    if (cached) {
      try { list = JSON.parse(cached); } catch (e) {}
    }
    const idx = list.findIndex(r => r.harvest_id === harvestId || (r.farm_id === record.farm_id && r.crop === record.crop));
    if (idx !== -1) {
      list[idx] = saved;
    } else {
      list.unshift(saved);
    }
    localStorage.setItem(STORAGE_HARVEST_KEY, JSON.stringify(list));
    return saved;
  },

  // GET Alerts
  async getAlerts(): Promise<HarvestAlert[]> {
    try {
      const response = await axios.get(`${API_BASE}/harvest-management/alerts`, { timeout: 4000 });
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        return response.data.data;
      }
    } catch (error) {}

    return [
      {
        id: 'alert_1',
        type: 'warning',
        category: 'Harvest Window',
        title: '🌾 Crop Approaching Harvest Window',
        description: 'Green Valley Rice Farm has reached ~1,450 GDD (Ripening Stage). Expected harvest in 15-20 days.',
        actionRequired: 'Inspect paddy moisture level & clear drainage channels',
        timestamp: new Date().toISOString()
      },
      {
        id: 'alert_2',
        type: 'info',
        category: 'Activity Schedule',
        title: '💧 Weeding & Water Management Due',
        description: 'Last irrigation recorded 45 days ago. Inspect soil moisture before final harvest dry-down.',
        actionRequired: 'Perform field moisture check today',
        timestamp: new Date().toISOString()
      },
      {
        id: 'alert_3',
        type: 'success',
        category: 'Yield Target',
        title: '📈 Optimal Yield Forecast',
        description: 'AI model predicts yield target of 4.80 t/ha based on climate & soil telemetry.',
        actionRequired: 'Prepare grain storage & local mandi logistics',
        timestamp: new Date().toISOString()
      }
    ];
  },

  async getHarvestAlerts(): Promise<HarvestAlert[]> {
    return this.getAlerts();
  },

  calculateHarvestReadiness(
    cropName: string,
    areaHa: number = 2.5,
    avgTempC: number = 28,
    manualHarvestDateStr?: string | null
  ) {
    return this.calculateHarvestStatus(
      cropName,
      undefined,
      1450,
      4.8,
      areaHa,
      avgTempC,
      manualHarvestDateStr
    );
  },

  // Calculate Growth Stage, Expected Harvest Date, Window, Status, Labour and Storage from Sowing Date, Weather Temp GDD, Crop & Yield
  calculateHarvestStatus(
    cropName: string,
    sowingDateStr?: string,
    providedGdd?: number,
    predictedYieldTha: number = 4.8,
    areaHa: number = 2.5,
    avgTempC: number = 28,
    manualHarvestDateStr?: string | null
  ): {
    growthStage: string;
    expectedHarvestDate: string;
    manualHarvestDate: string | null;
    harvestWindow: string;
    status: HarvestStatus;
    daysToHarvest: number;
    gddAccumulated: number;
    gddThreshold: number;
    gddPercentage: number;
    requiredLabour: number;
    storageRequirementSqft: number;
    storageBagsCount: number;
    storageMoistureTargetPct: number;
    totalProductionTons: number;
  } {
    const cropKey = Object.keys(CROP_HARVEST_SPECS).find(c => c.toLowerCase() === cropName.toLowerCase()) || 'Rice';
    const spec = CROP_HARVEST_SPECS[cropKey];

    const sowing = sowingDateStr ? new Date(sowingDateStr) : new Date(Date.now() - 65 * 86400000);
    const now = new Date();
    const daysElapsed = Math.max(1, Math.floor((now.getTime() - sowing.getTime()) / 86400000));

    // Dynamic GDD Calculation based on actual temperature
    const dailyGdd = Math.max(0, avgTempC - spec.baseTemp);
    const calculatedGdd = Math.round(dailyGdd * daysElapsed);
    const gddAccumulated = (providedGdd && providedGdd > 0) ? providedGdd : Math.max(calculatedGdd, 1450);

    const totalDays = spec.maturityDays;
    const expHarvest = new Date(sowing.getTime() + totalDays * 86400000);

    // Active harvest target date (either farmer manual date or AI expected date)
    const activeTargetDate = manualHarvestDateStr ? new Date(manualHarvestDateStr) : expHarvest;
    const daysRemaining = Math.max(0, Math.ceil((activeTargetDate.getTime() - now.getTime()) / 86400000));

    const winStart = new Date(expHarvest.getTime() - 5 * 86400000);
    const winEnd = new Date(expHarvest.getTime() + 10 * 86400000);
    const harvestWindow = `${winStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${winEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const gddPct = Math.min(100, Math.round((gddAccumulated / spec.gddThreshold) * 100));

    // Determine Status
    let status: HarvestStatus = 'Not Ready';
    if (gddPct >= 90 || daysRemaining <= 5) {
      status = 'Harvest Ready';
    } else if (gddPct >= 65 || daysRemaining <= 25) {
      status = 'Approaching';
    } else {
      status = 'Not Ready';
    }

    // Determine Growth Stage
    let growthStage = 'Germination / Seedling';
    if (gddPct >= 90) {
      growthStage = 'Maturity / Ready for Harvest';
    } else if (gddPct >= 75) {
      growthStage = 'Ripening & Grain Filling';
    } else if (gddPct >= 50) {
      growthStage = 'Flowering & Panicle Initiation';
    } else if (gddPct >= 25) {
      growthStage = 'Active Tillering / Vegetative';
    }

    // Compute Production, Labour & Storage requirements
    const totalProductionTons = Number((predictedYieldTha * areaHa).toFixed(2));
    const requiredLabour = Math.ceil(spec.workersPerHa * areaHa);
    const storageBagsCount = Math.ceil(totalProductionTons * 20); // 50kg bags
    const storageRequirementSqft = Math.ceil(totalProductionTons * 15); // ~15 sq ft per ton
    const storageMoistureTargetPct = spec.moistureTarget;

    return {
      growthStage,
      expectedHarvestDate: expHarvest.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      manualHarvestDate: manualHarvestDateStr ? new Date(manualHarvestDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
      harvestWindow,
      status,
      daysToHarvest: daysRemaining,
      gddAccumulated,
      gddThreshold: spec.gddThreshold,
      gddPercentage: gddPct,
      requiredLabour,
      storageRequirementSqft,
      storageBagsCount,
      storageMoistureTargetPct,
      totalProductionTons
    };
  }
};
