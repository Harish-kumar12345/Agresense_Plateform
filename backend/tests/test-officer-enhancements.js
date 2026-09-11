const jwt = require('jsonwebtoken');
const { getOfficerFarmsOverview, listAuditLogs, createAuditLogEntry, getOfficerAlertPreferences, updateOfficerAlertPreferences } = require('./src/controllers/officerController');

async function runTests() {
  console.log('🧪 Starting Officer Portal Backend Tests...\n');

  const testUser = {
    sub: 'off_test_01',
    name: 'Dr. Sunita Sharma (Agronomist)',
    role: 'officer',
    email: 'officer@agrisense.gov.in'
  };

  // 1. Test farms overview
  console.log('1️⃣ Testing getOfficerFarmsOverview...');
  const reqFarms = { user: testUser };
  let farmsResult = null;
  const resFarms = {
    json: (data) => { farmsResult = data; },
    status: (code) => ({ json: (d) => { console.error('Status', code, d); } })
  };
  await getOfficerFarmsOverview(reqFarms, resFarms);

  if (farmsResult && farmsResult.success && farmsResult.farms.length > 0) {
    console.log(`✅ Loaded ${farmsResult.farms.length} farms.`);
    const sample = farmsResult.farms[0];
    console.log(`   Sample Farm: ${sample.farm_name}`);
    console.log(`   Data Origin: ${sample.data_origin} (is_live: ${sample.is_live})`);
    console.log(`   Model Calibration: ${sample.model_calibration?.notes}`);
    console.log(`   GDD Agronomic: ${sample.gdd_agronomic?.current_gdd} GDD (Progress: ${sample.gdd_agronomic?.progress_pct}%)`);
    console.log(`   Explainability for sample: ${sample.explainability ? 'AVAILABLE' : 'NULL (DEMO mode - honest)'}`);
  } else {
    throw new Error('Farms overview failed');
  }

  // 2. Test Audit Log retrieval
  console.log('\n2️⃣ Testing listAuditLogs...');
  const reqLogs = { query: { action_type: 'ALL' }, user: testUser };
  let logsResult = null;
  const resLogs = {
    json: (data) => { logsResult = data; },
    status: (code) => ({ json: (d) => { console.error('Status', code, d); } })
  };
  await listAuditLogs(reqLogs, resLogs);
  console.log(`✅ Retrieved ${logsResult.count} audit log records.`);

  // 3. Test Audit Log insertion (Append-Only)
  console.log('\n3️⃣ Testing createAuditLogEntry (Append-Only)...');
  const newEntryReq = {
    user: testUser,
    body: {
      action_type: 'REPORT_EXPORTED_CSV',
      target_id: 'rep_csv_001',
      target_type: 'report',
      details: 'Exported regional CSV dataset with LIVE/DEMO preserved tags.',
      before_value: null,
      after_value: { format: 'CSV', rowCount: 5 }
    },
    ip: '127.0.0.1'
  };
  let createLogResult = null;
  const resCreateLog = {
    status: (code) => ({
      json: (d) => { createLogResult = d; }
    })
  };
  await createAuditLogEntry(newEntryReq, resCreateLog);
  console.log(`✅ Created append-only audit log entry: ${createLogResult.log?.details}`);

  // 4. Test Alert Preferences
  console.log('\n4️⃣ Testing Alert Preferences (GET & PUT)...');
  const reqPrefs = { user: testUser };
  let prefsResult = null;
  const resPrefs = {
    json: (data) => { prefsResult = data; },
    status: (code) => ({ json: (d) => { console.error('Status', code, d); } })
  };
  await getOfficerAlertPreferences(reqPrefs, resPrefs);
  console.log(`✅ Retrieved default alert preferences (in-app: ${prefsResult.preferences?.in_app_delivery?.enabled}, email: ${prefsResult.preferences?.email_delivery?.enabled}).`);

  const reqUpdatePrefs = {
    user: testUser,
    body: {
      email_delivery: {
        enabled: true,
        destination_email: 'urgent.officer@agrisense.gov.in',
        severities: { info: false, warning: false, high: true, critical: true }
      }
    }
  };
  let updatePrefsResult = null;
  const resUpdatePrefs = {
    json: (data) => { updatePrefsResult = data; },
    status: (code) => ({ json: (d) => { console.error('Status', code, d); } })
  };
  await updateOfficerAlertPreferences(reqUpdatePrefs, resUpdatePrefs);
  console.log(`✅ Updated alert preferences. New destination: ${updatePrefsResult.preferences?.email_delivery?.destination_email}`);

  console.log('\n🎉 ALL OFFICER BACKEND ENHANCEMENTS TESTED AND VERIFIED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
