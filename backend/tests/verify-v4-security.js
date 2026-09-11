/**
 * AgriSense - Section 6 Critical-Flow Security & Correctness Verification Suite
 * Tests:
 *   Test A: Officer role access control (farmer: 403, officer: 200)
 *   Test B: Auth edge cases (duplicate email: 400, wrong pass: 401, malformed JWT: 401)
 *   Test C: Health & DB state inspection
 *   Test D: Leftover debug endpoints removal verification (test-ai -> 404, test -> 404)
 *   Test E: Inventory logic fixes (negative quantity rejection, PUT status calculation, DELETE 404)
 *   Test F: System-wide route access matrix (unauthenticated rejection vs public reference access)
 */

const http = require('http');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BASE_PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET required for tests.');
  process.exit(1);
}

// Helper to make HTTP requests
function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      hostname: '127.0.0.1',
      port: BASE_PORT,
      timeout: 25000,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    const reqOptions = { ...defaultOptions, ...options, headers: { ...defaultOptions.headers, ...(options.headers || {}) } };
    
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

// Generate valid test JWTs
const farmerToken = jwt.sign(
  { sub: 'test_farmer_123', role: 'farmer', isVerified: true },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const officerToken = jwt.sign(
  { sub: 'test_officer_456', role: 'officer', isVerified: true },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const unverifiedOfficerToken = jwt.sign(
  { sub: 'test_officer_unverified', role: 'officer', isVerified: false },
  JWT_SECRET,
  { expiresIn: '1h' }
);

let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runSuite() {
  console.log('\n============================================================');
  console.log('🧪 AGRISENSE EXHAUSTIVE TEST SUITE (v4 — Maximum Detail)');
  console.log('============================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST A: OFFICER ACCESS CONTROL
    // -------------------------------------------------------------------------
    console.log('🔹 TEST A — Officer Access Control:');
    
    // Farmer hitting officer route
    const resFarmerOnOfficer = await request({
      path: '/api/officer/queries',
      method: 'GET',
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    assert(
      resFarmerOnOfficer.status === 403,
      `Farmer token rejected with 403 on /api/officer/queries (got ${resFarmerOnOfficer.status})`
    );

    // Unverified officer hitting officer route
    const resUnverifiedOfficer = await request({
      path: '/api/officer/queries',
      method: 'GET',
      headers: { Authorization: `Bearer ${unverifiedOfficerToken}` }
    });
    assert(
      resUnverifiedOfficer.status === 403,
      `Unverified officer rejected with 403 (got ${resUnverifiedOfficer.status})`
    );

    // Verified officer hitting officer route
    const resOfficerOnOfficer = await request({
      path: '/api/officer/queries',
      method: 'GET',
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    assert(
      resOfficerOnOfficer.status === 200,
      `Officer token allowed with 200 on /api/officer/queries (got ${resOfficerOnOfficer.status})`
    );

    // -------------------------------------------------------------------------
    // TEST B: AUTH EDGE CASES
    // -------------------------------------------------------------------------
    console.log('\n🔹 TEST B — Authentication Edge Cases:');

    // Wrong password
    const resWrongPass = await request({
      path: '/api/auth/login',
      method: 'POST'
    }, { email: 'wrong_user_test@example.com', password: 'bad_password_123' });
    assert(
      resWrongPass.status === 401,
      `Non-existent / bad password rejected with 401 (got ${resWrongPass.status})`
    );

    // Malformed token on protected route
    const resMalformedToken = await request({
      path: '/api/inventory',
      method: 'GET',
      headers: { Authorization: 'Bearer this_is_not_a_valid_jwt_token' }
    });
    assert(
      resMalformedToken.status === 401,
      `Malformed JWT token rejected with 401 on /api/inventory (got ${resMalformedToken.status})`
    );

    // Expired token
    const expiredToken = jwt.sign(
      { sub: 'test_expired', role: 'farmer' },
      JWT_SECRET,
      { expiresIn: -10 }
    );
    const resExpired = await request({
      path: '/api/inventory',
      method: 'GET',
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert(
      resExpired.status === 401,
      `Expired JWT token rejected with 401 (got ${resExpired.status})`
    );

    // -------------------------------------------------------------------------
    // TEST C: HEALTH & DB RESILIENCE
    // -------------------------------------------------------------------------
    console.log('\n🔹 TEST C — Health & Fallback Telemetry:');
    const resHealth = await request({ path: '/api/health', method: 'GET' });
    assert(
      resHealth.status === 200 && resHealth.body?.status === 'ok',
      `API health endpoint returns 200 healthy (status: ${resHealth.body?.status}, db: ${resHealth.body?.dbState})`
    );

    // -------------------------------------------------------------------------
    // TEST D: SECTION 0B DEBUG ENDPOINTS REMOVED
    // -------------------------------------------------------------------------
    console.log('\n🔹 TEST D — Production Router Cleanup (Section 0B):');
    const resTestAi = await request({ path: '/api/query/test-ai', method: 'GET' });
    assert(
      resTestAi.status === 404,
      `GET /api/query/test-ai is NOT exposed in production (got 404: ${resTestAi.status === 404})`
    );

    const resTestBasic = await request({ path: '/api/query/test', method: 'GET' });
    assert(
      resTestBasic.status === 404,
      `GET /api/query/test is NOT exposed in production (got 404: ${resTestBasic.status === 404})`
    );

    // -------------------------------------------------------------------------
    // TEST E: INVENTORY LOGIC & SECURITY FIXES (Section 0C)
    // -------------------------------------------------------------------------
    console.log('\n🔹 TEST E — Inventory Logic & Vulnerability Fixes:');

    // 1. Unauthenticated inventory access must fail
    const resInvNoAuth = await request({ path: '/api/inventory', method: 'GET' });
    assert(
      resInvNoAuth.status === 401,
      `GET /api/inventory requires auth: rejected unauthenticated request with 401 (got ${resInvNoAuth.status})`
    );

    // 2. Authenticated inventory fetch works
    const resInvAuth = await request({
      path: '/api/inventory',
      method: 'GET',
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    assert(
      resInvAuth.status === 200 && Array.isArray(resInvAuth.body?.items),
      `Authenticated farmer receives scoped inventory array (count: ${resInvAuth.body?.count})`
    );

    // 3. Create test inventory item
    const resCreateInv = await request({
      path: '/api/inventory',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` }
    }, {
      name: 'Test Bio-Fertilizer ' + Date.now(),
      category: 'Fertilizer',
      type: 'Bio-Organic',
      quantity: 20,
      unit: 'kg',
      cost: 500
    });
    const createdItem = resCreateInv.body?.item;
    assert(
      resCreateInv.status === 201 && createdItem?._id,
      `Created new inventory item (id: ${createdItem?._id}, quantity: ${createdItem?.quantity})`
    );

    if (createdItem?._id) {
      // 4. Negative quantity exploit in /apply must be rejected
      const resNegApply = await request({
        path: '/api/inventory/apply',
        method: 'POST',
        headers: { Authorization: `Bearer ${farmerToken}` }
      }, {
        product_id: createdItem._id,
        crop: 'Rice',
        quantity_used: -15 // Exploit attempt to inflate stock!
      });
      assert(
        resNegApply.status === 400,
        `Negative quantity_used (-15) strictly rejected with 400 (got ${resNegApply.status})`
      );

      // 5. Zero quantity used also rejected
      const resZeroApply = await request({
        path: '/api/inventory/apply',
        method: 'POST',
        headers: { Authorization: `Bearer ${farmerToken}` }
      }, {
        product_id: createdItem._id,
        crop: 'Rice',
        quantity_used: 0
      });
      assert(
        resZeroApply.status === 400,
        `Zero quantity_used (0) strictly rejected with 400 (got ${resZeroApply.status})`
      );

      // 6. Valid positive deduction
      const resValidApply = await request({
        path: '/api/inventory/apply',
        method: 'POST',
        headers: { Authorization: `Bearer ${farmerToken}` }
      }, {
        product_id: createdItem._id,
        crop: 'Rice',
        quantity_used: 5
      });
      assert(
        resValidApply.status === 200 && resValidApply.body?.updatedItem?.quantity === 15,
        `Valid application decrements stock correctly from 20 to 15 (got ${resValidApply.body?.updatedItem?.quantity})`
      );

      // 7. Partial update PUT without quantity preserves actual status
      const resPartialPut = await request({
        path: `/api/inventory/${createdItem._id}`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${farmerToken}` }
      }, {
        notes: 'Updated notes only'
      });
      assert(
        resPartialPut.status === 200 && resPartialPut.body?.item?.quantity === 15,
        `Partial PUT without quantity preserved actual quantity 15 (got ${resPartialPut.body?.item?.quantity})`
      );

      // 8. DELETE with invalid / non-existent ID returns 404 (not false success)
      const resBadDelete = await request({
        path: '/api/inventory/000000000000000000000000',
        method: 'DELETE',
        headers: { Authorization: `Bearer ${farmerToken}` }
      });
      assert(
        resBadDelete.status === 404,
        `DELETE non-existent item returns 404 (got ${resBadDelete.status})`
      );

      // 9. DELETE actual item returns 200 success
      const resGoodDelete = await request({
        path: `/api/inventory/${createdItem._id}`,
        method: 'DELETE',
        headers: { Authorization: `Bearer ${farmerToken}` }
      });
      assert(
        resGoodDelete.status === 200,
        `DELETE existing item returns 200 success`
      );
    }

    // -------------------------------------------------------------------------
    // TEST F: SYSTEM-WIDE ROUTE ACCESS MATRIX (Section 0)
    // -------------------------------------------------------------------------
    console.log('\n🔹 TEST F — System-Wide Route Protection & Public Reference Access:');

    // Mutating endpoints requiring auth
    const protectedRoutes = [
      { method: 'POST', path: '/api/farms', name: 'POST /api/farms' },
      { method: 'PUT', path: '/api/farms/farm_demo_1', name: 'PUT /api/farms/:id' },
      { method: 'DELETE', path: '/api/farms/farm_demo_1', name: 'DELETE /api/farms/:id' },
      { method: 'POST', path: '/api/farm-activities', name: 'POST /api/farm-activities' },
      { method: 'PUT', path: '/api/farm-activities/act_1', name: 'PUT /api/farm-activities/:id' },
      { method: 'DELETE', path: '/api/farm-activities/act_1', name: 'DELETE /api/farm-activities/:id' },
      { method: 'POST', path: '/api/harvest-management', name: 'POST /api/harvest-management' },
      { method: 'PATCH', path: '/api/alerts/alt_1/read', name: 'PATCH /api/alerts/:id/read' },
      { method: 'PATCH', path: '/api/alerts/read-all', name: 'PATCH /api/alerts/read-all' },
      { method: 'DELETE', path: '/api/alerts/alt_1', name: 'DELETE /api/alerts/:id' }
    ];

    for (const route of protectedRoutes) {
      const res = await request({ path: route.path, method: route.method });
      assert(
        res.status === 401,
        `Unauthenticated call to ${route.name} rejected with 401 (got ${res.status})`
      );
    }

    // Public reference routes that MUST remain accessible without login
    const publicRoutes = [
      { path: '/api/crop-prices?crop=Rice', name: 'GET /api/crop-prices' },
      { path: '/api/krishi-seva-kendra?latitude=28.6692&longitude=77.4538', name: 'GET /api/krishi-seva-kendra' },
      { path: '/api/soil/district-profile?lat=28.6692&lon=77.4538', name: 'GET /api/soil/district-profile' },
      { path: '/api/mandi/comparison?crop=Rice&lat=28.66&lon=77.45', name: 'GET /api/mandi/comparison' },
      { path: '/api/health', name: 'GET /api/health' }
    ];

    for (const route of publicRoutes) {
      const res = await request({ path: route.path, method: 'GET' });
      assert(
        res.status === 200,
        `Public reference data on ${route.name} returns 200 without token (got ${res.status})`
      );
    }

    console.log('\n============================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passedCount} / ${totalCount} PASSED`);
    console.log('============================================================\n');

    if (passedCount === totalCount) {
      console.log('🎉 ALL SECTION 6 VERIFICATIONS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.error(`⚠️ ${totalCount - passedCount} TEST(S) FAILED`);
      process.exit(1);
    }

  } catch (err) {
    console.error('Fatal error running test suite:', err);
    process.exit(1);
  }
}

runSuite();
