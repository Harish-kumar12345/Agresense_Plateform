const axios = require('axios');
const { Scheme } = require('../models/Scheme');

async function getWeather(req, res) {
  try {
    const { location } = req.params;
    if (!location) return res.status(400).json({ error: 'location is required' });

    // Geocode the location to lat/lon
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    const { data: geo } = await axios.get(geoUrl, { timeout: 10000 });
    const place = geo?.results?.[0];
    if (!place) return res.status(404).json({ error: 'location not found' });

    const latitude = place.latitude;
    const longitude = place.longitude;

    // Fetch forecast: current snapshot, hourly and daily
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=auto&current=temperature_2m,relative_humidity_2m,precipitation&hourly=temperature_2m,relative_humidity_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7`;
    const { data: wx } = await axios.get(forecastUrl, { timeout: 12000 });

    const currData = wx?.current;
    const current = {
      temperature_c: currData?.temperature_2m ?? null,
      relative_humidity: currData?.relative_humidity_2m ?? null,
      precipitation_probability: wx?.hourly?.precipitation_probability?.[0] ?? null
    };

    const daily = (wx?.daily?.time || []).map((t, i) => ({
      date: t,
      temp_max_c: wx?.daily?.temperature_2m_max?.[i] ?? null,
      temp_min_c: wx?.daily?.temperature_2m_min?.[i] ?? null,
      precip_probability_max: wx?.daily?.precipitation_probability_max?.[i] ?? null
    }));

    res.json({
      location: {
        query: location,
        name: place.name,
        country: place.country,
        latitude,
        longitude
      },
      current,
      daily
    });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch weather' });
  }
}

const SCHEMES_DATA = require('../data/dbt_myscheme_agriculture_directory.json');
const fallbackSchemes = SCHEMES_DATA.schemes || [];
const AGMARKNET_TIMESERIES = require('../data/agmarknet_historical_timeseries.json');

async function getMarketPrices(req, res) {
  try {
    const { crop } = req.params;
    const cropLower = String(crop || 'Rice').toLowerCase();

    // Query authentic Agmarknet modal price
    const matchedKey = Object.keys(AGMARKNET_TIMESERIES).find(
      k => k.toLowerCase() === cropLower || cropLower.includes(k.toLowerCase()) || k.toLowerCase().includes(cropLower)
    ) || 'Rice';

    const comm = AGMARKNET_TIMESERIES[matchedKey];
    const pricePerQuintalINR = comm ? comm.currentModalPrice : 2450;

    res.json({
      success: true,
      crop: matchedKey,
      pricePerQuintalINR,
      market: comm?.market || 'National Benchmark Mandi',
      state: comm?.state || 'India',
      unit: '₹/Quintal',
      source: 'Agmarknet / DMI Government of India',
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch market prices' });
  }
}

async function getSchemes(req, res) {
  try {
    const { state, category, search } = req.query || {};
    let allSchemes = fallbackSchemes;

    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const dbSchemes = await Scheme.find({ active: true }).lean();
      if (dbSchemes && dbSchemes.length > 0) {
        allSchemes = dbSchemes;
      }
    }

    // Filter by State if requested (include 'All India' central schemes alongside state-specific ones)
    if (state && String(state).toLowerCase() !== 'all') {
      const sLower = String(state).toLowerCase();
      allSchemes = allSchemes.filter(s =>
        s.state === 'All India' ||
        s.state.toLowerCase().includes(sLower) ||
        sLower.includes(s.state.toLowerCase())
      );
    }

    // Filter by Category if requested
    if (category && String(category).toLowerCase() !== 'all') {
      const cLower = String(category).toLowerCase();
      allSchemes = allSchemes.filter(s => s.category?.toLowerCase() === cLower);
    }

    // Keyword Search
    if (search && search.trim()) {
      const term = search.toLowerCase().trim();
      allSchemes = allSchemes.filter(s =>
        s.name?.toLowerCase().includes(term) ||
        s.title?.toLowerCase().includes(term) ||
        s.description?.toLowerCase().includes(term)
      );
    }

    return res.json({
      success: true,
      count: allSchemes.length,
      schemes: allSchemes,
      dataSource: 'DBT Agriculture / National myScheme Portal'
    });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch schemes' });
  }
}

module.exports = { getWeather, getMarketPrices, getSchemes };


