require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testAvailableModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const candidateModels = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-pro-latest'
  ];

  for (const modelName of candidateModels) {
    try {
      console.log(`\nTesting model: "${modelName}"...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hello to a farmer in 5 words.');
      const response = await result.response;
      console.log(`🎉 SUCCESS with "${modelName}":`, response.text().trim());
      return modelName;
    } catch (err) {
      console.error(`❌ FAILED with "${modelName}":`, err.message);
    }
  }
}

testAvailableModels();
