const { Query } = require('../models/Query');
const { generateAIResponse } = require('../services/aiService');

async function createQuery(req, res) {
  try {
    const { userId, text, roomId, farmContext } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Valid text is required' });
    }

    let queryId = null;
    try {
      const query = await Query.create({ userId: userId || null, text: text.trim(), status: 'pending' });
      queryId = query._id;
    } catch (dbErr) {
      console.warn('Query DB log fallback:', dbErr.message);
    }

    const { generateChatResponse } = require('../services/aiService');
    const answer = await generateChatResponse(text.trim(), farmContext);

    if (queryId) {
      Query.findByIdAndUpdate(queryId, { response: answer, status: 'answered' }).catch(() => {});
    }

    res.status(200).json({ success: true, id: queryId, response: answer });
  } catch (err) {
    console.error('Error in createQuery:', err);
    res.status(500).json({ 
      error: 'failed to create query', 
      ...(process.env.NODE_ENV === 'production' ? {} : { message: err.message }) 
    });
  }
}

const mongoose = require('mongoose');

async function getResponseById(req, res) {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid query ID format' });
    }
    const query = await Query.findById(id);
    if (!query) return res.status(404).json({ error: 'Query not found' });
    res.json({ id: query._id, status: query.status, response: query.response });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch query response' });
  }
}

module.exports = { createQuery, getResponseById };


