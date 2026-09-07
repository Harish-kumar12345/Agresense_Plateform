const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Farm } = require('../models/Farm');

// Optional auth: extracts user from JWT if present, but doesn't reject unauthenticated requests
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      req.user = decoded; // { sub: userId, role, iat, exp }
    } catch (err) {
      // Token invalid/expired — proceed as unauthenticated
    }
  }
  next();
}

// In-memory fallback storage when MongoDB is disconnected
const inMemoryFarms = [
  {
    farm_id: 'farm_demo_1',
    farm_name: 'Green Valley Rice Farm',
    farmer_id: 'default_farmer',
    crop: 'Rice',
    season: 'Kharif',
    latitude: 28.6692,
    longitude: 77.4538,
    area_hectares: 2.50,
    area_acres: 6.18,
    area_sqm: 25000,
    area_bigha: 9.96,
    boundary_geojson: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [77.4528, 28.6685],
          [77.4548, 28.6685],
          [77.4548, 28.6700],
          [77.4528, 28.6700],
          [77.4528, 28.6685]
        ]]
      },
      properties: { name: 'Green Valley Rice Farm' }
    },
    location_name: 'Ghaziabad, Uttar Pradesh',
    soil_type: 'Clay Loam',
    irrigation_type: 'Canal',
    created_at: new Date().toISOString()
  }
];

// GET /api/farms - Get all farms
router.get('/', optionalAuth, async (req, res) => {
  try {
    // If authenticated, always use the JWT user ID; ignore client-supplied farmer_id
    const farmer_id = req.user?.sub || req.query.farmer_id;
    
    if (mongoose.connection.readyState === 1) {
      const filter = farmer_id ? { farmer_id } : {};
      const farms = await Farm.find(filter).sort({ created_at: -1 }).lean();
      return res.json({ success: true, count: farms.length, data: farms });
    }
    
    // In-memory fallback
    let farms = [...inMemoryFarms];
    if (farmer_id) {
      farms = farms.filter(f => f.farmer_id === farmer_id);
    }
    return res.json({ success: true, count: farms.length, data: farms, fallback: true });
  } catch (error) {
    console.error('Error fetching farms:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch farms' });
  }
});

// GET /api/farms/:id - Get farm by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (mongoose.connection.readyState === 1) {
      const farm = await Farm.findOne({ $or: [{ farm_id: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }] }).lean();
      if (!farm) {
        return res.status(404).json({ success: false, error: 'Farm not found' });
      }
      return res.json({ success: true, data: farm });
    }
    
    // In-memory fallback
    const farm = inMemoryFarms.find(f => f.farm_id === id);
    if (!farm) {
      return res.status(404).json({ success: false, error: 'Farm not found' });
    }
    return res.json({ success: true, data: farm, fallback: true });
  } catch (error) {
    console.error('Error fetching farm details:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch farm details' });
  }
});

// POST /api/farms - Save a new farm
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      farm_name,
      farmer_id: clientFarmerId = 'default_farmer',
      crop,
      season = 'Kharif',
      latitude,
      longitude,
      area_hectares,
      area_acres,
      area_sqm = 0,
      area_bigha = 0,
      boundary_geojson = null,
      location_name = 'Custom Location',
      soil_type = 'Loamy',
      irrigation_type = 'Canal'
    } = req.body;

    // Use authenticated user's ID if available; otherwise fall back to client-supplied value
    const farmer_id = req.user?.sub || clientFarmerId;

    if (!farm_name || !crop || latitude === undefined || longitude === undefined || !area_hectares) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: farm_name, crop, latitude, longitude, area_hectares'
      });
    }

    const farmId = 'farm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    const farmData = {
      farm_id: farmId,
      farm_name: farm_name.trim(),
      farmer_id,
      crop: crop.trim(),
      season,
      latitude: Number(latitude),
      longitude: Number(longitude),
      area_hectares: Number(area_hectares),
      area_acres: Number(area_acres || (area_hectares * 2.47105).toFixed(2)),
      area_sqm: Number(area_sqm || (area_hectares * 10000).toFixed(2)),
      area_bigha: Number(area_bigha || (area_hectares * 3.9866).toFixed(2)),
      boundary_geojson,
      location_name,
      soil_type,
      irrigation_type,
      created_at: new Date()
    };

    if (mongoose.connection.readyState === 1) {
      const newFarm = new Farm(farmData);
      await newFarm.save();
      console.log('✅ Farm saved to MongoDB Atlas:', farmData.farm_name);
      return res.status(201).json({ success: true, message: 'Farm saved successfully', data: newFarm });
    }

    // In-memory fallback
    inMemoryFarms.unshift(farmData);
    console.log('✅ Farm saved in memory fallback:', farmData.farm_name);
    return res.status(201).json({ success: true, message: 'Farm saved successfully', data: farmData, fallback: true });

  } catch (error) {
    console.error('Error saving farm:', error);
    return res.status(500).json({ success: false, error: 'Failed to save farm: ' + error.message });
  }
});

// PUT /api/farms/:id - Update an existing farm
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (mongoose.connection.readyState === 1) {
      const updatedFarm = await Farm.findOneAndUpdate(
        { $or: [{ farm_id: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }] },
        { $set: updateData },
        { new: true }
      );
      if (!updatedFarm) {
        return res.status(404).json({ success: false, error: 'Farm not found' });
      }
      return res.json({ success: true, message: 'Farm updated successfully', data: updatedFarm });
    }

    // In-memory fallback
    const index = inMemoryFarms.findIndex(f => f.farm_id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Farm not found' });
    }
    inMemoryFarms[index] = { ...inMemoryFarms[index], ...updateData };
    return res.json({ success: true, message: 'Farm updated successfully', data: inMemoryFarms[index], fallback: true });

  } catch (error) {
    console.error('Error updating farm:', error);
    return res.status(500).json({ success: false, error: 'Failed to update farm' });
  }
});

// DELETE /api/farms/:id - Delete a farm
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const deletedFarm = await Farm.findOneAndDelete({
        $or: [{ farm_id: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }]
      });
      if (!deletedFarm) {
        return res.status(404).json({ success: false, error: 'Farm not found' });
      }
      return res.json({ success: true, message: 'Farm deleted successfully' });
    }

    // In-memory fallback
    const index = inMemoryFarms.findIndex(f => f.farm_id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Farm not found' });
    }
    inMemoryFarms.splice(index, 1);
    return res.json({ success: true, message: 'Farm deleted successfully', fallback: true });

  } catch (error) {
    console.error('Error deleting farm:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete farm' });
  }
});

module.exports = router;
