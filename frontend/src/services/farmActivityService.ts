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
  severity?: string;
  category: string;
  title: string;
  description: string;
  actionRequired: string;
  timestamp: string;
};

export type PhenologicalStageProgress = {
  stage: string;
  progress: number;
  label: string;
  targetGddPct: number;
};

export type LiveHarvestPlan = {
  farm_id: string;
  farm_name: string;
  crop: string;
  area_hectares: number;
  sowing_date: string;
  days_elapsed: number;
  growth_stage: string;
  expected_harvest_date: string;
  manual_harvest_date: string | null;
  harvest_window: string;
  status: HarvestStatus;
  days_to_harvest: number;
  gdd_accumulated: number;
  gdd_threshold: number;
  gdd_percentage: number;
  predicted_yield_tha: number;
  total_production_tons: number;
  yield_confidence?: string;
  required_labour: number;
  storage_requirement_sqft: number;
  storage_bags_count: number;
  storage_moisture_target_pct: number;
  machinery_recommendation: string;
  phenological_stages: PhenologicalStageProgress[];
  strategy_advice: string[];
  weather_telemetry: {
    temperature_c: number;
    rainfall_mm: number;
    humidity_pct: number;
    soil_moisture_pct?: number;
    precipitation_probability?: number;
    source?: string;
  };
  alerts: HarvestAlert[];
  updated_at: string;
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const STORAGE_ACTIVITIES_KEY = 'agrisense_farm_activities';
const STORAGE_HARVEST_KEY = 'agrisense_harvest_records';

// Helper: get auth headers if a token exists
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('agrisense_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// Baseline maturity GDD & duration guidelines per crop (FAO-56 & ICAR Standards)
export const CROP_HARVEST_SPECS: Record<string, {
  maturityDays: number;
  gddThreshold: number;
  baseTemp: number;
  baseYield: number;
  moistureTarget: number;
  workersPerHa: number;
  machineryRecommendation: string;
  stages: Array<{ name: string; gddPct: number }>;
  strategyAdvice: string[];
  checklist: string[];
}> = {
  Rice: {
    maturityDays: 120,
    gddThreshold: 1600,
    baseTemp: 10,
    baseYield: 4.2,
    moistureTarget: 13.5,
    workersPerHa: 5,
    machineryRecommendation: 'Combine Harvester (Track type), Paddy Thresher, Digital Grain Moisture Meter',
    stages: [
      { name: 'Sowing & Nursery', gddPct: 15 },
      { name: 'Active Tillering', gddPct: 35 },
      { name: 'Panicle Initiation', gddPct: 65 },
      { name: 'Grain Filling / Milk', gddPct: 85 },
      { name: 'Physiological Maturity', gddPct: 100 }
    ],
    strategyAdvice: [
      'Stop field submergence and drain standing water 10-14 days before scheduled combine cutting.',
      'Harvest when 80-85% of grains in the panicle turn golden yellow (straw colour).',
      'Target grain moisture at harvest is 20-22%; dry promptly to 13.5% for safe storage.',
      'Calibrate grain moisture meters before bagging in HDPE/gunny sacks to prevent fungal mold.'
    ],
    checklist: [
      'Book combine harvester (track type) or threshing machinery',
      'Calibrate digital grain moisture meter for paddy',
      'Drain standing water from field 10-14 days prior to harvest',
      'Sanitize & dry warehouse storage floor',
      'Procure 50kg HDPE/gunny bags and stitching twine',
      'Arrange local mandi transport vehicle'
    ]
  },
  Wheat: {
    maturityDays: 110,
    gddThreshold: 1400,
    baseTemp: 5,
    baseYield: 3.8,
    moistureTarget: 12.0,
    workersPerHa: 4,
    machineryRecommendation: 'Combine Harvester (Wheel type), Straw Reaper, Seed Cleaner & Grader',
    stages: [
      { name: 'Crown Root Initiation (CRI)', gddPct: 18 },
      { name: 'Tillering & Jointing', gddPct: 40 },
      { name: 'Booting & Heading', gddPct: 65 },
      { name: 'Dough & Grain Filling', gddPct: 85 },
      { name: 'Golden Maturity', gddPct: 100 }
    ],
    strategyAdvice: [
      'Stop irrigation at hard dough stage (~10 days before harvest).',
      'Harvest when spikes turn yellowish brown and grain snaps firmly under thumbnail pressure.',
      'Maintain storage moisture below 12% to prevent khapra beetle and fungal spoilage.',
      'Operate straw reaper immediately after combine harvesting for livestock fodder collection.'
    ],
    checklist: [
      'Book wheel-type combine harvester and straw reaper',
      'Inspect grain hardness and calibrate moisture tester',
      'Fumigate grain storage bins / godown with aluminium phosphide if recommended',
      'Procure 50kg bags and tarpaulin covers for threshing yard',
      'Coordinate tractor trolley logistics for mandi transport'
    ]
  },
  Maize: {
    maturityDays: 100,
    gddThreshold: 1500,
    baseTemp: 10,
    baseYield: 5.5,
    moistureTarget: 14.0,
    workersPerHa: 4,
    machineryRecommendation: 'Corn Combine Harvester, Tractor Mounted Maize Sheller, Moisture Tester',
    stages: [
      { name: 'Seedling Emergence', gddPct: 15 },
      { name: 'Knee-High Vegetative (V6)', gddPct: 38 },
      { name: 'Tasseling & Silking (R1)', gddPct: 62 },
      { name: 'Milk & Dough (R3-R4)', gddPct: 82 },
      { name: 'Black Layer Maturity (R6)', gddPct: 100 }
    ],
    strategyAdvice: [
      'Inspect cob base for physiological black layer formation indicating maximum dry matter.',
      'Harvest when husks turn papery dry and kernels dent firmly.',
      'Dry shelled grain to 14% moisture before bulk bagging in clean, fumigated godowns.'
    ],
    checklist: [
      'Inspect cobs for black layer maturity at kernel tip',
      'Book tractor-mounted maize sheller or corn combine',
      'Prepare concrete drying floor or mechanical grain dryer',
      'Inspect warehouse moisture and procure heavy-duty bags',
      'Schedule mandi transport before local price dips'
    ]
  },
  Cotton: {
    maturityDays: 160,
    gddThreshold: 2200,
    baseTemp: 15,
    baseYield: 2.4,
    moistureTarget: 10.0,
    workersPerHa: 7,
    machineryRecommendation: 'Mechanical Cotton Stripper, Pneumatic Baling Press, Digital Moisture Meter',
    stages: [
      { name: 'Seedling Emergence', gddPct: 15 },
      { name: 'Square Formation', gddPct: 35 },
      { name: 'Flowering & Boll Setting', gddPct: 60 },
      { name: 'Boll Maturation', gddPct: 85 },
      { name: 'Boll Bursting & Picking', gddPct: 100 }
    ],
    strategyAdvice: [
      'Initiate picking only when bolls are fully opened and morning dew has dried completely.',
      'Pick clean white lint separately from stained or damaged cotton bolls.',
      'Store seed cotton in dry, moisture-free sheds below 10% moisture prior to ginning.'
    ],
    checklist: [
      'Mobilize harvest labor team with clean picking aprons',
      'Ensure field is completely dry of morning dew before picking starts',
      'Inspect lint for trash/leaf debris separation',
      'Arrange dry, covered shed storage away from moisture',
      'Book transport to nearest Cotton Corporation of India (CCI) procurement center'
    ]
  },
  Sugarcane: {
    maturityDays: 330,
    gddThreshold: 4500,
    baseTemp: 12,
    baseYield: 72.0,
    moistureTarget: 70.0,
    workersPerHa: 10,
    machineryRecommendation: 'Sugarcane Harvester, Billet Chopper, Cane Loading Tractor Trolley',
    stages: [
      { name: 'Germination & Sprouting', gddPct: 12 },
      { name: 'Formative Tillering', gddPct: 30 },
      { name: 'Grand Growth Phase', gddPct: 70 },
      { name: 'Sucrose Accumulation', gddPct: 90 },
      { name: 'Maturity & Harvest', gddPct: 100 }
    ],
    strategyAdvice: [
      'Verify hand refractometer brix reading (18-20% brix) before issuing harvest cutting order.',
      'Cut cane flush with the ground to maximize sucrose recovery in bottom internodes.',
      'Supply harvested cane to sugar mill within 24-48 hours to minimize sucrose inversion.'
    ],
    checklist: [
      'Perform brix test with hand refractometer across field samples',
      'Procure sugar mill cutting indents / procurement slip',
      'Book cane cutting crew and tractor trolleys',
      'Ensure cutting flush with ground level for maximum sugar yield',
      'Schedule immediate transit to sugar mill within 24 hours'
    ]
  },
  Potato: {
    maturityDays: 85,
    gddThreshold: 1250,
    baseTemp: 7,
    baseYield: 22.0,
    moistureTarget: 78.0,
    workersPerHa: 6,
    machineryRecommendation: 'Tractor-drawn Potato Digger, Mechanical Grader, Sorting Conveyor Racks',
    stages: [
      { name: 'Sprout Development', gddPct: 15 },
      { name: 'Vegetative Canopy', gddPct: 35 },
      { name: 'Tuber Initiation', gddPct: 55 },
      { name: 'Tuber Bulking', gddPct: 85 },
      { name: 'Haulm Cutting & Skin Hardening', gddPct: 100 }
    ],
    strategyAdvice: [
      'Perform haulm dehaulming (vine cutting) 10-12 days before digging to cure tuber skin.',
      'Stop irrigation 8-10 days prior to digging to prevent tuber rot during storage.',
      'Allow dug potatoes to cure in field shade for 10-15 days before cold storage placement.'
    ],
    checklist: [
      'Execute haulm cutting 10-12 days before digging for skin hardening',
      'Stop irrigation 8-10 days before harvest',
      'Book tractor potato digger and grading team',
      'Prepare ventilated curing floor in shaded shed',
      'Arrange mesh net bags and cold storage advance booking'
    ]
  },
  Tomato: {
    maturityDays: 85,
    gddThreshold: 1350,
    baseTemp: 10,
    baseYield: 28.0,
    moistureTarget: 85.0,
    workersPerHa: 8,
    machineryRecommendation: 'Plastic Harvest Crates, Field Sorting & Washing Tables, Hand Rigs',
    stages: [
      { name: 'Transplant Establishment', gddPct: 18 },
      { name: 'Vegetative Branching', gddPct: 38 },
      { name: 'Flowering & Fruit Set', gddPct: 62 },
      { name: 'Mature Green Stage', gddPct: 82 },
      { name: 'Breaker / Red Ripe Picking', gddPct: 100 }
    ],
    strategyAdvice: [
      'Pick fruit at "breaker" stage (10-30% pink) for distant transit, red-ripe for local mandi.',
      'Harvest during early morning hours to keep fruit pulp cool and extend shelf life.',
      'Stack harvest in well-ventilated plastic crates (max 20-25 kg per crate) without over-packing.'
    ],
    checklist: [
      'Sanitize plastic harvest crates with mild potassium permanganate solution',
      'Instruct harvesting crew on breaker stage vs red ripe grading',
      'Schedule early morning picking before ambient heat rises',
      'Sort fruit by grade (Grade A / B) on shaded grading tables',
      'Arrange swift ventilated transport to local vegetable mandi'
    ]
  },
  Mustard: {
    maturityDays: 105,
    gddThreshold: 1200,
    baseTemp: 5,
    baseYield: 1.6,
    moistureTarget: 9.0,
    workersPerHa: 4,
    machineryRecommendation: 'Mustard Thresher, Combine Harvester with Rapeseed Attachment',
    stages: [
      { name: 'Seedling Emergence', gddPct: 15 },
      { name: 'Rosette & Branching', gddPct: 35 },
      { name: 'Yellow Flowering', gddPct: 60 },
      { name: 'Siliqua Pod Filling', gddPct: 85 },
      { name: 'Pod Maturity', gddPct: 100 }
    ],
    strategyAdvice: [
      'Harvest when 75% of siliquae turn golden yellow to avoid shattering loss.',
      'Reap crop during early morning hours when pods are pliable with humidity.',
      'Sun-dry threshed mustard seeds until moisture drops below 9% for oil extraction.'
    ],
    checklist: [
      'Monitor siliqua pod color turning golden yellow',
      'Reap in early morning hours to minimize pod shattering',
      'Book mustard thresher with appropriate concave clearance',
      'Sun-dry seeds on clean tarpaulin to under 9% moisture',
      'Pack in moisture-resistant bags for oil mill delivery'
    ]
  },
  Soybean: {
    maturityDays: 95,
    gddThreshold: 1350,
    baseTemp: 10,
    baseYield: 2.2,
    moistureTarget: 12.0,
    workersPerHa: 4,
    machineryRecommendation: 'Multi-Crop Combine Harvester, Seed Cleaner & Sieve, Moisture Tester',
    stages: [
      { name: 'Emergence & V-Stages', gddPct: 15 },
      { name: 'Branching & Canopy', gddPct: 35 },
      { name: 'Flowering & Pod Set (R1-R3)', gddPct: 62 },
      { name: 'Pod Filling (R5)', gddPct: 82 },
      { name: 'Leaf Drop & Harvest Ready (R8)', gddPct: 100 }
    ],
    strategyAdvice: [
      'Harvest when 95% of leaves have dropped and pods have turned brown.',
      'Operate combine cylinder speed at 400-500 RPM to prevent seed coat cracking.',
      'Store seed at 10-12% moisture to preserve seed viability and germination.'
    ],
    checklist: [
      'Inspect field: 95% leaf drop and brown pod rattling',
      'Calibrate combine harvester cylinder speed (400-500 RPM)',
      'Check seed moisture with digital tester (target 12-14%)',
      'Prepare dry wooden pallet floor in storage room',
      'Arrange mandi transport vehicle'
    ]
  },
  Groundnut: {
    maturityDays: 115,
    gddThreshold: 1500,
    baseTemp: 10,
    baseYield: 2.1,
    moistureTarget: 9.0,
    workersPerHa: 5,
    machineryRecommendation: 'Tractor Groundnut Digger-Shaker, Groundnut Thresher/Pod Stripper',
    stages: [
      { name: 'Emergence', gddPct: 15 },
      { name: 'Vegetative & Flowering', gddPct: 35 },
      { name: 'Peg Penetration into Soil', gddPct: 60 },
      { name: 'Pod Development', gddPct: 85 },
      { name: 'Pod Maturity', gddPct: 100 }
    ],
    strategyAdvice: [
      'Examine inside shell: 70-75% of pods should show prominent brown/black inner lining.',
      'Irrigate lightly 2 days before digging if soil is hard to avoid pod separation in soil.',
      'Dry harvested pods in inverted windrows for 3-5 days to reduce moisture below 9%.'
    ],
    checklist: [
      'Check internal pod shell darkening (70%+ dark veins)',
      'Provide light irrigation 2 days prior if soil is hard packed',
      'Deploy groundnut digger-shaker for inverted windrowing',
      'Dry pods in field windrows for 3-5 days',
      'Strip pods using mechanical thresher and bag below 9% moisture'
    ]
  },
  Gram: {
    maturityDays: 105,
    gddThreshold: 1250,
    baseTemp: 8,
    baseYield: 1.5,
    moistureTarget: 10.5,
    workersPerHa: 3,
    machineryRecommendation: 'Tractor-drawn Gram Harvester, Multi-crop Pulse Thresher',
    stages: [
      { name: 'Emergence', gddPct: 15 },
      { name: 'Vegetative Branching', gddPct: 35 },
      { name: 'Flowering', gddPct: 60 },
      { name: 'Pod Filling', gddPct: 85 },
      { name: 'Maturity', gddPct: 100 }
    ],
    strategyAdvice: [
      'Harvest when leaves turn reddish-brown/yellow and seeds rattle inside pods.',
      'Reap in morning hours to prevent shattering losses in field.',
      'Dry threshed grain to 10% moisture before packing in clean jute bags.'
    ],
    checklist: [
      'Check pod rattle and foliage yellowing across plots',
      'Reap during morning hours to avoid pod shatter',
      'Thresh using multi-crop pulse thresher',
      'Sun-dry grain on tarpaulins to 10% moisture',
      'Store with dried neem leaves in clean gunny bags'
    ]
  },
  Onion: {
    maturityDays: 120,
    gddThreshold: 1300,
    baseTemp: 6,
    baseYield: 18.0,
    moistureTarget: 12.0,
    workersPerHa: 6,
    machineryRecommendation: 'Tractor Mounted Onion Digger, Curing Racks, De-topper',
    stages: [
      { name: 'Transplant Establishment', gddPct: 20 },
      { name: 'Vegetative Foliage', gddPct: 45 },
      { name: 'Bulb Initiation', gddPct: 70 },
      { name: 'Bulb Swelling', gddPct: 88 },
      { name: 'Neck Fall (50-70%) & Harvest', gddPct: 100 }
    ],
    strategyAdvice: [
      'Withhold irrigation 10-15 days prior to harvest to enhance bulb storage life.',
      'Harvest when 50-70% of plant tops fall over naturally (neck fall).',
      'Cure harvested bulbs in field windrows or shaded racks for 5-7 days before clipping tops.'
    ],
    checklist: [
      'Withhold irrigation 10-15 days before lifting bulbs',
      'Verify 50-70% neck fall across the field',
      'Uproot bulbs carefully without mechanical bruising',
      'Field cure in shaded windrows for 5-7 days',
      'Clip tops leaving 2.5cm neck and store in aerated slatted wooden crates'
    ]
  },
  Pulses: {
    maturityDays: 90,
    gddThreshold: 1200,
    baseTemp: 10,
    baseYield: 1.8,
    moistureTarget: 11.0,
    workersPerHa: 3,
    machineryRecommendation: 'Multi-crop Thresher, Pulse Pod Stripper, Grading Sieve',
    stages: [
      { name: 'Emergence', gddPct: 15 },
      { name: 'Vegetative Branching', gddPct: 35 },
      { name: 'Flowering', gddPct: 60 },
      { name: 'Pod Development', gddPct: 85 },
      { name: 'Physiological Maturity', gddPct: 100 }
    ],
    strategyAdvice: [
      'Harvest when 80-85% of pods turn dark brown or blackish depending on variety.',
      'Avoid delayed harvesting to prevent pod shattering.',
      'Sun-dry grain to 10-11% moisture before storing with neem leaf bio-protectant.'
    ],
    checklist: [
      'Inspect pods for 80-85% brown/black coloration',
      'Harvest early morning to prevent pod dehiscence',
      'Thresh using pulse threshing equipment',
      'Sun-dry grain to 10-11% moisture',
      'Bag in airtight containers or clean jute sacks'
    ]
  }
};

export const farmActivityService = {
  // GET all farm activities
  async getActivities(farmId?: string, crop?: string): Promise<FarmActivity[]> {
    try {
      const response = await axios.get(`${API_BASE}/farm-activities`, {
        params: { farm_id: farmId, crop },
        headers: getAuthHeaders(),
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

    return [];
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
      const response = await axios.post(`${API_BASE}/farm-activities`, newAct, {
        headers: getAuthHeaders(),
        timeout: 5000
      });
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
      const response = await axios.put(`${API_BASE}/farm-activities/${activityId}`, payload, {
        headers: getAuthHeaders(),
        timeout: 5000
      });
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
      await axios.delete(`${API_BASE}/farm-activities/${activityId}`, {
        headers: getAuthHeaders(),
        timeout: 5000
      });
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

  // GET Live Harvest Plan from Backend Live Engine (or local dynamic fallback)
  async getLiveHarvestPlan(params: {
    farm_id?: string;
    farm_name?: string;
    crop?: string;
    area_hectares?: number;
    latitude?: number;
    longitude?: number;
    state?: string;
    district?: string;
    sowing_date?: string;
    manual_harvest_date?: string;
  }): Promise<LiveHarvestPlan> {
    try {
      const response = await axios.post(`${API_BASE}/harvest-management/live-plan`, params, {
        headers: getAuthHeaders(),
        timeout: 9000
      });
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      }
    } catch (error) {
      console.warn('Live harvest plan endpoint failed, calculating dynamic fallback:', error);
    }

    // Dynamic local fallback
    const crop = params.crop || 'Rice';
    const fallbackStatus = this.calculateHarvestStatus(
      crop,
      params.sowing_date,
      undefined,
      undefined,
      params.area_hectares || 2.5,
      28,
      params.manual_harvest_date
    );

    const spec = CROP_HARVEST_SPECS[crop] || CROP_HARVEST_SPECS.Rice;
    const stageProjection: PhenologicalStageProgress[] = spec.stages.map((stg, idx) => {
      const prevPct = idx === 0 ? 0 : spec.stages[idx - 1].gddPct;
      const stageSpan = stg.gddPct - prevPct;
      let progress = 0;

      if (fallbackStatus.gddPercentage >= stg.gddPct) {
        progress = 100;
      } else if (fallbackStatus.gddPercentage <= prevPct) {
        progress = 0;
      } else {
        progress = Math.round(((fallbackStatus.gddPercentage - prevPct) / stageSpan) * 100);
      }

      return {
        stage: stg.name,
        progress,
        label: progress >= 100 ? 'Completed' : progress > 0 ? 'Current' : 'Upcoming',
        targetGddPct: stg.gddPct
      };
    });

    return {
      farm_id: params.farm_id || 'default_farm',
      farm_name: params.farm_name || 'Farm Field',
      crop,
      area_hectares: params.area_hectares || 2.5,
      sowing_date: params.sowing_date || new Date(Date.now() - 65 * 86400000).toISOString(),
      days_elapsed: 65,
      growth_stage: fallbackStatus.growthStage,
      expected_harvest_date: fallbackStatus.expectedHarvestDate,
      manual_harvest_date: fallbackStatus.manualHarvestDate,
      harvest_window: fallbackStatus.harvestWindow,
      status: fallbackStatus.status,
      days_to_harvest: fallbackStatus.daysToHarvest,
      gdd_accumulated: fallbackStatus.gddAccumulated,
      gdd_threshold: fallbackStatus.gddThreshold,
      gdd_percentage: fallbackStatus.gddPercentage,
      predicted_yield_tha: 4.2,
      total_production_tons: fallbackStatus.totalProductionTons,
      yield_confidence: 'High',
      required_labour: fallbackStatus.requiredLabour,
      storage_requirement_sqft: fallbackStatus.storageRequirementSqft,
      storage_bags_count: fallbackStatus.storageBagsCount,
      storage_moisture_target_pct: fallbackStatus.storageMoistureTargetPct,
      machinery_recommendation: fallbackStatus.machineryRecommendation,
      phenological_stages: stageProjection,
      strategy_advice: spec.strategyAdvice,
      weather_telemetry: {
        temperature_c: 28,
        rainfall_mm: 5,
        humidity_pct: 70
      },
      alerts: await this.getHarvestAlerts(params.farm_id, crop, params.latitude, params.longitude),
      updated_at: new Date().toISOString()
    };
  },

  // GET Harvest records
  async getHarvestRecords(farmId?: string, crop?: string): Promise<HarvestRecord[]> {
    try {
      const response = await axios.get(`${API_BASE}/harvest-management`, {
        params: { farm_id: farmId, crop },
        headers: getAuthHeaders(),
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
      const response = await axios.post(`${API_BASE}/harvest-management`, record, {
        headers: getAuthHeaders(),
        timeout: 5000
      });
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
  async getAlerts(farmId?: string, crop?: string, lat?: number, lon?: number): Promise<HarvestAlert[]> {
    try {
      const response = await axios.get(`${API_BASE}/harvest-management/alerts`, {
        params: { farm_id: farmId, crop, latitude: lat, longitude: lon },
        timeout: 5000
      });
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        return response.data.data;
      }
    } catch (error) {}

    const cropKey = crop || 'Rice';
    const spec = CROP_HARVEST_SPECS[cropKey] || CROP_HARVEST_SPECS.Rice;

    return [
      {
        id: 'alert_maturation',
        type: 'info',
        severity: 'Normal',
        category: 'Maturation Tracking',
        title: `🌾 ${cropKey} Thermal Tracking Active`,
        description: `Target maturation threshold is ${spec.gddThreshold} GDD. Crop phenology is being calculated from local agroclimatic conditions.`,
        actionRequired: 'Inspect weekly crop progression and verify safe moisture threshold.',
        timestamp: new Date().toISOString()
      },
      {
        id: 'alert_storage',
        type: 'success',
        severity: 'Guideline',
        category: 'Post-Harvest Logistics',
        title: `📦 Safe Storage Moisture: ${spec.moistureTarget}%`,
        description: `ICAR storage standards dictate maximum ${spec.moistureTarget}% moisture to prevent post-harvest mold and aflatoxin formation.`,
        actionRequired: 'Calibrate moisture meters and inspect warehouse roof waterproofing.',
        timestamp: new Date().toISOString()
      }
    ];
  },

  async getHarvestAlerts(farmId?: string, crop?: string, lat?: number, lon?: number): Promise<HarvestAlert[]> {
    return this.getAlerts(farmId, crop, lat, lon);
  },

  calculateHarvestReadiness(
    cropName: string,
    areaHa: number = 2.5,
    avgTempC: number = 28,
    manualHarvestDateStr?: string | null,
    sowingDateStr?: string,
    providedGdd?: number,
    predictedYieldTha?: number
  ) {
    return this.calculateHarvestStatus(
      cropName,
      sowingDateStr,
      providedGdd,
      predictedYieldTha,
      areaHa,
      avgTempC,
      manualHarvestDateStr
    );
  },

  // Calculate Growth Stage, Expected Harvest Date, Window, Status, Labour and Storage dynamically
  calculateHarvestStatus(
    cropName: string,
    sowingDateStr?: string,
    providedGdd?: number,
    predictedYieldTha?: number,
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
    machineryRecommendation: string;
  } {
    const cropKey = Object.keys(CROP_HARVEST_SPECS).find(c => c.toLowerCase() === cropName.toLowerCase()) || 'Rice';
    const spec = CROP_HARVEST_SPECS[cropKey];

    const now = new Date();
    const sowing = sowingDateStr ? new Date(sowingDateStr) : new Date(Date.now() - 65 * 86400000);

    const daysElapsed = Math.max(1, Math.floor((now.getTime() - sowing.getTime()) / 86400000));

    // Dynamic GDD calculation
    const dailyGdd = Math.max(1, avgTempC - spec.baseTemp);
    const calculatedGdd = Math.round(dailyGdd * daysElapsed);
    const gddAccumulated = (providedGdd !== undefined && providedGdd > 0) ? providedGdd : calculatedGdd;
    const gddPct = Math.min(100, Math.round((gddAccumulated / spec.gddThreshold) * 100));

    // Thermal GDD-based remaining days
    const remainingGdd = Math.max(0, spec.gddThreshold - gddAccumulated);
    const thermalDaysRemaining = gddPct >= 100 ? 0 : Math.max(1, Math.ceil(remainingGdd / dailyGdd));

    const activeDaysRemaining = manualHarvestDateStr
      ? Math.max(0, Math.ceil((new Date(manualHarvestDateStr).getTime() - now.getTime()) / 86400000))
      : thermalDaysRemaining;

    const expHarvest = gddPct >= 100 ? now : new Date(now.getTime() + thermalDaysRemaining * 86400000);
    const winStart = new Date(expHarvest.getTime() - (gddPct >= 100 ? 2 : 5) * 86400000);
    const winEnd = new Date(expHarvest.getTime() + (gddPct >= 100 ? 5 : 10) * 86400000);
    const harvestWindow = gddPct >= 100
      ? `Ready Now (Optimal through ${winEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
      : `${winStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${winEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Determine Status
    let status: HarvestStatus = 'Not Ready';
    if (gddPct >= 95 || activeDaysRemaining <= 3) {
      status = 'Harvest Ready';
    } else if (gddPct >= 70 || activeDaysRemaining <= 20) {
      status = 'Approaching';
    } else {
      status = 'Not Ready';
    }

    // Determine Phenological Growth Stage from Crop Spec
    let growthStage = spec.stages[0].name;
    for (let i = 0; i < spec.stages.length; i++) {
      if (gddPct >= spec.stages[i].gddPct - 15) {
        growthStage = spec.stages[i].name;
      }
    }

    // Yield and production calculation
    const effectiveYield = (predictedYieldTha && predictedYieldTha > 0) ? predictedYieldTha : spec.baseYield;
    const totalProductionTons = Number((effectiveYield * areaHa).toFixed(2));
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
      totalProductionTons,
      machineryRecommendation: spec.machineryRecommendation
    };
  }
};
