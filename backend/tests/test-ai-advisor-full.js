require('dotenv').config();
const express = require('express');
const queryRouter = require('./src/routes/query');
const { generateChatResponse } = require('./src/services/aiService');

console.log('--- Testing Full AI Advisor & Gemini API Flow ---');

const app = express();
app.use(express.json());
app.use('/api/query', queryRouter);

const server = app.listen(3097, async () => {
  console.log('Test server running on port 3097');
  const axios = require('axios');

  try {
    const farmContext = {
      location: 'Palakkad, Kerala',
      crop: 'Rice (Ponni)',
      area_hectares: 2.0,
      temperature_c: 31,
      rainfall_mm: 5,
      humidity: 68,
      soil_moisture: 42,
      ph: 6.8,
      nitrogen: 50,
      phosphorus: 35,
      potassium: 30,
      current_gdd: 1520,
      predicted_yield_tha: 5.2,
      disease_risk: 'Low fungal risk',
      growth_stage: 'Flowering / Grain Filling',
      harvest_window: 'Nov 5 - Nov 20',
      fertilizer_stock: 'Urea (100 kg), NPK (150 kg)'
    };

    console.log('\n1. Testing direct generateChatResponse with full farm context...');
    const directResponse = await generateChatResponse('What fertilizer schedule should I follow right now?', farmContext);
    console.log('✅ Direct Gemini Response:\n', directResponse);

    console.log('\n2. Testing REST POST /api/query endpoint with full farm context...');
    const postRes = await axios.post('http://localhost:3097/api/query', {
      text: 'How should I manage my irrigation based on my soil moisture and temperature?',
      farmContext
    });

    console.log('✅ POST /api/query Status:', postRes.status);
    console.log('✅ REST AI Response Payload:\n', postRes.data.response);

    console.log('\n🎉 ALL AI ADVISOR & GEMINI API INTEGRATION TESTS PASSED VERIFICATION!');
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
  } finally {
    server.close();
  }
});
