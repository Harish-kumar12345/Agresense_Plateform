const axios = require('axios');

/**
 * Real Data Service — fetches live environmental data from free public APIs
 * 
 * Sources:
 *   Weather:  Open-Meteo API (free, no key)  https://open-meteo.com
 *   Soil:     ISRIC SoilGrids API (free, no key)  https://rest.isric.org
 *   GDD:     Calculated from Open-Meteo historical archive
 */

// Crop-specific base temperatures for GDD calculation (°C)
const GDD_BASE_TEMPS = {
  rice: 10, wheat: 5, maize: 10, cotton: 15,
  sugarcane: 12, pulses: 10, paddy: 10, coconut: 18,
  cardamom: 15, pepper: 15, rubber: 18
};

/**
 * Fetch LIVE current weather from Open-Meteo
 * Returns: temperature, humidity, rainfall, soil moisture
 */
async function fetchLiveWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,soil_moisture_0_to_7cm&hourly=precipitation_probability&timezone=auto`;
    const res = await axios.get(url, { timeout: 8000 });
    const curr = res.data.current;

    // Sum up rain probability for next 24h
    const precipProbs = res.data.hourly?.precipitation_probability?.slice(0, 24) || [];
    const avgPrecipProb = precipProbs.length > 0
      ? Math.round(precipProbs.reduce((a, b) => a + b, 0) / precipProbs.length)
      : 0;

    return {
      temperature_c: Math.round(curr.temperature_2m * 10) / 10,
      humidity_pct: Math.round(curr.relative_humidity_2m),
      rainfall_mm: Math.round((curr.precipitation || curr.rain || 0) * 10) / 10,
      soil_moisture_pct: Math.round((curr.soil_moisture_0_to_7cm || 0.3) * 100), // 0-1 → 0-100%
      precipitation_probability: avgPrecipProb,
      source: 'Open-Meteo Live API',
      fetched_at: new Date().toISOString()
    };
  } catch (err) {
    console.warn('⚠️ Open-Meteo weather fetch failed:', err.message);
    return null;
  }
}

/**
 * Fetch REAL soil data from ISRIC SoilGrids REST API
 * Returns: nitrogen, pH, phosphorus, potassium estimates
 * 
 * SoilGrids provides: nitrogen (g/kg), phh2o, soc (g/kg)
 * P and K are estimated from organic carbon using pedotransfer ratios
 */
// Load Indian Soil Health Card District Benchmarks
const soilDistrictAverages = require('../data/soilDistrictAverages.json');

function getDistrictSoilFallback(lat, lon, state, district) {
  if (state && district && soilDistrictAverages[state] && soilDistrictAverages[state][district]) {
    return { ...soilDistrictAverages[state][district], source: `Soil Health Card (${district}, ${state})` };
  }
  if (state && soilDistrictAverages[state] && soilDistrictAverages[state].default) {
    return { ...soilDistrictAverages[state].default, source: `Soil Health Card Regional Benchmark (${state})` };
  }
  if (lat && lon) {
    if (lat >= 27.5 && lon <= 78.5) {
      return { ...soilDistrictAverages["Uttar Pradesh"]["Ghaziabad"], source: "Soil Health Card (Western UP / NCR)" };
    }
    if (lat < 12) {
      return { ...soilDistrictAverages["Kerala"]["default"], source: "Soil Health Card (Kerala Laterite)" };
    }
    if (lat >= 18 && lat < 22 && lon >= 72 && lon <= 76) {
      return { ...soilDistrictAverages["Maharashtra"]["default"], source: "Soil Health Card (Maharashtra Vertisol)" };
    }
  }
  return { ...soilDistrictAverages["_all_india_average"], source: "Soil Health Card National Agro-Climatic Benchmark" };
}

async function fetchSoilData(lat, lon, state, district) {
  try {
    const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lat=${lat}&lon=${lon}&property=nitrogen&property=phh2o&property=soc&depth=0-5cm&value=mean`;
    const res = await axios.get(url, { timeout: 12000 });

    const layers = res.data?.properties?.layers || [];
    let nitrogen_gkg = null, ph = null, soc_gkg = null;

    for (const layer of layers) {
      const depth0_5 = layer.depths?.find(d => d.label === '0-5cm');
      const val = depth0_5?.values?.mean;

      if (layer.name === 'nitrogen' && val != null) {
        nitrogen_gkg = val / 10;
      }
      if (layer.name === 'phh2o' && val != null) {
        ph = val / 10;
      }
      if (layer.name === 'soc' && val != null) {
        soc_gkg = val / 10;
      }
    }

    const soil_n = nitrogen_gkg != null ? Math.round(nitrogen_gkg * 1.3 * 0.15 * 10) : null;
    const soil_p = soc_gkg != null ? Math.round(soc_gkg * 0.013 * 1.3 * 0.15 * 10) : null;
    const soil_k = soc_gkg != null ? Math.round(soc_gkg * 0.008 * 1.3 * 0.15 * 10) : null;
    const soil_ph = ph != null ? Math.round(ph * 10) / 10 : null;

    const fallback = getDistrictSoilFallback(lat, lon, state, district);

    return {
      soil_n: soil_n || fallback.soil_n,
      soil_p: soil_p || fallback.soil_p,
      soil_k: soil_k || fallback.soil_k,
      soil_ph: soil_ph || fallback.soil_ph,
      soil_type: fallback.soil_type,
      nitrogen_gkg,
      soc_gkg,
      source: soil_n ? 'ISRIC SoilGrids v2.0' : fallback.source,
      fetched_at: new Date().toISOString()
    };
  } catch (err) {
    console.warn('⚠️ SoilGrids API fetch failed, utilizing District Soil Health Card Profile:', err.message);
    const fallback = getDistrictSoilFallback(lat, lon, state, district);
    return {
      ...fallback,
      fetched_at: new Date().toISOString()
    };
  }
}

/**
 * Calculate REAL Growing Degree Days (GDD) from Open-Meteo historical archive
 * 
 * GDD = Σ max(0, (Tmax + Tmin)/2 - Tbase) for each day since sowing
 */
async function calculateRealGDD(lat, lon, sowingDate, cropName) {
  try {
    const cropLower = (cropName || 'rice').toLowerCase().replace(/[^a-z]/g, '');
    const baseTemp = GDD_BASE_TEMPS[cropLower] || 10;

    const sowing = new Date(sowingDate);
    const today = new Date();
    
    // Clamp to reasonable range (max 365 days back)
    const maxDaysBack = 365;
    const daysDiff = Math.round((today - sowing) / 86400000);
    if (daysDiff <= 0) {
      return { gdd: 0, days_since_sowing: 0, base_temp: baseTemp, source: 'Not yet sown' };
    }

    const effectiveDays = Math.min(daysDiff, maxDaysBack);
    const effectiveStart = new Date(today.getTime() - effectiveDays * 86400000);

    const startStr = effectiveStart.toISOString().split('T')[0];
    const endStr = today.toISOString().split('T')[0];

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    const res = await axios.get(url, { timeout: 10000 });

    const daily = res.data?.daily;
    if (!daily || !daily.temperature_2m_max || !daily.temperature_2m_min) {
      throw new Error('No daily temperature data returned');
    }

    let totalGDD = 0;
    for (let i = 0; i < daily.temperature_2m_max.length; i++) {
      const tmax = daily.temperature_2m_max[i];
      const tmin = daily.temperature_2m_min[i];
      if (tmax == null || tmin == null) continue;
      const tavg = (tmax + tmin) / 2;
      totalGDD += Math.max(0, tavg - baseTemp);
    }

    return {
      gdd: Math.round(totalGDD),
      days_since_sowing: effectiveDays,
      base_temp: baseTemp,
      source: 'Open-Meteo Historical Archive',
      period: `${startStr} → ${endStr}`,
      fetched_at: new Date().toISOString()
    };
  } catch (err) {
    console.warn('⚠️ GDD calculation failed:', err.message);
    return null;
  }
}

/**
 * Fetch ALL real data in parallel for a given farm location
 * Returns a complete 12-feature payload ready for the yield prediction engine
 */
async function fetchAllRealData(lat, lon, crop, farmAreaHa, sowingDate, state, district) {
  console.log(`🌍 Fetching real data for [${lat}, ${lon}] crop=${crop}...`);

  const fallbackSoil = getDistrictSoilFallback(lat, lon, state, district);

  const [weather, soil, gddResult] = await Promise.all([
    fetchLiveWeather(lat, lon),
    fetchSoilData(lat, lon, state, district),
    calculateRealGDD(lat, lon, sowingDate || getDefaultSowingDate(), crop)
  ]);

  console.log('  ✅ Weather:', weather ? 'Live' : 'Fallback');
  console.log('  ✅ Soil:', soil ? soil.source : fallbackSoil.source);
  console.log('  ✅ GDD:', gddResult ? `${gddResult.gdd} (${gddResult.days_since_sowing} days)` : 'Fallback');

  // Build the 12-feature payload using real data with genuine Soil Health Card district fallbacks
  const payload = {
    crop: crop || 'Rice',
    farm_area_ha: farmAreaHa || 1.5,
    temperature_c: weather?.temperature_c ?? 28,
    rainfall_mm: weather?.rainfall_mm ?? 5,
    humidity_pct: weather?.humidity_pct ?? 70,
    soil_moisture_pct: weather?.soil_moisture_pct ?? fallbackSoil.soil_moisture_pct,
    soil_ph: soil?.soil_ph ?? fallbackSoil.soil_ph,
    soil_n: soil?.soil_n ?? fallbackSoil.soil_n,
    soil_p: soil?.soil_p ?? fallbackSoil.soil_p,
    soil_k: soil?.soil_k ?? fallbackSoil.soil_k,
    gdd: gddResult?.gdd ?? 1200,
    historical_yield_tha: 0
  };

  const dataSources = {
    weather: weather ? weather.source : 'Fallback defaults',
    soil: soil ? soil.source : fallbackSoil.source,
    gdd: gddResult ? gddResult.source : 'Fallback defaults',
    raw: { weather, soil, gdd: gddResult }
  };

  return { payload, dataSources };
}

/**
 * Default sowing date estimate based on Indian Kharif season
 */
function getDefaultSowingDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  
  // Kharif: June-July sowing → Oct-Nov harvest
  // Rabi: Oct-Nov sowing → Mar-Apr harvest
  if (month >= 5 && month <= 10) {
    // Currently in Kharif season, assume sowed in June
    return `${year}-06-15`;
  } else {
    // Currently in Rabi season, assume sowed in November
    const sowYear = month <= 3 ? year - 1 : year;
    return `${sowYear}-11-01`;
  }
}

module.exports = {
  fetchLiveWeather,
  fetchSoilData,
  calculateRealGDD,
  fetchAllRealData,
  getDistrictSoilFallback
};
