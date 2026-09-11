import axios from 'axios';

export type CurrentWeather = {
  temperature_c: number;
  feels_like_c: number;
  relative_humidity: number;
  precipitation_mm: number;
  precipitation_probability: number;
  wind_speed_kmh: number;
  wind_direction: string;
  pressure_mb: number;
  visibility_km: number;
  cloud_cover: number;
  description: string;
  weather_code: number;
};

export type HourlyForecast = {
  time: string;
  temperature_c: number;
  humidity: number;
  precip_probability: number;
  wind_speed_kmh: number;
  description: string;
};

export type DailyForecast = {
  date: string;
  day_name: string;
  temp_max_c: number;
  temp_min_c: number;
  precip_probability_max: number;
  humidity: number;
  wind_speed_kmh: number;
  description: string;
};

export type MicroClimateInsights = {
  crop: string;
  statusMessage: string;
  statusType: 'success' | 'warning' | 'info' | 'danger';
  irrigationNeed: {
    level: 'High' | 'Moderate' | 'Low' | 'None';
    description: string;
  };
  heatStress: {
    level: 'Normal' | 'Moderate Caution' | 'High Risk' | 'Severe';
    description: string;
    indexValue: number;
  };
  diseaseRisk: {
    level: 'Low' | 'Moderate' | 'High Fungal Risk';
    description: string;
  };
  fieldOperations: {
    level: 'Favorable' | 'Caution' | 'Unfavorable';
    description: string;
  };
};

export type ComprehensiveWeatherData = {
  location: {
    latitude: number;
    longitude: number;
    city: string;
    state?: string;
    country: string;
  };
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  microClimate: MicroClimateInsights;
  fetchedAt: string;
};

function getWindDirection(deg: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(deg / 45) % 8];
}

function getWeatherDescriptionFromCode(code: number): string {
  // WMO Weather interpretation codes (Open-Meteo)
  if (code === 0) return 'Clear sky';
  if (code === 1 || code === 2 || code === 3) return 'Partly cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Light Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Overcast';
}

export const weatherService = {
  async getLiveWeatherData(
    lat: number,
    lon: number,
    crop: string = 'Rice',
    farmName?: string
  ): Promise<ComprehensiveWeatherData> {
    let locationInfo = {
      latitude: lat,
      longitude: lon,
      city: 'Detected Farm Region',
      state: '',
      country: 'India'
    };

    // Attempt reverse geocoding
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const geoData = await geoRes.json();
      if (geoData && geoData.address) {
        const city = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.county || geoData.address.suburb || 'Farm Location';
        const state = geoData.address.state || geoData.address.state_district || '';
        const country = geoData.address.country || 'India';
        locationInfo = { latitude: lat, longitude: lon, city, state, country };
      }
    } catch (e) {
      console.warn('Reverse geocoding warning:', e);
    }

    return this.fetchOpenMeteoWeatherData(lat, lon, crop, locationInfo);
  },

  async fetchOpenMeteoWeatherData(
    lat: number,
    lon: number,
    crop: string,
    locationInfo: any
  ): Promise<ComprehensiveWeatherData> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover,weather_code&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

    const res = await axios.get(url);
    const data = res.data;

    const curr = data.current;
    const current: CurrentWeather = {
      temperature_c: Math.round(curr.temperature_2m),
      feels_like_c: Math.round(curr.apparent_temperature),
      relative_humidity: Math.round(curr.relative_humidity_2m),
      precipitation_mm: curr.precipitation || curr.rain || 0,
      precipitation_probability: Math.round(data.hourly?.precipitation_probability?.[0] || 0),
      wind_speed_kmh: Math.round(curr.wind_speed_10m),
      wind_direction: getWindDirection(curr.wind_direction_10m || 0),
      pressure_mb: Math.round(curr.surface_pressure),
      visibility_km: 10,
      cloud_cover: Math.round(curr.cloud_cover),
      description: getWeatherDescriptionFromCode(curr.weather_code),
      weather_code: curr.weather_code
    };

    // Hourly next 8 hours
    const hourly: HourlyForecast[] = [];
    if (data.hourly && data.hourly.time) {
      const now = new Date();
      for (let i = 0; i < data.hourly.time.length && hourly.length < 8; i++) {
        const hTime = new Date(data.hourly.time[i]);
        if (hTime >= now) {
          hourly.push({
            time: hTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            temperature_c: Math.round(data.hourly.temperature_2m[i]),
            humidity: Math.round(data.hourly.relative_humidity_2m[i]),
            precip_probability: Math.round(data.hourly.precipitation_probability[i] || 0),
            wind_speed_kmh: Math.round(data.hourly.wind_speed_10m[i]),
            description: getWeatherDescriptionFromCode(data.hourly.weather_code[i])
          });
        }
      }
    }

    // Daily next 7 days
    const daily: DailyForecast[] = [];
    if (data.daily && data.daily.time) {
      for (let i = 0; i < Math.min(7, data.daily.time.length); i++) {
        const dStr = data.daily.time[i];
        const dObj = new Date(dStr);
        daily.push({
          date: dStr,
          day_name: dObj.toLocaleDateString('en-US', { weekday: 'short' }),
          temp_max_c: Math.round(data.daily.temperature_2m_max[i]),
          temp_min_c: Math.round(data.daily.temperature_2m_min[i]),
          precip_probability_max: Math.round(data.daily.precipitation_probability_max[i] || 0),
          humidity: Math.round(current.relative_humidity),
          wind_speed_kmh: Math.round(data.daily.wind_speed_10m_max[i]),
          description: getWeatherDescriptionFromCode(data.daily.weather_code[i])
        });
      }
    }

    const microClimate = this.calculateMicroClimateInsights(current, daily, crop);

    return {
      location: locationInfo,
      current,
      hourly,
      daily,
      microClimate,
      fetchedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  },

  calculateMicroClimateInsights(
    current: CurrentWeather,
    daily: DailyForecast[],
    crop: string
  ): MicroClimateInsights {
    const temp = current.temperature_c;
    const humidity = current.relative_humidity;
    const rainMm = current.precipitation_mm;
    const maxRainProb = Math.max(...daily.map(d => d.precip_probability_max), 0);

    // 1. Crop Weather Suitability
    let statusMessage = `Suitable for ${crop} Cultivation`;
    let statusType: 'success' | 'warning' | 'info' | 'danger' = 'success';

    if (crop.toLowerCase() === 'rice') {
      if (temp > 38) {
        statusMessage = `Heat Stress Alert for Rice - Temperature is ${temp}°C`;
        statusType = 'danger';
      } else if (humidity > 80 && maxRainProb > 60) {
        statusMessage = `High Humidity & Rain Suitable for Rice Transplanting`;
        statusType = 'success';
      }
    } else if (crop.toLowerCase() === 'wheat') {
      if (temp > 30) {
        statusMessage = `Heat Stress Warning for Wheat - Temperature above 30°C may reduce grain fill`;
        statusType = 'warning';
      }
    } else if (crop.toLowerCase() === 'cotton' || crop.toLowerCase() === 'maize') {
      if (rainMm > 20 || maxRainProb > 70) {
        statusMessage = `Heavy Rainfall Warning for ${crop} - Ensure Field Drainage`;
        statusType = 'warning';
      }
    }

    // 2. Irrigation Requirement
    let irrigationLevel: 'High' | 'Moderate' | 'Low' | 'None' = 'Low';
    let irrigationDesc = 'Soil moisture level adequate. No immediate irrigation needed.';

    if (maxRainProb > 60 || rainMm > 5) {
      irrigationLevel = 'None';
      irrigationDesc = `Rainfall expected (${maxRainProb}% prob). Delay scheduled irrigation.`;
    } else if (temp > 32 && humidity < 50) {
      irrigationLevel = 'High';
      irrigationDesc = 'High evaporation rate. Schedule watering early morning or evening.';
    } else if (temp > 28) {
      irrigationLevel = 'Moderate';
      irrigationDesc = 'Moderate evapotranspiration. Regular soil moisture checks recommended.';
    }

    // 3. Heat Stress Index (Temperature-Humidity Index THI)
    // THI = (1.8 * T + 32) - (0.55 - 0.0055 * RH) * (1.8 * T - 26)
    const thi = Math.round((1.8 * temp + 32) - (0.55 - 0.0055 * humidity) * (1.8 * temp - 26));
    let heatLevel: 'Normal' | 'Moderate Caution' | 'High Risk' | 'Severe' = 'Normal';
    let heatDesc = 'Temperatures are within favorable physiological range for crop growth.';

    if (temp >= 36 || thi > 84) {
      heatLevel = 'Severe';
      heatDesc = 'Extreme thermal stress! Provide shade or mist irrigation where applicable.';
    } else if (temp >= 32 || thi > 78) {
      heatLevel = 'High Risk';
      heatDesc = 'High heat stress detected. Monitor soil moisture and plant wilting.';
    } else if (temp >= 29) {
      heatLevel = 'Moderate Caution';
      heatDesc = 'Warm temperature. Maintain proper irrigation.';
    }

    // 4. Disease / Fungal Risk
    let diseaseLevel: 'Low' | 'Moderate' | 'High Fungal Risk' = 'Low';
    let diseaseDesc = 'Favorable dry leaf surfaces. Low fungal/bacterial disease risk.';

    if (humidity >= 78 && temp >= 22) {
      diseaseLevel = 'High Fungal Risk';
      diseaseDesc = 'High relative humidity (>75%) creates ideal conditions for blast, rust, and blight.';
    } else if (humidity >= 65) {
      diseaseLevel = 'Moderate';
      diseaseDesc = 'Moderate humidity. Monitor leaves for early disease symptoms.';
    }

    // 5. Field Operation Suitability
    let fieldLevel: 'Favorable' | 'Caution' | 'Unfavorable' = 'Favorable';
    let fieldDesc = 'Calm winds and low rainfall. Ideal for pesticide spraying and harvesting.';

    if (current.wind_speed_kmh > 20) {
      fieldLevel = 'Unfavorable';
      fieldDesc = `Wind speed is ${current.wind_speed_kmh} km/h. Avoid chemical spraying due to drift.`;
    } else if (maxRainProb > 60 || rainMm > 2) {
      fieldLevel = 'Caution';
      fieldDesc = 'Impending rain. Postpone crop harvesting or pesticide application.';
    }

    return {
      crop,
      statusMessage,
      statusType,
      irrigationNeed: { level: irrigationLevel, description: irrigationDesc },
      heatStress: { level: heatLevel, description: heatDesc, indexValue: thi },
      diseaseRisk: { level: diseaseLevel, description: diseaseDesc },
      fieldOperations: { level: fieldLevel, description: fieldDesc }
    };
  }
};
