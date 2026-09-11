import axios from 'axios';

export type SoilData = {
  ph: number;
  moisture: number; // %
  temperature: number; // °C
  nitrogen: number; // kg/ha
  phosphorus: number; // kg/ha
  potassium: number; // kg/ha
  organic_matter: number; // %
  salinity: number; // dS/m
  type: string;
  drainage: string;
  source?: 'geospatial_sensor' | 'farmer_lab_test';
  lastTestedAt?: string;
};

export type NutrientStatus = {
  nitrogenStatus: 'Low' | 'Optimal' | 'High';
  phosphorusStatus: 'Low' | 'Optimal' | 'High';
  potassiumStatus: 'Low' | 'Optimal' | 'High';
  phStatus: 'Acidic' | 'Optimal' | 'Alkaline';
  moistureStatus: 'Deficient' | 'Optimal' | 'Waterlogged';
  organicCarbonStatus: 'Low' | 'Medium' | 'High';
};

export type AgronomicRecommendations = {
  fertilizerPlan: string;
  phCorrection: string;
  irrigationStrategy: string;
  soilConditioning: string;
};

export type MLModuleImpacts = {
  yieldImpactPercentage: number; // e.g. +12% or -15%
  yieldImpactDescription: string;
  diseaseRiskTrigger: {
    riskLevel: 'Low' | 'Moderate' | 'High Fungal / Root-Rot Risk';
    description: string;
  };
};

export type ComprehensiveSoilAnalysis = {
  farmId: string;
  crop: string;
  soilData: SoilData;
  healthScore: number; // 0 - 100
  suitabilityRating: string;
  suitabilityStatus: 'success' | 'warning' | 'danger' | 'info';
  nutrientStatus: NutrientStatus;
  recommendations: AgronomicRecommendations;
  mlImpacts: MLModuleImpacts;
};

const STORAGE_PREFIX = 'agrisense_soil_test_';

export const soilService = {
  // Get soil analysis combining live geospatial APIs and farmer lab test overrides
  async getSoilAnalysis(
    lat: number,
    lon: number,
    farmId: string = 'default_farm',
    crop: string = 'Rice'
  ): Promise<ComprehensiveSoilAnalysis> {
    // 1. Check if farmer has saved custom lab test values for this farm
    const cachedTest = localStorage.getItem(`${STORAGE_PREFIX}${farmId}`);
    let soilData: SoilData;

    if (cachedTest) {
      try {
        const parsed = JSON.parse(cachedTest);
        soilData = { ...parsed, source: 'farmer_lab_test' };
      } catch (e) {
        soilData = await this.fetchGeospatialSoilData(lat, lon);
      }
    } else {
      soilData = await this.fetchGeospatialSoilData(lat, lon);
    }

    return this.calculateAnalysis(farmId, crop, soilData);
  },

  // Fetch real-time geospatial soil moisture & temperature from Open-Meteo WGS84 API
  async fetchGeospatialSoilData(lat: number, lon: number): Promise<SoilData> {
    let moisture = 32;
    let temp = 24;

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=soil_temperature_0cm,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm&timezone=auto`;
      const res = await axios.get(url, { timeout: 5000 });
      if (res.data && res.data.hourly) {
        const h = res.data.hourly;
        if (h.soil_temperature_0cm && h.soil_temperature_0cm.length > 0) {
          temp = Math.round(h.soil_temperature_0cm[0]);
        }
        if (h.soil_moisture_0_to_1cm && h.soil_moisture_0_to_1cm.length > 0) {
          // Convert m³/m³ ratio to percentage (e.g. 0.35 -> 35%)
          const rawM = h.soil_moisture_0_to_1cm[0];
          moisture = Math.round(rawM * 100);
          if (moisture < 5) moisture = Math.round(rawM); // if already %
        }
      }
    } catch (e) {
      console.warn('Geospatial soil API error, using district soil health card profile:', e);
    }

    // Fetch genuine Indian Soil Health Card District Profile from backend API
    let districtProfile: any = null;
    try {
      const profileRes = await axios.get(`/api/soil/district-profile?lat=${lat}&lon=${lon}`, { timeout: 3000 });
      if (profileRes.data?.success && profileRes.data.profile) {
        districtProfile = profileRes.data.profile;
      }
    } catch (err) {
      // Offline fallback
    }

    return {
      ph: districtProfile ? districtProfile.soil_ph : 7.2,
      moisture: Math.min(60, Math.max(15, moisture || (districtProfile ? districtProfile.soil_moisture_pct : 34))),
      temperature: temp || 24,
      nitrogen: districtProfile ? districtProfile.soil_n : 190,
      phosphorus: districtProfile ? districtProfile.soil_p : 25,
      potassium: districtProfile ? districtProfile.soil_k : 215,
      organic_matter: districtProfile ? districtProfile.organic_matter_pct : 0.65,
      salinity: 0.4,
      type: districtProfile ? districtProfile.soil_type : 'Alluvial Clay Loam',
      drainage: 'Well-drained',
      source: districtProfile ? districtProfile.source : 'Soil Health Card Regional Benchmark',
      lastTestedAt: new Date().toISOString()
    };
  },

  // Save manual farmer soil lab test update
  saveManualSoilTest(farmId: string, customSoil: Partial<SoilData>): SoilData {
    const existing = localStorage.getItem(`${STORAGE_PREFIX}${farmId}`);
    let base: SoilData = {
      ph: 6.5,
      moisture: 35,
      temperature: 25,
      nitrogen: 70,
      phosphorus: 50,
      potassium: 80,
      organic_matter: 2.0,
      salinity: 0.5,
      type: 'Clay Loam',
      drainage: 'Well-drained'
    };

    if (existing) {
      try {
        base = JSON.parse(existing);
      } catch (e) {}
    }

    const updated: SoilData = {
      ...base,
      ...customSoil,
      source: 'farmer_lab_test',
      lastTestedAt: new Date().toISOString()
    };

    localStorage.setItem(`${STORAGE_PREFIX}${farmId}`, JSON.stringify(updated));
    return updated;
  },

  // Reset to default geospatial API estimates
  resetSoilTest(farmId: string) {
    localStorage.removeItem(`${STORAGE_PREFIX}${farmId}`);
  },

  // Calculate Soil Health Score (0-100), Suitability, Nutrient Statuses, and ML Impacts
  calculateAnalysis(
    farmId: string,
    crop: string = 'Crop',
    soil: SoilData
  ): ComprehensiveSoilAnalysis {
    const targetCrop = crop || 'Crop';
    const { ph, moisture, nitrogen: N, phosphorus: P, potassium: K, organic_matter: OC } = soil;

    // 1. Nutrient Status Classifications
    const nitrogenStatus: 'Low' | 'Optimal' | 'High' = N < 50 ? 'Low' : N <= 90 ? 'Optimal' : 'High';
    const phosphorusStatus: 'Low' | 'Optimal' | 'High' = P < 30 ? 'Low' : P <= 70 ? 'Optimal' : 'High';
    const potassiumStatus: 'Low' | 'Optimal' | 'High' = K < 50 ? 'Low' : K <= 110 ? 'Optimal' : 'High';
    const phStatus: 'Acidic' | 'Optimal' | 'Alkaline' = ph < 6.0 ? 'Acidic' : ph <= 7.5 ? 'Optimal' : 'Alkaline';
    const moistureStatus: 'Deficient' | 'Optimal' | 'Waterlogged' = moisture < 25 ? 'Deficient' : moisture <= 45 ? 'Optimal' : 'Waterlogged';
    const organicCarbonStatus: 'Low' | 'Medium' | 'High' = OC < 0.5 ? 'Low' : OC <= 1.2 ? 'Medium' : 'High';

    // 2. Soil Health Score Calculation (0 - 100)
    let score = 100;

    // pH deductions
    if (ph < 5.5 || ph > 8.2) score -= 25;
    else if (ph < 6.0 || ph > 7.5) score -= 12;

    // NPK deductions
    if (nitrogenStatus === 'Low') score -= 15;
    if (phosphorusStatus === 'Low') score -= 12;
    if (potassiumStatus === 'Low') score -= 10;

    // Organic carbon deductions
    if (organicCarbonStatus === 'Low') score -= 15;

    // Moisture deductions
    if (moistureStatus === 'Deficient' || moistureStatus === 'Waterlogged') score -= 15;

    const healthScore = Math.max(20, Math.min(100, score));

    // 3. Crop Soil Suitability Rating
    let suitabilityRating = `Highly Suitable for ${targetCrop} Cultivation`;
    let suitabilityStatus: 'success' | 'warning' | 'danger' | 'info' = 'success';

    if (healthScore < 50) {
      suitabilityRating = `Suboptimal Soil Conditions for ${targetCrop} - Major Nutrient & pH Corrections Required`;
      suitabilityStatus = 'danger';
    } else if (healthScore < 75) {
      if (phStatus === 'Acidic') {
        suitabilityRating = `Moderate Suitability for ${targetCrop} - Acidic Soil Requires Lime Correction`;
        suitabilityStatus = 'warning';
      } else if (nitrogenStatus === 'Low') {
        suitabilityRating = `Moderate Suitability for ${targetCrop} - Nitrogen Boost Recommended`;
        suitabilityStatus = 'warning';
      } else {
        suitabilityRating = `Moderately Suitable for ${targetCrop} - Follow Balanced Fertilizer Plan`;
        suitabilityStatus = 'warning';
      }
    }

    // 4. Agronomic Recommendations
    let fertPlan = 'NPK nutrient levels are optimal. Maintain organic compost applications.';
    if (nitrogenStatus === 'Low' && phosphorusStatus === 'Low') {
      fertPlan = 'Apply 35 kg/ha Urea + 25 kg/ha DAP (Di-Ammonium Phosphate) during basal preparation.';
    } else if (nitrogenStatus === 'Low') {
      fertPlan = 'Apply 30 kg/ha Urea split into 2 top-dressing applications during vegetative growth.';
    } else if (phosphorusStatus === 'Low') {
      fertPlan = 'Apply 25 kg/ha Single Super Phosphate (SSP) to enhance root establishment.';
    } else if (potassiumStatus === 'Low') {
      fertPlan = 'Apply 20 kg/ha Muriate of Potash (MOP) to boost disease resistance and grain quality.';
    }

    let phPlan = 'Soil pH is in the optimal range (6.0 - 7.5). No chemical amendment required.';
    if (ph < 6.0) {
      const limeAmt = Math.round((6.5 - ph) * 400);
      phPlan = `Acidic Soil (pH ${ph}). Apply approx. ${limeAmt} kg/ha Agricultural Lime (CaCO₃) 2 weeks before planting.`;
    } else if (ph > 7.5) {
      phPlan = `Alkaline Soil (pH ${ph}). Apply 150 kg/ha Gypsum or agricultural elemental sulfur to lower pH.`;
    }

    let irrPlan = 'Soil moisture is optimal (25 - 45%). Maintain regular irrigation schedule.';
    if (moistureStatus === 'Deficient') {
      irrPlan = 'Soil moisture is low (<25%). Schedule immediate drip or furrow irrigation.';
    } else if (moistureStatus === 'Waterlogged') {
      irrPlan = 'High soil moisture / waterlogging (>45%). Clear field drainage ditches to prevent root hypoxia.';
    }

    let soilCond = 'Apply 2-3 tonnes/ha well-decomposed Farmyard Manure (FYM) or vermicompost to enrich organic carbon.';

    // 5. ML Module Connections (Yield Prediction & Disease Risk Triggers)
    let yieldImpact = 0;
    let yieldDesc = 'Optimal soil health supporting maximum baseline yield potential.';

    if (healthScore >= 85) {
      yieldImpact = +14;
      yieldDesc = 'Excellent soil fertility & optimal NPK ratio boost predicted crop yield by +14%.';
    } else if (healthScore >= 70) {
      yieldImpact = +5;
      yieldDesc = 'Balanced soil health supports standard target crop yield.';
    } else if (healthScore >= 50) {
      yieldImpact = -10;
      yieldDesc = 'Moderate nutrient deficiencies reduce predicted crop yield by ~10%.';
    } else {
      yieldImpact = -25;
      yieldDesc = 'Severe soil nutrient / pH stress reduces predicted crop yield by ~25%.';
    }

    let diseaseRiskLevel: 'Low' | 'Moderate' | 'High Fungal / Root-Rot Risk' = 'Low';
    let diseaseRiskDesc = 'Healthy root zone aeration and balanced soil salinity minimize root disease risk.';

    if (moisture > 45 && ph < 6.0) {
      diseaseRiskLevel = 'High Fungal / Root-Rot Risk';
      diseaseRiskDesc = 'Excess moisture combined with acidic soil creates high susceptibility to Pythium, Rhizoctonia root rot, and Fusarium wilt.';
    } else if (moisture > 40 || ph < 5.8) {
      diseaseRiskLevel = 'Moderate';
      diseaseRiskDesc = 'Elevated soil moisture. Monitor lower stems and root crown for fungal dampening.';
    }

    return {
      farmId,
      crop,
      soilData: soil,
      healthScore,
      suitabilityRating,
      suitabilityStatus,
      nutrientStatus: {
        nitrogenStatus,
        phosphorusStatus,
        potassiumStatus,
        phStatus,
        moistureStatus,
        organicCarbonStatus
      },
      recommendations: {
        fertilizerPlan: fertPlan,
        phCorrection: phPlan,
        irrigationStrategy: irrPlan,
        soilConditioning: soilCond
      },
      mlImpacts: {
        yieldImpactPercentage: yieldImpact,
        yieldImpactDescription: yieldDesc,
        diseaseRiskTrigger: {
          riskLevel: diseaseRiskLevel,
          description: diseaseRiskDesc
        }
      }
    };
  }
};
