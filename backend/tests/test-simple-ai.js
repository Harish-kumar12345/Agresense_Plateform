require('dotenv').config();
const { generateChatResponse } = require('./src/services/aiService');

async function runTest() {
  console.log('Testing generateChatResponse...');
  const res = await generateChatResponse('What fertilizer should I apply for Rice at flowering stage?');
  console.log('--- GENERATED RESPONSE ---');
  console.log(res);
}

runTest();
