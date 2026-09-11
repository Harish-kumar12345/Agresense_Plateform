require('dotenv').config();
const express = require('express');
const officerRouter = require('./src/routes/officer');
const axios = require('axios');

console.log('--- Testing Officer / Admin Dashboard API Endpoint ---');

const app = express();
app.use(express.json());
app.use('/api/officer', officerRouter);

const server = app.listen(3099, async () => {
  console.log('Test officer server running on port 3099');

  try {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ sub: 'officer-test-id', role: 'officer' }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
    console.log('✅ Valid JWT Officer Token Generated:', token.substring(0, 25) + '...');

    // 2. Fetch Farms Overview Test
    console.log('\n2. Testing Authenticated GET /api/officer/farms-overview...');
    const overviewRes = await axios.get('http://localhost:3099/api/officer/farms-overview', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ GET /api/officer/farms-overview Status:', overviewRes.status);
    console.log('✅ Regional Metrics Aggregated:', overviewRes.data.metrics);
    console.log(`✅ Total Monitored Farms Returned: ${overviewRes.data.farms.length} plots`);
    console.log('✅ Sample Monitored Farm Telemetry:', {
      farm_name: overviewRes.data.farms[0].farm_name,
      farmer_name: overviewRes.data.farms[0].farmer_name,
      crop: overviewRes.data.farms[0].crop,
      risk_level: overviewRes.data.farms[0].risk_level,
      predicted_yield_tha: overviewRes.data.farms[0].predicted_yield_tha
    });

    console.log('\n🎉 ALL OFFICER / ADMIN DASHBOARD BACKEND API TESTS PASSED VERIFICATION!');
  } catch (err) {
    console.error('❌ Officer API test failed:', err.response?.data || err.message);
  } finally {
    server.close();
  }
});
