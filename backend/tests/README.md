# AgriSense Test Suite Directory

This directory contains the automated test suite and developer diagnostic utilities for the AgriSense platform.

## Automated Verification Suite

Run all verification tests against the running backend server:
```bash
npm test
```
Or directly:
```bash
node tests/run-all-verifications.js
```

### Tests Covered in `run-all-verifications.js`:
1. **Authentication & Authorization**:
   - `401 UNAUTHORIZED` on missing token
   - `403 FORBIDDEN_ROLE` on unauthorized role access (farmer accessing officer endpoints)
   - `403 OFFICER_PENDING` on unapproved officer accounts
   - `200 OK` on verified officer tokens
2. **Server Routing & 404 Guarding**:
   - Structured JSON 404 response on unknown endpoints
3. **Database CastError Protection**:
   - Invalid MongoDB ObjectId format handling (returns `400 Bad Request` instead of `500 CastError`)
4. **Input Boundaries & Business Logic**:
   - Rejection of negative `area_hectares` in harvest management
   - Rejection of negative `usedQuantity` in inventory stock decrement
   - Rejection of excessive stock requests in inventory management
   - Rejection of non-positive `farm_area_ha` in yield prediction

---

## Ad-hoc Diagnostic Scripts (Manual Utilities)

The standalone scripts in this directory are manual diagnostic utilities used to test specific external integrations:
- `test-gemini-api.js`, `test-alternative-models.js`, `test-list-models.js`: Probe Gemini model availability and quotas.
- `test-huggingface-api.js`, `test-public-models.js`: Probe Hugging Face inference tokens.
- `test-krishi-api.js`, `test-krishi-direct.js`: Test OpenStreetMap Nominatim reverse geocoding and search.
- `test-crop-prices.js`, `test-prices-direct.js`: Test mandi price parsing and historical trends.
- `test-alerts-engine.js`: Test telemetry threshold evaluation.
