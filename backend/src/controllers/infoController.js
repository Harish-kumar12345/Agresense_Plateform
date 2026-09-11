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

const fallbackSchemes = [
  {
    name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
    title: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
    description: 'Income support of ₹6,000 per year in three equal installments to all landholding farmer families.',
    eligibility: 'All landholding farmers families with cultivable land',
    benefit: '₹6,000 / year direct transfer',
    link: 'https://pmkisan.gov.in',
    active: true
  },
  {
    name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    description: 'Comprehensive risk insurance covering yield losses due to non-preventable natural risks.',
    eligibility: 'All farmers growing notified crops in notified areas',
    benefit: 'Subsidized crop insurance (1.5% - 2% premium)',
    link: 'https://pmfby.gov.in',
    active: true
  },
  {
    name: 'Kisan Credit Card (KCC) Scheme',
    title: 'Kisan Credit Card (KCC) Scheme',
    description: 'Adequate and timely credit support from the banking system for agricultural operations.',
    eligibility: 'Small & marginal farmers, sharecroppers, tenant farmers',
    benefit: 'Concessional interest rate at 4% p.a.',
    link: 'https://myscheme.gov.in/schemes/kcc',
    active: true
  }
];

async function getMarketPrices(req, res) {
  try {
    const { crop } = req.params;
    // Placeholder: mock response, replace with actual market API if available
    res.json({ crop, pricePerQuintalINR: 2500, source: 'mock' });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch market prices' });
  }
}

async function getSchemes(req, res) {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const schemes = await Scheme.find({ active: true }).lean();
      if (schemes && schemes.length > 0) {
        return res.json({ schemes });
      }
    }
    return res.json({ schemes: fallbackSchemes, fallback: true });
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch schemes' });
  }
}

module.exports = { getWeather, getMarketPrices, getSchemes };


