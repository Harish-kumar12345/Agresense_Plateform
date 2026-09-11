const io = require('socket.io-client');

const SOCKET_URL = 'http://localhost:3001';

async function testChatScenario(scenarioName, payload, expectedKeywords, prohibitedKeywords) {
  return new Promise((resolve, reject) => {
    console.log(`\n======================================================`);
    console.log(`🧪 Running Scenario: ${scenarioName}`);
    console.log(`User Query: "${payload.text}"`);
    console.log(`Farm Context: Crop=${payload.farmContext?.crop}, Farm=${payload.farmContext?.farm_name}, Loc=${payload.farmContext?.location}`);
    console.log(`======================================================`);

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    const roomId = 'test_room_' + Math.random().toString(36).slice(2);
    let timeoutId;

    socket.on('connect', () => {
      socket.emit('join', { roomId });
    });

    socket.on('joined_room', () => {
      // Send user message
      socket.emit('user_message', {
        roomId,
        text: payload.text,
        userId: payload.userId || 'test_farmer_1',
        language: 'en',
        farmContext: payload.farmContext
      });

      timeoutId = setTimeout(() => {
        socket.disconnect();
        reject(new Error(`Timed out waiting for response in scenario: ${scenarioName}`));
      }, 30000);
    });

    socket.on('assistant_message', (data) => {
      clearTimeout(timeoutId);
      const text = data.text;
      console.log(`\n📥 AI Response received (${text.length} chars):`);
      console.log(text);

      const passedExpected = expectedKeywords.every(k => text.toLowerCase().includes(k.toLowerCase()));
      const failedProhibited = prohibitedKeywords.some(k => text.toLowerCase().includes(k.toLowerCase()));

      console.log(`\n--- Verification ---`);
      expectedKeywords.forEach(k => {
        const found = text.toLowerCase().includes(k.toLowerCase());
        console.log(`  ${found ? '✅' : '❌'} Expected keyword: "${k}" -> ${found ? 'FOUND' : 'MISSING'}`);
      });

      prohibitedKeywords.forEach(k => {
        const found = text.toLowerCase().includes(k.toLowerCase());
        console.log(`  ${!found ? '✅' : '❌'} Prohibited keyword: "${k}" -> ${found ? 'DETECTED (FAIL)' : 'ABSENT (PASS)'}`);
      });

      socket.disconnect();

      if (passedExpected && !failedProhibited) {
        console.log(`🎉 Scenario "${scenarioName}" PASSED!`);
        resolve(true);
      } else {
        console.error(`💥 Scenario "${scenarioName}" FAILED verification checks.`);
        resolve(false);
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timeoutId);
      socket.disconnect();
      reject(new Error(`Socket error: ${JSON.stringify(err)}`));
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting AI Chat Accuracy Test Suite against Live Backend...');
  
  // Scenario 1: Cotton farmer asking about their crop and farm details
  const s1 = await testChatScenario(
    'Cotton Farmer Context Accuracy',
    {
      text: 'What crop am I currently growing and what is my farm name according to your records?',
      farmContext: {
        farm_name: 'Gujarat Golden Bolls',
        crop: 'Cotton',
        location: 'Surat, Gujarat',
        soil_type: 'Black Cotton Soil',
        season: 'Kharif',
        area_hectares: 4.2
      }
    },
    ['Cotton', 'Gujarat Golden Bolls'], // Expected
    ['Rice', 'Green Valley']            // Prohibited
  );

  // Scenario 2: Wheat farmer asking for moisture and soil advice
  const s2 = await testChatScenario(
    'Wheat Farmer Soil Telemetry Accuracy',
    {
      text: 'Based on my current soil moisture and soil pH, what is your irrigation advice for my field?',
      farmContext: {
        farm_name: 'Ludhiana Harvest Plains',
        crop: 'Wheat',
        location: 'Ludhiana, Punjab',
        soil_type: 'Alluvial Soil',
        soil_moisture: 22,
        ph: 6.5,
        temperature_c: 24
      }
    },
    ['Wheat', '22%'],        // Expected
    ['Rice', 'Green Valley'] // Prohibited
  );

  console.log('\n======================================================');
  console.log(`SUMMARY: Scenario 1: ${s1 ? 'PASSED' : 'FAILED'} | Scenario 2: ${s2 ? 'PASSED' : 'FAILED'}`);
  console.log('======================================================');

  if (s1 && s2) {
    console.log('✅ ALL ACCURACY TESTS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
