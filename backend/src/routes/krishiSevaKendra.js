const express = require('express');
const axios = require('axios');
const router = express.Router();
const KVK_DATA = require('../data/icar_kvk_master_directory.json');
const KVK_DIRECTORY = KVK_DATA.kvks || [];

// ---------------------------------------------------------------------------
// Haversine distance (km)
// ---------------------------------------------------------------------------
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ---------------------------------------------------------------------------
// Reverse-geocode: get district + state from lat/lon
// ---------------------------------------------------------------------------
async function reverseGeocode(lat, lon) {
  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
      { timeout: 6000, headers: { 'User-Agent': 'AgriSense/1.0' } }
    );
    const addr = res.data?.address || {};
    return {
      district: addr.county || addr.state_district || addr.city_district || addr.city || addr.town || addr.village || 'Local Area',
      state: addr.state || 'India'
    };
  } catch {
    return { district: 'Local Area', state: 'India' };
  }
}

// ---------------------------------------------------------------------------
// Nominatim search — search for agri centers by keyword near coordinates
// ---------------------------------------------------------------------------
async function searchNominatim(keyword, lat, lon, radiusKm) {
  try {
    const delta = radiusKm / 111;
    const viewbox = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;

    const res = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: keyword,
        format: 'json',
        limit: 15,
        viewbox,
        bounded: 1,
        addressdetails: 1,
        countrycodes: 'in'
      },
      timeout: 6000,
      headers: { 'User-Agent': 'AgriSense/1.0' }
    });

    return res.data || [];
  } catch (e) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Resolve category from place data
// ---------------------------------------------------------------------------
function resolveCategory(name = '', type = '', classTag = '') {
  const n = name.toLowerCase();
  if (n.includes('vigyan kendra') || n.includes('kvk')) return { category: 'KVK', categoryLabel: 'Krishi Vigyan Kendra' };
  if (n.includes('fertilizer') || n.includes('khad') || n.includes('iffco') || n.includes('kribhco')) return { category: 'FERTILIZER', categoryLabel: 'Fertilizer Shop' };
  if (n.includes('seed') || n.includes('beej') || n.includes('nursery')) return { category: 'SEEDS', categoryLabel: 'Seed Supplier' };
  if (n.includes('pesticide') || n.includes('agrochem') || n.includes('plant protection')) return { category: 'PESTICIDES', categoryLabel: 'Pesticide Shop' };
  if (n.includes('mandi') || n.includes('market') || n.includes('apmc')) return { category: 'OFFICE', categoryLabel: 'Agricultural Market' };
  return { category: 'KSK', categoryLabel: 'Krishi Seva Kendra' };
}

function servicesFor(category) {
  switch (category) {
    case 'KVK': return ['Farmer Training', 'Frontline Demonstrations', 'Soil Testing', 'High Yield Seedlings', 'PM-KSK Advisory'];
    case 'FERTILIZER': return ['Urea & NPK Fertilizers', 'Organic Bio-fertilizers', 'Micronutrients'];
    case 'SEEDS': return ['Certified Seeds', 'Hybrid Varieties', 'Seedlings'];
    case 'PESTICIDES': return ['Bio-pesticides', 'Fungicides', 'Insecticides', 'Sprayers'];
    case 'OFFICE': return ['Government Schemes', 'Subsidies', 'Crop Insurance', 'Soil Health Cards'];
    default: return ['Crop Advisory', 'Soil Testing', 'Seed Distribution', 'Fertilizer Guidance', 'Subsidy Info'];
  }
}

function nominatimToCenter(place, idPrefix) {
  const name = place.display_name.split(',')[0].trim();
  const addr = place.address || {};
  const { category, categoryLabel } = resolveCategory(
    place.display_name, place.type, place.class
  );

  return {
    id: `${idPrefix}_${place.place_id}`,
    name,
    nameLocal: '',
    category,
    categoryLabel,
    address: [
      addr.road || addr.pedestrian,
      addr.suburb || addr.neighbourhood,
      addr.city || addr.town || addr.village,
      addr.state_district || addr.county
    ].filter(Boolean).join(', ') || place.display_name.split(',').slice(1, 4).join(',').trim(),
    district: addr.county || addr.state_district || addr.city || addr.town || '',
    state: addr.state || 'India',
    pincode: addr.postcode || '',
    phone: '',
    email: '',
    services: servicesFor(category),
    coordinates: {
      latitude: parseFloat(place.lat),
      longitude: parseFloat(place.lon)
    },
    workingHours: '9:00 AM - 5:00 PM (Mon-Fri)',
    rating: 4.5,
    source: 'OpenStreetMap / Nominatim'
  };
}

function checkIsOpenNow(workingHoursStr) {
  if (!workingHoursStr) return true;
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  if (workingHoursStr.includes('Mon-Fri') && (day === 0 || day === 6)) return false;
  if (workingHoursStr.includes('Mon-Sat') && day === 0) return false;
  return hour >= 9 && hour < 17;
}

// ---------------------------------------------------------------------------
// GET /api/krishi-seva-kendra?latitude=&longitude=&category=&search=&radius=
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { latitude, longitude, category = 'ALL', search = '', radius = 50 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'latitude and longitude are required' });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const radiusKm = Math.min(Math.max(parseInt(radius) || 50, 10), 100);

    if (isNaN(userLat) || isNaN(userLon)) {
      return res.status(400).json({ success: false, error: 'Invalid coordinates' });
    }

    // 1. Reverse geocode to get administrative district and state
    const locationInfo = await reverseGeocode(userLat, userLon);

    // 2. Query Verified ICAR KVK Directory
    const kvkMatches = KVK_DIRECTORY.map(kvk => {
      const distKm = calculateDistance(userLat, userLon, kvk.coordinates.latitude, kvk.coordinates.longitude);
      return {
        ...kvk,
        distance: Math.round(distKm * 10) / 10,
        isOpenNow: checkIsOpenNow(kvk.workingHours)
      };
    });

    // Filter KVKs within search radius
    let nearbyKvks = kvkMatches.filter(k => k.distance <= radiusKm);
    if (nearbyKvks.length === 0) {
      // If none within tight radius, include the 3 nearest KVKs
      kvkMatches.sort((a, b) => a.distance - b.distance);
      nearbyKvks = kvkMatches.slice(0, 3);
    }

    // 3. Optional auxiliary search via Nominatim
    const keywords = ['Krishi Seva Kendra', 'IFFCO fertilizer', 'seed shop'];
    const searchResults = await Promise.allSettled(
      keywords.map(kw => searchNominatim(kw, userLat, userLon, radiusKm))
    );

    const seenIds = new Set(nearbyKvks.map(k => k.id));
    const rawCenters = [...nearbyKvks];

    for (const result of searchResults) {
      if (result.status === 'fulfilled') {
        for (const place of result.value) {
          if (!seenIds.has(`nom_${place.place_id}`)) {
            seenIds.add(`nom_${place.place_id}`);
            const center = nominatimToCenter(place, 'nom');
            const distKm = Math.round(calculateDistance(userLat, userLon, center.coordinates.latitude, center.coordinates.longitude) * 10) / 10;
            if (distKm <= radiusKm) {
              rawCenters.push({
                ...center,
                district: center.district || locationInfo.district,
                state: center.state || locationInfo.state,
                distance: distKm,
                isOpenNow: checkIsOpenNow(center.workingHours)
              });
            }
          }
        }
      }
    }

    // 4. Sort combined list by distance
    let processed = rawCenters.sort((a, b) => a.distance - b.distance);

    // 7. Category filter
    if (category && category !== 'ALL') {
      processed = processed.filter(c => c.category.toUpperCase() === category.toUpperCase());
    }

    // 8. Search filter
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      processed = processed.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.services.some(s => s.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      userLocation: {
        latitude: userLat,
        longitude: userLon,
        district: locationInfo.district,
        state: locationInfo.state,
        radiusKm
      },
      count: processed.length,
      centers: processed,
      lastUpdated: new Date().toISOString(),
      source: 'OpenStreetMap Nominatim (Live)'
    });

  } catch (error) {
    console.error('Krishi Seva Kendra API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch agricultural centers',
      ...(process.env.NODE_ENV === 'production' ? {} : { message: error.message })
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/krishi-seva-kendra/district/:districtName
// ---------------------------------------------------------------------------
router.get('/district/:districtName', async (req, res) => {
  try {
    const { districtName } = req.params;

    // Get coordinates for the district
    const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: `${districtName} district India`, format: 'json', limit: 1 },
      timeout: 6000,
      headers: { 'User-Agent': 'AgriSense/1.0' }
    });

    let lat = 20.5937, lon = 78.9629;
    if (geoRes.data?.[0]) {
      lat = parseFloat(geoRes.data[0].lat);
      lon = parseFloat(geoRes.data[0].lon);
    }

    const results = await searchNominatim('Krishi Bhavan Agriculture office', lat, lon, 40);
    const centers = results
      .map((p, i) => ({
        ...nominatimToCenter(p, 'dist'),
        distance: Math.round(calculateDistance(lat, lon, parseFloat(p.lat), parseFloat(p.lon)) * 10) / 10
      }))
      .sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      district: districtName,
      count: centers.length,
      centers,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('District centers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch district centers' });
  }
});

module.exports = router;