/**
 * AgriSense Complete Verification Suite
 * Automated tests covering security, role authorization, error handling, and API validations.
 */
const axios = require('axios');
const jwt = require('jsonwebtoken');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET not found in .env');
  process.exit(1);
}

// Generate test tokens
const farmerToken = jwt.sign(
  { id: '507f1f77bcf86cd799439011', role: 'farmer', name: 'Test Farmer' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const officerToken = jwt.sign(
  { id: '507f1f77bcf86cd799439012', role: 'officer', name: 'Test Officer', isVerified: true },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const unverifiedOfficerToken = jwt.sign(
  { id: '507f1f77bcf86cd799439013', role: 'officer', name: 'Pending Officer', isVerified: false },
  JWT_SECRET,
  { expiresIn: '1h' }
);

let passed = 0;
let failed = 0;

async function assertTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Reason: ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting AgriSense Complete Verification Suite`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  console.log(`--- [1. AUTH & ROLE ACCESS CONTROL] ---`);

  await assertTest('Missing Authorization header returns 401 UNAUTHORIZED', async () => {
    try {
      await axios.get(`${BASE_URL}/api/officer/farms-overview`);
      throw new Error('Expected 401 but request succeeded');
    } catch (err) {
      if (!err.response) throw err;
      if (err.response.status !== 401) {
        throw new Error(`Expected HTTP 401, got ${err.response.status}`);
      }
      if (err.response.data?.code !== 'UNAUTHORIZED') {
        throw new Error(`Expected error code UNAUTHORIZED, got ${err.response.data?.code}`);
      }
    }
  });

  await assertTest('Farmer role accessing officer route is blocked with 403 FORBIDDEN_ROLE', async () => {
    try {
      await axios.get(`${BASE_URL}/api/officer/farms-overview`, {
        headers: { Authorization: `Bearer ${farmerToken}` }
      });
      throw new Error('Expected 403 but request succeeded');
    } catch (err) {
      if (!err.response) throw err;
      if (err.response.status !== 403) {
        throw new Error(`Expected HTTP 403, got ${err.response.status}`);
      }
      if (err.response.data?.code !== 'FORBIDDEN_ROLE') {
        throw new Error(`Expected error code FORBIDDEN_ROLE, got ${err.response.data?.code}`);
      }
    }
  });

  await assertTest('Unverified officer role is blocked with 403 OFFICER_PENDING', async () => {
    try {
      await axios.get(`${BASE_URL}/api/officer/farms-overview`, {
        headers: { Authorization: `Bearer ${unverifiedOfficerToken}` }
      });
      throw new Error('Expected 403 but request succeeded');
    } catch (err) {
      if (!err.response) throw err;
      if (err.response.status !== 403) {
        throw new Error(`Expected HTTP 403, got ${err.response.status}`);
      }
      if (err.response.data?.code !== 'OFFICER_PENDING') {
        throw new Error(`Expected error code OFFICER_PENDING, got ${err.response.data?.code}`);
      }
    }
  });

  await assertTest('Officer role accessing officer route succeeds (HTTP 200)', async () => {
    const res = await axios.get(`${BASE_URL}/api/officer/farms-overview`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200, got ${res.status}`);
    }
    if (!res.data || !res.data.success) {
      throw new Error(`Expected success: true in response`);
    }
  });

  console.log(`\n--- [2. SERVER ERROR HANDLING & 404 ROUTING] ---`);

  await assertTest('Nonexistent API route returns structured JSON 404 (not HTML)', async () => {
    try {
      await axios.get(`${BASE_URL}/api/non-existent-audit-route-9876`);
      throw new Error('Expected 404 but request succeeded');
    } catch (err) {
      if (!err.response) throw err;
      if (err.response.status !== 404) {
        throw new Error(`Expected HTTP 404, got ${err.response.status}`);
      }
      if (!err.response.data?.error?.includes('Route not found')) {
        throw new Error(`Expected error message containing 'Route not found', got: ${JSON.stringify(err.response.data)}`);
      }
    }
  });

  console.log(`\n--- [3. OFFICER CONTROLLER CAST ERROR HARDENING] ---`);

  await assertTest('Malformed ObjectId in query param returns 400 (not 500 CastError)', async () => {
    try {
      await axios.put(`${BASE_URL}/api/officer/queries/not-a-valid-mongo-id-123/resolve`, 
        { resolution: 'Official advisory test resolution.' },
        { headers: { Authorization: `Bearer ${officerToken}` } }
      );
      throw new Error('Expected 400 but request succeeded');
    } catch (err) {
      if (!err.response) throw err;
      if (err.response.status !== 400) {
        throw new Error(`Expected HTTP 400, got ${err.response.status}`);
      }
      const msg = err.response.data?.error || err.response.data?.message || '';
      if (!msg.includes('Invalid query ID format')) {
        throw new Error(`Expected 'Invalid query ID format' message, got: ${JSON.stringify(err.response.data)}`);
      }
    }
  });

  console.log(`\n--- [4. HARVEST MANAGEMENT VALIDATION] ---`);

  await assertTest('Negative area_hectares in harvest record creation is rejected (400)', async () => {
    try {
      await axios.post(`${BASE_URL}/api/harvest-management`, {
        crop: 'Rice',
        field_name: 'Plot A',
        sowing_date: '2026-06-01',
        area_hectares: -5.0
      });
      throw new Error('Expected 400 but request succeeded');
    } catch (err) {
      if (!err.response) throw err;
      if (err.response.status !== 400) {
        throw new Error(`Expected HTTP 400, got ${err.response.status}`);
      }
    }
  });

  console.log(`\n--- [5. INVENTORY ATOMIC QUANTITY & VALIDATION] ---`);

  await assertTest('Negative usedQuantity in inventory application is rejected (400)', async () => {
    try {
      await axios.post(`${BASE_URL}/api/inventory/apply`, {
        itemId: '507f1f77bcf86cd799439099',
        usedQuantity: -10,
        activityType: 'fertilizer'
      });
      throw new Error('Expected 400 but request succeeded');
    } catch (err) {
      if (!err.response) throw err;
      if (err.response.status !== 400) {
        throw new Error(`Expected HTTP 400, got ${err.response.status}`);
      }
    }
  });

  await assertTest('Non-existent or zero-quantity item rejection prevents negative inventory', async () => {
    try {
      await axios.post(`${BASE_URL}/api/inventory/apply`, {
        itemId: '507f1f77bcf86cd799439099',
        usedQuantity: 999999,
        activityType: 'fertilizer'
      });
      throw new Error('Expected 404 or 400 but request succeeded');
    } catch (err) {
      if (!err.response) throw err;
      if (err.response.status !== 400 && err.response.status !== 404) {
        throw new Error(`Expected HTTP 400 or 404, got ${err.response.status}`);
      }
    }
  });

  console.log(`\n--- [6. YIELD PREDICTION VALIDATION] ---`);

  await assertTest('Yield prediction rejects negative or zero farm_area_ha (400)', async () => {
    try {
      await axios.post(`${BASE_URL}/api/ml/predict-yield-auto`, {
        crop: 'Rice',
        season: 'Kharif',
        farm_area_ha: -2.5,
        latitude: 28.6,
        longitude: 77.4
      });
      throw new Error('Expected 400 but request succeeded');
    } catch (err) {
      if (!err.response) throw err;
      if (err.response.status !== 400) {
        throw new Error(`Expected HTTP 400, got ${err.response.status}`);
      }
    }
  });

  console.log(`\n======================================================`);
  console.log(`🏁 VERIFICATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
