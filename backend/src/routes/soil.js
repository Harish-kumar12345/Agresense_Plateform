const express = require('express');
const router = express.Router();
const { getDistrictSoilFallback, fetchSoilData } = require('../services/realDataService');

/**
 * GET /api/soil/district-profile
 * Returns genuine Indian Soil Health Card district profile for coordinates / state / district
 */
router.get('/district-profile', (req, res) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat) : null;
    const lon = req.query.lon ? parseFloat(req.query.lon) : null;
    const state = req.query.state || null;
    const district = req.query.district || null;

    const profile = getDistrictSoilFallback(lat, lon, state, district);

    res.json({
      success: true,
      profile,
      query: { lat, lon, state, district },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Soil profile route error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
