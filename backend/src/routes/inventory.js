const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Inventory = require('../models/Inventory');
const ApplicationLog = require('../models/ApplicationLog');
const { requireAuth } = require('../middleware/auth');

// In-Memory Fallback Storage ONLY if MongoDB Atlas is disconnected
let inMemoryInventory = [
  {
    _id: 'inv_f1',
    userId: 'default_farmer',
    name: 'Urea 46% Nitrogen',
    category: 'Fertilizer',
    type: 'Nitrogenous',
    quantity: 45,
    unit: 'kg',
    purchase_date: '2026-01-10',
    expiry_date: '2027-01-10',
    cost: 320,
    notes: 'High nitrogen booster for vegetative stage',
    status: 'Available'
  },
  {
    _id: 'inv_f2',
    userId: 'default_farmer',
    name: 'Di-Ammonium Phosphate (DAP 18-46-0)',
    category: 'Fertilizer',
    type: 'Phosphatic',
    quantity: 25,
    unit: 'kg',
    purchase_date: '2026-02-01',
    expiry_date: '2027-02-01',
    cost: 1350,
    notes: 'Root formation and early tiller establishment',
    status: 'Available'
  },
  {
    _id: 'inv_f3',
    userId: 'default_farmer',
    name: 'Muriate of Potash (MOP 60% K2O)',
    category: 'Fertilizer',
    type: 'Potassic',
    quantity: 3,
    unit: 'kg',
    purchase_date: '2025-05-10',
    expiry_date: '2026-11-10',
    cost: 850,
    notes: 'Grain filling and drought resistance',
    status: 'Low Stock'
  },
  {
    _id: 'inv_p1',
    userId: 'default_farmer',
    name: 'Neem Oil Bio-Pesticide (10000 ppm)',
    category: 'Pesticide',
    type: 'Bio-Pesticide',
    quantity: 4,
    unit: 'liters',
    purchase_date: '2026-03-01',
    expiry_date: '2027-03-01',
    cost: 450,
    notes: 'Organic repellent for sucking insects & aphids',
    status: 'Available'
  }
];

let inMemoryLogs = [
  {
    _id: 'log_1',
    userId: 'default_farmer',
    date: '2026-03-05',
    crop: 'Rice',
    field: 'Plot A (North Paddy)',
    product_name: 'Urea 46% Nitrogen',
    category: 'Fertilizer',
    quantity_used: 15,
    unit: 'kg',
    target_nutrient_or_pest: 'Vegetative tillering stage',
    notes: 'Applied during morning irrigation'
  }
];

// Helper: Calculate inventory status based on stock and expiry
const calculateStatus = (qty, expiryDate) => {
  if (expiryDate) {
    const exp = new Date(expiryDate);
    const now = new Date();
    if (exp < now) return 'Expired';
  }
  if (qty <= 0) return 'Out of Stock';
  if (qty <= 5) return 'Low Stock';
  return 'Available';
};

/**
 * GET /api/inventory
 * Fetch inventory items with user-level scoping, optional category/status filtering & search
 */
router.get('/inventory', requireAuth, async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const userId = req.user?.sub;
    const isOfficer = req.user?.role === 'officer';

    if (mongoose.connection.readyState === 1) {
      let query = {};
      if (!isOfficer && userId) {
        query.$or = [{ userId }, { userId: 'default_farmer' }];
      }
      if (category) query.category = category;
      if (status) query.status = status;
      if (search) query.name = { $regex: search, $options: 'i' };

      const items = await Inventory.find(query).sort({ createdAt: -1 });
      return res.json({ success: true, count: items.length, items });
    }

    // Offline Fallback
    let items = inMemoryInventory;
    if (!isOfficer && userId) {
      items = items.filter(i => i.userId === userId || i.userId === 'default_farmer');
    }
    if (category) items = items.filter(i => i.category === category);
    if (status) items = items.filter(i => i.status === status);
    if (search) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

    return res.json({ success: true, count: items.length, items, usingFallbackData: true });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/inventory
 * Add a new inventory item scoped to the user
 */
router.post('/inventory', requireAuth, async (req, res) => {
  try {
    const { name, category, type, quantity, unit, purchase_date, expiry_date, cost, notes, farmId } = req.body;
    const userId = req.user?.sub || 'default_farmer';

    if (!name || !category || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Name, category, and quantity are required.' });
    }

    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum < 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a non-negative number.' });
    }
    const costNum = Number(cost);
    if (!isNaN(costNum) && costNum < 0) {
      return res.status(400).json({ success: false, message: 'Cost cannot be negative.' });
    }

    const status = calculateStatus(qtyNum, expiry_date);

    if (mongoose.connection.readyState === 1) {
      const newItem = await Inventory.create({
        userId,
        farmId,
        name,
        category,
        type: type || 'General',
        quantity: qtyNum,
        unit: unit || 'kg',
        purchase_date: purchase_date || new Date(),
        expiry_date,
        cost: Number(cost) || 0,
        notes: notes || '',
        status
      });
      return res.status(201).json({ success: true, item: newItem });
    }

    // Offline fallback
    const newItem = {
      _id: 'inv_' + Date.now(),
      userId,
      farmId,
      name,
      category,
      type: type || 'General',
      quantity: qtyNum,
      unit: unit || 'kg',
      purchase_date: purchase_date || new Date().toISOString().split('T')[0],
      expiry_date,
      cost: Number(cost) || 0,
      notes: notes || '',
      status
    };
    inMemoryInventory.unshift(newItem);
    return res.status(201).json({ success: true, item: newItem, usingFallbackData: true });
  } catch (error) {
    console.error('Error adding inventory item:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/inventory/:id
 * Edit existing inventory item with proper status recalculation from actual quantity
 */
router.put('/inventory/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body || {};
    const userId = req.user?.sub;
    const isOfficer = req.user?.role === 'officer';

    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ success: false, message: 'Inventory item not found' });
      }

      const query = { _id: id };
      if (!isOfficer && userId) {
        query.$or = [{ userId }, { userId: 'default_farmer' }];
      }

      const existingItem = await Inventory.findOne(query);
      if (!existingItem) {
        return res.status(404).json({ success: false, message: 'Inventory item not found or unauthorized' });
      }

      if (updateData.quantity !== undefined || updateData.expiry_date !== undefined) {
        const qty = updateData.quantity !== undefined ? Number(updateData.quantity) : existingItem.quantity;
        const exp = updateData.expiry_date !== undefined ? updateData.expiry_date : existingItem.expiry_date;
        updateData.status = calculateStatus(qty, exp);
      }

      const updatedItem = await Inventory.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
      return res.json({ success: true, item: updatedItem });
    }

    // Offline fallback
    const idx = inMemoryInventory.findIndex(i => i._id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    const currentItem = inMemoryInventory[idx];
    if (!isOfficer && userId && currentItem.userId !== userId && currentItem.userId !== 'default_farmer') {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this item' });
    }

    const qty = updateData.quantity !== undefined ? Number(updateData.quantity) : currentItem.quantity;
    const exp = updateData.expiry_date !== undefined ? updateData.expiry_date : currentItem.expiry_date;
    updateData.status = calculateStatus(qty, exp);

    inMemoryInventory[idx] = { ...currentItem, ...updateData };
    return res.json({ success: true, item: inMemoryInventory[idx], usingFallbackData: true });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/inventory/:id
 * Delete inventory item with genuine 404 validation
 */
router.delete('/inventory/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub;
    const isOfficer = req.user?.role === 'officer';

    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ success: false, message: 'Inventory item not found' });
      }

      const query = { _id: id };
      if (!isOfficer && userId) {
        query.$or = [{ userId }, { userId: 'default_farmer' }];
      }

      const deleted = await Inventory.findOneAndDelete(query);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Inventory item not found or unauthorized' });
      }

      return res.json({ success: true, message: 'Item deleted successfully' });
    }

    // Offline fallback
    const idx = inMemoryInventory.findIndex(i => i._id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    const item = inMemoryInventory[idx];
    if (!isOfficer && userId && item.userId !== userId && item.userId !== 'default_farmer') {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this item' });
    }

    inMemoryInventory.splice(idx, 1);
    return res.json({ success: true, message: 'Item deleted successfully', usingFallbackData: true });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/inventory/apply
 * Record application of fertilizer or pesticide:
 * Strictly validates quantity_used > 0, performs atomic stock decrement, updates status, and logs application
 */
router.post('/inventory/apply', requireAuth, async (req, res) => {
  try {
    const { 
      product_id, itemId, id,
      crop, 
      field, 
      quantity_used, usedQuantity,
      target_nutrient_or_pest, 
      notes 
    } = req.body || {};

    const targetId = product_id || itemId || id;
    const rawQty = quantity_used !== undefined ? quantity_used : usedQuantity;
    const userId = req.user?.sub;
    const isOfficer = req.user?.role === 'officer';

    if (!targetId || !crop || rawQty === undefined) {
      return res.status(400).json({ success: false, message: 'Product ID, crop, and quantity used are required.' });
    }

    const usedNum = Number(rawQty);
    if (isNaN(usedNum) || usedNum <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity used must be a positive number greater than 0.' });
    }

    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(targetId)) {
        return res.status(404).json({ success: false, message: 'Inventory product not found' });
      }

      const query = { _id: targetId };
      if (!isOfficer && userId) {
        query.$or = [{ userId }, { userId: 'default_farmer' }];
      }

      const targetItem = await Inventory.findOne(query);
      if (!targetItem) {
        return res.status(404).json({ success: false, message: 'Inventory product not found' });
      }

      if (Number(targetItem.quantity) < usedNum) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock: requested ${usedNum} ${targetItem.unit || 'units'}, but only ${targetItem.quantity} remaining.`
        });
      }

      const newQty = Number(targetItem.quantity) - usedNum;
      const newStatus = calculateStatus(newQty, targetItem.expiry_date);

      const updatedDoc = await Inventory.findOneAndUpdate(
        { _id: targetId, quantity: { $gte: usedNum } },
        { $inc: { quantity: -usedNum }, $set: { status: newStatus } },
        { new: true }
      );

      if (!updatedDoc) {
        return res.status(400).json({
          success: false,
          message: 'Failed to apply stock: concurrent update conflict or insufficient inventory.'
        });
      }

      const logData = {
        userId,
        date: new Date(),
        crop,
        field: field || 'Main Registered Field',
        product_id: targetId,
        product_name: updatedDoc.name,
        category: updatedDoc.category,
        quantity_used: usedNum,
        unit: updatedDoc.unit,
        target_nutrient_or_pest: target_nutrient_or_pest || 'Field Application',
        notes: notes || ''
      };

      const logEntry = await ApplicationLog.create(logData);

      return res.json({
        success: true,
        message: `Recorded application of ${usedNum} ${updatedDoc.unit} of ${updatedDoc.name}`,
        updatedItem: updatedDoc,
        log: logEntry
      });
    }

    // Offline fallback
    const targetItem = inMemoryInventory.find(i => i._id === targetId);
    if (!targetItem) {
      return res.status(404).json({ success: false, message: 'Inventory product not found' });
    }

    if (Number(targetItem.quantity) < usedNum) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock: requested ${usedNum} ${targetItem.unit || 'units'}, but only ${targetItem.quantity} remaining.`
      });
    }

    const newQty = Number(targetItem.quantity) - usedNum;
    const newStatus = calculateStatus(newQty, targetItem.expiry_date);
    targetItem.quantity = newQty;
    targetItem.status = newStatus;

    const logEntry = {
      _id: 'log_' + Date.now(),
      userId,
      date: new Date().toISOString().split('T')[0],
      crop,
      field: field || 'Main Registered Field',
      product_id: targetId,
      product_name: targetItem.name,
      category: targetItem.category,
      quantity_used: usedNum,
      unit: targetItem.unit,
      target_nutrient_or_pest: target_nutrient_or_pest || 'Field Application',
      notes: notes || ''
    };
    inMemoryLogs.unshift(logEntry);

    return res.json({
      success: true,
      message: `Recorded application of ${usedNum} ${targetItem.unit} of ${targetItem.name}`,
      updatedItem: { ...targetItem },
      log: logEntry,
      usingFallbackData: true
    });
  } catch (error) {
    console.error('Error applying inventory:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/inventory/logs
 * Fetch application logs scoped to user
 */
router.get('/inventory/logs', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.sub;
    const isOfficer = req.user?.role === 'officer';

    if (mongoose.connection.readyState === 1) {
      const query = (!isOfficer && userId) ? { $or: [{ userId }, { userId: 'default_farmer' }] } : {};
      const logs = await ApplicationLog.find(query).sort({ date: -1 });
      return res.json({ success: true, count: logs.length, logs });
    }

    // Offline fallback
    let logs = inMemoryLogs;
    if (!isOfficer && userId) {
      logs = logs.filter(l => l.userId === userId || l.userId === 'default_farmer');
    }
    return res.json({ success: true, count: logs.length, logs, usingFallbackData: true });
  } catch (error) {
    console.error('Error fetching inventory logs:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
