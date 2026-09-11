const express = require('express');
const cropPricesRouter = require('./src/routes/cropPrices');

console.log('--- Testing Crop Prices Router Direct Execution ---');

const app = express();
app.use(express.json());
app.use('/api/crop-prices', cropPricesRouter);

const server = app.listen(3098, async () => {
  console.log('Test server running on port 3098');
  const axios = require('axios');

  try {
    const getRes = await axios.get('http://localhost:3098/api/crop-prices?state=kerala&crop=Rice');
    console.log('✅ GET /api/crop-prices status:', getRes.status, 'Prices Count:', getRes.data.prices.length);

    const historyRes = await axios.get('http://localhost:3098/api/crop-prices/Rice/history?days=30');
    console.log('✅ GET /api/crop-prices/Rice/history status:', historyRes.status, 'Points:', historyRes.data.history.length);

    const compareRes = await axios.get('http://localhost:3098/api/crop-prices/compare/mandis?crop=Rice');
    console.log('✅ GET /api/crop-prices/compare/mandis status:', compareRes.status, 'Mandis Count:', compareRes.data.mandis.length);

    console.log('\n🎉 ALL CROP PRICE MODULE BACKEND ENDPOINTS PASSED VERIFICATION!');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    server.close();
  }
});
