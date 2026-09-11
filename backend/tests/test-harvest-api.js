const axios = require('axios');

async function testHarvestAPI() {
  const API_BASE = 'http://localhost:3001/api';

  try {
    console.log('1. Testing GET /api/harvest-management...');
    const getRes = await axios.get(`${API_BASE}/harvest-management`);
    console.log('✅ GET Response:', getRes.data.success, `Count: ${getRes.data.count}`);

    console.log('\n2. Testing POST /api/harvest-management (Save Harvest Plan)...');
    const postRes = await axios.post(`${API_BASE}/harvest-management`, {
      farm_id: 'farm_demo_test',
      field_name: 'Test Rice Field',
      crop: 'Rice',
      area_hectares: 3.0,
      predicted_yield_tha: 5.2,
      expected_production_tons: 15.6,
      current_gdd: 1480,
      growth_stage: 'Ripening & Grain Filling',
      sowing_date: new Date(Date.now() - 70 * 86400000).toISOString(),
      expected_harvest_date: new Date(Date.now() + 15 * 86400000).toISOString(),
      manual_harvest_date: new Date(Date.now() + 18 * 86400000).toISOString(),
      harvest_window: 'Nov 01 - Nov 12, 2026',
      status: 'Approaching',
      required_labour: 15,
      storage_requirement_sqft: 234,
      storage_bags_count: 312,
      storage_moisture_target_pct: 13.5,
      notes: 'Automated test harvest record persistence'
    });
    console.log('✅ POST Response:', postRes.data.success, 'Message:', postRes.data.message);
    console.log('Persisted Data:', postRes.data.data.harvest_id, 'Manual Date:', postRes.data.data.manual_harvest_date);

    console.log('\n3. Testing GET /api/harvest-management/alerts...');
    const alertsRes = await axios.get(`${API_BASE}/harvest-management/alerts`);
    console.log('✅ Alerts Response:', alertsRes.data.success, `Alerts count: ${alertsRes.data.count}`);

    console.log('\n✨ All Harvest Management API tests passed successfully!');
  } catch (error) {
    console.error('❌ Harvest API Test Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testHarvestAPI();
