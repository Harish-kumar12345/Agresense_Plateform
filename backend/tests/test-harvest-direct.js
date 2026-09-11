const express = require('express');
const harvestRouter = require('./src/routes/harvestManagement');

console.log('--- Testing Harvest Management Express Router ---');

const app = express();
app.use(express.json());
app.use('/api/harvest-management', harvestRouter);

// Start ephemeral server on port 3099
const server = app.listen(3099, async () => {
  console.log('Test server running on port 3099');
  const axios = require('axios');

  try {
    const getRes = await axios.get('http://localhost:3099/api/harvest-management');
    console.log('✅ GET /api/harvest-management status:', getRes.status, 'Count:', getRes.data.count);

    const postRes = await axios.post('http://localhost:3099/api/harvest-management', {
      farm_id: 'farm_test_101',
      field_name: 'Test Field Alpha',
      crop: 'Rice',
      area_hectares: 2.5,
      predicted_yield_tha: 4.8,
      expected_production_tons: 12.0,
      current_gdd: 1450,
      growth_stage: 'Ripening & Grain Filling',
      sowing_date: new Date().toISOString(),
      expected_harvest_date: new Date(Date.now() + 20 * 86400000).toISOString(),
      manual_harvest_date: new Date(Date.now() + 25 * 86400000).toISOString(),
      required_labour: 12,
      storage_requirement_sqft: 180,
      storage_bags_count: 240,
      storage_moisture_target_pct: 13.5
    });
    console.log('✅ POST /api/harvest-management status:', postRes.status, 'Success:', postRes.data.success);
    console.log('✅ Saved Record Manual Harvest Date:', postRes.data.data.manual_harvest_date);

    const alertsRes = await axios.get('http://localhost:3099/api/harvest-management/alerts');
    console.log('✅ GET /api/harvest-management/alerts status:', alertsRes.status, 'Alerts:', alertsRes.data.data.length);

    console.log('\n🎉 ALL BACKEND HARVEST MANAGEMENT ENDPOINTS PASSED VERIFICATION!');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    server.close();
  }
});
