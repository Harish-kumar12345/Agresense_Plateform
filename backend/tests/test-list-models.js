require('dotenv').config();
const axios = require('axios');

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('API Key present:', !!apiKey);

  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    console.log('Available models:', res.data.models.map(m => m.name));
  } catch (err) {
    console.error('List models error:', err.response?.data || err.message);
  }
}

listModels();
