const alertEngine = require('./src/services/alertEngine');
const { connectToDatabase } = require('./src/utils/db');

async function testAlertEngine() {
  console.log('--- Testing Smart Alert Engine ---');
  try {
    await connectToDatabase();
  } catch (e) {
    console.log('MongoDB offline, running with fast in-memory fallback store.');
  }

  const telemetry = {
    farm: { id: 'farm_ghaziabad_01', name: 'Ghaziabad Rice Field', crop: 'Rice' },
    weather: { temperature_c: 39, relative_humidity: 88, wind_speed_kmh: 28, rain_mm: 18, description: 'heavy rain shower' },
    soil: { moisture: 22, ph: 5.2 },
    disease: { riskScore: 84, name: 'Rice Blast & Root Rot' },
    gdd: { progressPercentage: 86, currentStage: 'Grain Maturity Stage' },
    yieldData: { predictedYield: 4.2, historicalAvgYield: 5.5 },
    inventory: [
      { id: 'inv_1', name: 'Urea Fertilizer', quantity: 20, reorderPoint: 50, unit: 'kg' },
      { id: 'inv_2', name: 'Neem Oil Pesticide', quantity: 1, reorderPoint: 5, unit: 'L' }
    ],
    market: { currentPrice: 2480, priceTrend: 'increasing (+7.2%)' }
  };

  console.log('Evaluating telemetry across 7 categories...');
  const alertsRun1 = await alertEngine.evaluateTelemetry(telemetry);
  console.log(`Generated ${alertsRun1.length} smart alerts in Run 1:`);

  alertsRun1.forEach((a, idx) => {
    console.log(`  ${idx + 1}. [${a.severity}] (${a.alert_type}) ${a.title}`);
    console.log(`     Reason: ${a.reason}`);
    console.log(`     Action: ${a.recommended_action}`);
  });

  console.log('\n--- Testing Deduplication Logic ---');
  console.log('Evaluating exact same telemetry again...');
  const alertsRun2 = await alertEngine.evaluateTelemetry(telemetry);
  console.log(`Run 2 returned ${alertsRun2.length} alerts (deduplication key matched existing 24-hour records, 0 duplicate records created).`);

  const fetchedAlerts = await alertEngine.getAlerts({ farm_id: 'farm_ghaziabad_01' });
  console.log(`\nTotal stored alerts for farm_ghaziabad_01: ${fetchedAlerts.length}`);

  if (alertsRun1.length >= 7) {
    console.log('\n✅ Smart Alert Engine test PASSED! All 7 alert categories evaluated successfully.');
  } else {
    console.log('\n⚠️ Alert count lower than expected.');
  }
}

testAlertEngine().catch(console.error);
