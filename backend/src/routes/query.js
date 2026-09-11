const express = require('express');
const router = express.Router();
const { createQuery, getResponseById } = require('../controllers/queryController');
const { optionalAuth } = require('../middleware/auth');

// POST /api/query - Create a new query (AI advisor)
router.post('/', optionalAuth, createQuery);

// GET /api/query/response/:id - Get response by ID  
router.get('/response/:id', optionalAuth, getResponseById);

module.exports = router;
