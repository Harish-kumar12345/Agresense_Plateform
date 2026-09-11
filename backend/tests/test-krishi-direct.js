const express = require('express');
const krishiRouter = require('./src/routes/krishiSevaKendra');

console.log('--- Testing Krishi Seva Kendra Router Direct Execution ---');

const app = express();
app.use(express.json());
app.use('/api/krishi-seva-kendra', krishiRouter);

const server = app.listen(3099, async () => {
  console.log('Test server running on port 3099');
  const axios = require('axios');

  try {
    const getRes = await axios.get('http://localhost:3099/api/krishi-seva-kendra?latitude=10.0261&longitude=76.3105&category=ALL');
    console.log('✅ GET /api/krishi-seva-kendra status:', getRes.status, 'Centers Count:', getRes.data.count);

    const fertRes = await axios.get('http://localhost:3099/api/krishi-seva-kendra?latitude=10.0261&longitude=76.3105&category=FERTILIZER');
    console.log('✅ GET /api/krishi-seva-kendra (Category: FERTILIZER) status:', fertRes.status, 'Fertilizers Count:', fertRes.data.count);

    const districtRes = await axios.get('http://localhost:3099/api/krishi-seva-kendra/district/Ernakulam');
    console.log('✅ GET /api/krishi-seva-kendra/district/Ernakulam status:', districtRes.status, 'Centers Count:', districtRes.data.count);

    console.log('\n🎉 ALL KRISHI SEVA KENDRA BACKEND ENDPOINTS PASSED VERIFICATION!');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    server.close();
  }
});
