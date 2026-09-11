const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { HarvestRecord } = require('../models/HarvestRecord');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// In-memory fallback storage for Harvest Records
const inMemoryHarvestRecords = [
  {
    harvest_id: 'harv_demo_1',
    farm_id: 'farm_demo_1',
    field_name: 'Green Valley Rice Farm',
    crop: 'Rice',
    area_hectares: 2.5,
    predicted_yield_tha: 4.8,
    expected_production_tons: 12.0,
    current_gdd: 1450,
    growth_stage: 'Ripening / Grain Filling',
    sowing_date: new Date(Date.now() - 65 * 86400000).toISOString(),
    expected_harvest_date: new Date(Date.now() + 18 * 86400000).toISOString(),
    harvest_window: 'Oct 28 - Nov 10, 2026',
    status: 'Approaching',
    notes: 'Crop reaching 85% maturity. Prepare harvesting equipment and moisture meter.',
    updated_at: new Date().toISOString()
  }
];

// GET /api/harvest-management - Get harvest tracking record(s)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { farm_id, crop } = req.query;

    if (mongoose.connection.readyState === 1) {
      const filter = {};
      if (farm_id) filter.farm_id = farm_id;
      if (crop) filter.crop = new RegExp('^' + crop + '$', 'i');

      const records = await HarvestRecord.find(filter).sort({ updated_at: -1 }).lean();
      return res.json({ success: true, count: records.length, data: records });
    }

    // In-memory fallback
    let list = [...inMemoryHarvestRecords];
    if (farm_id) list = list.filter(r => r.farm_id === farm_id);
    if (crop) list = list.filter(r => r.crop.toLowerCase() === crop.toLowerCase());

    return res.json({ success: true, count: list.length, data: list, fallback: true });

  } catch (error) {
    console.error('Error fetching harvest records:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch harvest records: ' + error.message });
  }
});

// POST /api/harvest-management - Save or update harvest tracking record
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      farm_id = 'default_farm',
      field_name = 'Green Valley Rice Farm',
      crop,
      area_hectares = 2.5,
      predicted_yield_tha,
      expected_production_tons,
      current_gdd = 0,
      growth_stage = 'Vegetative',
      sowing_date,
      expected_harvest_date,
      manual_harvest_date = null,
      harvest_window = '',
      status = 'Not Ready',
      notes = '',
      required_labour = 12,
      storage_requirement_sqft = 180,
      storage_bags_count = 240,
      storage_moisture_target_pct = 13.5
    } = req.body;

    if (!crop || predicted_yield_tha === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: crop, predicted_yield_tha'
      });
    }

    const area = Number(area_hectares);
    const yieldPerHa = Number(predicted_yield_tha);

    if (isNaN(area) || area <= 0) {
      return res.status(400).json({ success: false, error: 'area_hectares must be a positive number' });
    }

    if (isNaN(yieldPerHa) || yieldPerHa < 0) {
      return res.status(400).json({ success: false, error: 'predicted_yield_tha must be a non-negative number' });
    }

    const totalProd = Number(expected_production_tons) || Number((yieldPerHa * area).toFixed(2));
    const harvestId = 'harv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    const recordData = {
      harvest_id: harvestId,
      farm_id,
      field_name: field_name.trim(),
      crop: crop.trim(),
      area_hectares: area,
      predicted_yield_tha: yieldPerHa,
      expected_production_tons: totalProd,
      current_gdd: Number(current_gdd) || 0,
      growth_stage,
      sowing_date: sowing_date ? new Date(sowing_date) : null,
      expected_harvest_date: expected_harvest_date ? new Date(expected_harvest_date) : new Date(Date.now() + 60 * 86400000),
      manual_harvest_date: manual_harvest_date ? new Date(manual_harvest_date) : null,
      harvest_window,
      status,
      notes: notes.trim(),
      required_labour: Number(required_labour) || 12,
      storage_requirement_sqft: Number(storage_requirement_sqft) || 180,
      storage_bags_count: Number(storage_bags_count) || 240,
      storage_moisture_target_pct: Number(storage_moisture_target_pct) || 13.5,
      updated_at: new Date()
    };

    if (mongoose.connection.readyState === 1) {
      const record = await HarvestRecord.findOneAndUpdate(
        { farm_id, crop: crop.trim() },
        { $set: recordData },
        { upsert: true, new: true }
      );
      return res.status(200).json({ success: true, message: 'Harvest record updated successfully', data: record });
    }

    // In-memory fallback
    const idx = inMemoryHarvestRecords.findIndex(r => r.farm_id === farm_id && r.crop.toLowerCase() === crop.toLowerCase());
    const formattedData = {
      ...recordData,
      sowing_date: recordData.sowing_date ? recordData.sowing_date.toISOString() : null,
      expected_harvest_date: recordData.expected_harvest_date.toISOString(),
      manual_harvest_date: recordData.manual_harvest_date ? recordData.manual_harvest_date.toISOString() : null,
      updated_at: recordData.updated_at.toISOString()
    };

    if (idx !== -1) {
      inMemoryHarvestRecords[idx] = formattedData;
    } else {
      inMemoryHarvestRecords.unshift(formattedData);
    }

    return res.status(200).json({ success: true, message: 'Harvest record updated successfully', data: formattedData, fallback: true });

  } catch (error) {
    console.error('Error saving harvest record:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to save harvest record' + (process.env.NODE_ENV === 'production' ? '' : ': ' + error.message) 
    });
  }
});

// GET /api/harvest-management/alerts - Fetch active alerts and recommendations
router.get('/alerts', (req, res) => {
  try {
    const alerts = [
      {
        id: 'alert_1',
        type: 'warning',
        category: 'Harvest Window',
        title: '🌾 Rice Crop Approaching Maturity',
        description: 'Green Valley Rice Farm has accumulated 1,450 GDD. Expected harvest window opens in ~18 days.',
        actionRequired: 'Inspect grain moisture & schedule combine harvester',
        timestamp: new Date().toISOString()
      },
      {
        id: 'alert_2',
        type: 'info',
        category: 'Activity Alert',
        title: '💧 Post-Fertilization Irrigation Due',
        description: 'Soil moisture drop projected in 3 days based on current weather telemetry.',
        actionRequired: 'Plan 15mm irrigation cycle before weekend',
        timestamp: new Date().toISOString()
      },
      {
        id: 'alert_3',
        type: 'success',
        category: 'Yield Forecast',
        title: '📈 Optimal Yield Trajectory',
        description: 'Predicted yield of 4.80 t/ha is +14.3% above district benchmark (4.20 t/ha).',
        actionRequired: 'Maintain nutrient balance and current pest control schedule',
        timestamp: new Date().toISOString()
      }
    ];

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    console.error('Error fetching harvest alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
  }
});

module.exports = router;
