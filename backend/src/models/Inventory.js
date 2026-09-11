const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  userId: {
    type: String,
    index: true,
    default: 'default_farmer'
  },
  farmId: {
    type: String,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['Fertilizer', 'Pesticide'],
    required: true
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    default: 'kg'
  },
  purchase_date: {
    type: Date,
    default: Date.now
  },
  expiry_date: {
    type: Date
  },
  cost: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Available', 'Low Stock', 'Expired', 'Out of Stock'],
    default: 'Available'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Inventory', inventorySchema);
