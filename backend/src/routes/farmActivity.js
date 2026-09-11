const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { FarmActivity } = require('../models/FarmActivity');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// In-memory fallback storage for farm activities
const inMemoryActivities = [
  {
    activity_id: 'act_demo_1',
    farm_id: 'farm_demo_1',
    field_name: 'Green Valley Rice Farm',
    crop: 'Rice',
    activity_type: 'Sowing',
    date: new Date(Date.now() - 65 * 86400000).toISOString(),
    quantity_details: 'Seed rate: 40 kg/ha (PR-126 paddy variety)',
    notes: 'Sown in nursery bed with moist soil preparation',
    createdAt: new Date(Date.now() - 65 * 86400000).toISOString()
  },
  {
    activity_id: 'act_demo_2',
    farm_id: 'farm_demo_1',
    field_name: 'Green Valley Rice Farm',
    crop: 'Rice',
    activity_type: 'Irrigation',
    date: new Date(Date.now() - 45 * 86400000).toISOString(),
    quantity_details: 'Canal water flow: 5cm field submergence',
    notes: 'Maintained 5 cm standing water level during tillering',
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString()
  },
  {
    activity_id: 'act_demo_3',
    farm_id: 'farm_demo_1',
    field_name: 'Green Valley Rice Farm',
    crop: 'Rice',
    activity_type: 'Fertilization',
    date: new Date(Date.now() - 30 * 86400000).toISOString(),
    quantity_details: 'Urea: 50 kg/ha, NPK 19:19:19: 25 kg/ha',
    notes: 'Applied top dressing fertilizer before panicle initiation',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    activity_id: 'act_demo_4',
    farm_id: 'farm_demo_1',
    field_name: 'Green Valley Rice Farm',
    crop: 'Rice',
    activity_type: 'Disease Inspection',
    date: new Date(Date.now() - 15 * 86400000).toISOString(),
    quantity_details: 'Inspected 10 sample spots across field',
    notes: 'Mild bacterial leaf blight risk detected; neem oil recommended',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
  },
  {
    activity_id: 'act_demo_5',
    farm_id: 'farm_demo_1',
    field_name: 'Green Valley Rice Farm',
    crop: 'Rice',
    activity_type: 'Pesticide Application',
    date: new Date(Date.now() - 10 * 86400000).toISOString(),
    quantity_details: 'Neem Oil 1500ppm: 2.5 L/ha + Sticker',
    notes: 'Preventative bio-pesticide spray during evening hours',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
  }
];

// Helper to sanitize activity object
const formatActivity = (act) => ({
  activity_id: act.activity_id,
  farm_id: act.farm_id || 'default_farm',
  field_name: act.field_name || 'Green Valley Rice Farm',
  crop: act.crop,
  activity_type: act.activity_type,
  date: act.date ? new Date(act.date).toISOString() : new Date().toISOString(),
  quantity_details: act.quantity_details || '',
  notes: act.notes || '',
  createdAt: act.createdAt ? new Date(act.createdAt).toISOString() : new Date().toISOString()
});

// GET /api/farm-activities - Get activity history
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { farm_id, crop, activity_type } = req.query;

    if (mongoose.connection.readyState === 1) {
      const filter = {};
      if (farm_id) filter.farm_id = farm_id;
      if (crop) filter.crop = new RegExp('^' + crop + '$', 'i');
      if (activity_type) filter.activity_type = activity_type;

      const activities = await FarmActivity.find(filter).sort({ date: -1 }).lean();
      return res.json({ success: true, count: activities.length, data: activities });
    }

    // In-memory fallback
    let list = [...inMemoryActivities];
    if (farm_id) list = list.filter(a => a.farm_id === farm_id);
    if (crop) list = list.filter(a => a.crop.toLowerCase() === crop.toLowerCase());
    if (activity_type) list = list.filter(a => a.activity_type === activity_type);

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return res.json({ success: true, count: list.length, data: list, fallback: true });

  } catch (error) {
    console.error('Error fetching farm activities:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch farm activities: ' + error.message });
  }
});

// POST /api/farm-activities - Add a new activity
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      farm_id = 'default_farm',
      field_name = 'Green Valley Rice Farm',
      crop,
      activity_type,
      date,
      quantity_details = '',
      notes = ''
    } = req.body || {};

    const validTypes = ['Sowing', 'Irrigation', 'Fertilization', 'Pesticide Application', 'Weeding', 'Disease Inspection', 'Harvesting'];

    if (!crop || !activity_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: crop, activity_type'
      });
    }

    if (!validTypes.includes(activity_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid activity_type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const activityId = 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const parsedDate = date ? new Date(date) : new Date();
    const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    const newRecord = {
      activity_id: activityId,
      farm_id: String(farm_id),
      field_name: String(field_name).trim(),
      crop: String(crop).trim(),
      activity_type,
      date: validDate,
      quantity_details: String(quantity_details).trim(),
      notes: String(notes).trim(),
      createdAt: new Date()
    };

    if (mongoose.connection.readyState === 1) {
      const saved = new FarmActivity(newRecord);
      await saved.save();
      return res.status(201).json({ success: true, message: 'Activity added successfully', data: saved });
    }

    // Fallback in-memory
    const formatted = formatActivity(newRecord);
    inMemoryActivities.unshift(formatted);
    return res.status(201).json({ success: true, message: 'Activity added successfully', data: formatted, fallback: true });

  } catch (error) {
    console.error('Error creating farm activity:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to save farm activity' + (process.env.NODE_ENV === 'production' ? '' : ': ' + error.message) 
    });
  }
});

// PUT /api/farm-activities/:id - Update an activity
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { field_name, crop, activity_type, date, quantity_details, notes } = req.body || {};

    let validDate = undefined;
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) validDate = d;
    }

    if (mongoose.connection.readyState === 1) {
      const updated = await FarmActivity.findOneAndUpdate(
        { $or: [{ activity_id: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }] },
        { $set: { ...(field_name && { field_name }), ...(crop && { crop }), ...(activity_type && { activity_type }), ...(validDate && { date: validDate }), ...(quantity_details !== undefined && { quantity_details }), ...(notes !== undefined && { notes }) } },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Activity record not found' });
      }
      return res.json({ success: true, message: 'Activity updated successfully', data: updated });
    }

    // In-memory fallback
    const index = inMemoryActivities.findIndex(a => a.activity_id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Activity record not found' });
    }
    inMemoryActivities[index] = {
      ...inMemoryActivities[index],
      ...(field_name && { field_name }),
      ...(crop && { crop }),
      ...(activity_type && { activity_type }),
      ...(validDate && { date: validDate.toISOString() }),
      ...(quantity_details !== undefined && { quantity_details }),
      ...(notes !== undefined && { notes })
    };
    return res.json({ success: true, message: 'Activity updated successfully', data: inMemoryActivities[index], fallback: true });

  } catch (error) {
    console.error('Error updating farm activity:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to update activity' + (process.env.NODE_ENV === 'production' ? '' : ': ' + error.message) 
    });
  }
});

// DELETE /api/farm-activities/:id - Delete an activity
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const deleted = await FarmActivity.findOneAndDelete({
        $or: [{ activity_id: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }]
      });
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Activity record not found' });
      }
      return res.json({ success: true, message: 'Activity deleted successfully' });
    }

    // In-memory fallback
    const index = inMemoryActivities.findIndex(a => a.activity_id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Activity record not found' });
    }
    inMemoryActivities.splice(index, 1);
    return res.json({ success: true, message: 'Activity deleted successfully', fallback: true });

  } catch (error) {
    console.error('Error deleting activity:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete activity' + (process.env.NODE_ENV === 'production' ? '' : ': ' + error.message) 
    });
  }
});

module.exports = router;
