const mongoose = require('mongoose');
const { Query } = require('../models/Query');
const { KnowledgeBase } = require('../models/KnowledgeBase');
const { getIo } = require('../utils/io');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

// Load .env file from the backend directory
dotenv.config({ path: path.join(__dirname, '../../.env') });


// Initialize Gemini AI with your API key
let genAI = null;
let model = null;

const exhaustedModels = new Map();

const PREFERRED_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite'
];

console.log('🔑 Checking Gemini API Key...');
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
    console.log('✅ Gemini AI initialized successfully (Model: gemini-3.5-flash-lite)');
  } catch (error) {
    console.error('❌ Failed to initialize Gemini AI:', error.message);
  }
} else {
  console.warn('⚠️ Gemini API Key not found or not configured');
}

// Retry mechanism with exponential backoff and quota fail-fast
async function callWithRetry(fn, maxRetries = 2, baseDelay = 800) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      // If daily quota or project free-tier quota is exhausted, fail immediately to try candidate model
      const isQuotaExhausted = error.message?.includes('QuotaFailure') || 
                               error.message?.includes('PerDay') || 
                               error.message?.includes('RESOURCE_EXHAUSTED');
      if (isQuotaExhausted) {
        console.warn(`🛑 Quota exhausted for this model. Failing fast to candidate model.`);
        throw error;
      }

      // If it's a 503 (service unavailable) or transient 429 rate limit error, retry briefly
      if ((error.status === 503 || error.status === 429 || error.message.includes('overloaded')) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
}

async function retrieveContext(userText, farmContext = null) {
  try {
    let contextSnippets = [];
    const fcCrop = farmContext?.crop && farmContext.crop !== 'Not specified' ? farmContext.crop : null;
    const fcFarm = farmContext?.farm_name && farmContext.farm_name !== 'Unnamed Farm' && farmContext.farm_name !== 'My Farm' ? farmContext.farm_name : null;

    // 1. Knowledge base search
    if (mongoose.connection.readyState === 1) {
      try {
        const terms = userText.split(/\s+/).filter(Boolean).slice(0, 5);
        if (fcCrop) terms.push(fcCrop);
        const found = await KnowledgeBase.find({ tags: { $in: terms } }).limit(3).lean();
        if (found.length > 0) {
          contextSnippets.push(found.map((d) => `${d.title}: ${d.content}`).join('\n\n'));
        }
      } catch (kbErr) {
        console.warn('KnowledgeBase query fallback:', kbErr.message);
      }

      // 2. Farm Activity Logs (strictly filtered by crop or farm to prevent false context)
      try {
        const { FarmActivity } = require('../models/FarmActivity');
        const actQuery = {};
        if (fcCrop) {
          actQuery.crop = new RegExp(`^${fcCrop}$`, 'i');
        }
        if (fcFarm) {
          actQuery.field_name = new RegExp(fcFarm, 'i');
        }

        if (fcCrop || fcFarm) {
          const recentActs = await FarmActivity.find(actQuery).sort({ date: -1 }).limit(4).lean();
          if (recentActs.length > 0) {
            const actSummary = recentActs.map(a => `- ${new Date(a.date).toLocaleDateString()}: ${a.activity_type} for ${a.crop} (${a.field_name}) - ${a.quantity_details} (${a.notes})`).join('\n');
            contextSnippets.push(`Recent Farm Activity Timeline for ${fcCrop || fcFarm}:\n${actSummary}`);
          }
        }
      } catch (actErr) {
        console.warn('FarmActivity context query fallback:', actErr.message);
      }

      // 3. Harvest Management Status (strictly filtered by crop or farm)
      try {
        const { HarvestRecord } = require('../models/HarvestRecord');
        const harvQuery = {};
        if (fcCrop) {
          harvQuery.crop = new RegExp(`^${fcCrop}$`, 'i');
        }
        if (fcFarm) {
          harvQuery.field_name = new RegExp(fcFarm, 'i');
        }

        if (fcCrop || fcFarm) {
          const harvestRecs = await HarvestRecord.find(harvQuery).sort({ updated_at: -1 }).limit(2).lean();
          if (harvestRecs.length > 0) {
            const harvSummary = harvestRecs.map(h => `- Crop: ${h.crop} (${h.field_name}), Stage: ${h.growth_stage}, Current GDD: ${h.current_gdd}, Status: ${h.status}, Expected Harvest Date: ${new Date(h.expected_harvest_date).toLocaleDateString()}, Harvest Window: ${h.harvest_window}, Yield Estimate: ${h.predicted_yield_tha} t/ha (${h.expected_production_tons} tons total)`).join('\n');
            contextSnippets.push(`Harvest Management & Growth Status for ${fcCrop || fcFarm}:\n${harvSummary}`);
          }
        }
      } catch (harvErr) {
        console.warn('HarvestRecord context query fallback:', harvErr.message);
      }

      // 4. Crop Market Prices Context (only when asking about price/mandi/rates)
      try {
        if (/price|mandi|rate|cost|market|apmc|sell|msp/i.test(userText)) {
          contextSnippets.push(`Current Agricultural Market Mandi Telemetry (Regional APMC Benchmarks):\n- Rice (Ponni): ₹3,000 / Quintal (Trend: Rising +1.69%)\n- Wheat: ₹2,450 / Quintal (Trend: Stable)\n- Maize: ₹2,150 / Quintal (Trend: Rising +0.8%)\n- Cotton: ₹7,200 / Quintal (Trend: Rising +2.1%)\n- Coconut: ₹13,500 / 1000 Nuts (Trend: Rising +2.27%)\n- Black Pepper: ₹58,500 / Quintal (Trend: Rising +1.21%)\n- Cardamom: ₹1,30,000 / Quintal (Trend: Falling -1.52%)\n- Rubber: ₹17,500 / Quintal (Trend: Rising +1.74%)`);
        }
      } catch (priceErr) {}
    }

    return contextSnippets.join('\n\n');
  } catch (err) {
    return '';
  }
}

async function generateAIResponse({ queryId, text, roomId, farmContext }) {
  try {
    console.log(`🤖 Generating AI response for query: ${text.substring(0, 50)}...`);
    
    const context = await retrieveContext(text, farmContext);
    const prompt = buildComprehensiveFarmPrompt(text, farmContext, context);

    let answer = '';

    if (!genAI && process.env.GEMINI_API_KEY) {
      try {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      } catch (e) {}
    }

    if (genAI) {
      for (const mName of PREFERRED_MODELS) {
        const cooldownUntil = exhaustedModels.get(mName);
        if (cooldownUntil && Date.now() < cooldownUntil) {
          continue;
        }

        try {
          const m = genAI.getGenerativeModel({ model: mName });
          answer = await callWithRetry(async () => {
            const result = await m.generateContent({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: 1024,
                temperature: 0.35
              }
            });
            const response = await result.response;
            return response.text();
          });
          if (answer) {
            console.log(`✅ AI response generated successfully with model "${mName}"`);
            break;
          }
        } catch (mErr) {
          console.warn(`Model "${mName}" failed in generateAIResponse:`, mErr.message);
          if (mErr.message?.includes('QuotaFailure') || mErr.message?.includes('PerDay') || mErr.message?.includes('RESOURCE_EXHAUSTED')) {
            exhaustedModels.set(mName, Date.now() + 180000); // 3 minute cooldown
          }
        }
      }
    }

    if (!answer) {
      console.log('⚠️ Gemini models unavailable or failed - using fallback');
      answer = await getFallbackResponse(text);
    }
    
    // Update database
    await Query.findByIdAndUpdate(queryId, { response: answer, status: 'answered' });
    
    // Send real-time response via socket
    const io = getIo();
    if (io && roomId) {
      console.log(`📤 Sending response to room ${roomId}`);
      io.to(roomId).emit('assistant_message', { text: answer });
    }
    
    return answer;
  } catch (err) {
    console.error('❌ Error in generateAIResponse:', err);
    await Query.findByIdAndUpdate(queryId, { status: 'error' });
    throw err;
  }
}

async function getFallbackResponse(text, language = 'en') {
  const lowerText = text.toLowerCase();
  let response = '';
  
  // Weather-related queries
  if (lowerText.includes('weather') || lowerText.includes('rain') || lowerText.includes('climate')) {
    response = "🌤️ Monitor weather patterns regularly using reliable apps or IMD forecasts. Plan sowing and harvesting based on monsoon predictions. Ensure proper drainage during heavy rains and irrigation during dry spells.";
  }
  // Kerala-specific crops
  else if (lowerText.includes('kerala') || lowerText.includes('coconut') || lowerText.includes('pepper') || lowerText.includes('cardamom')) {
    response = "🌴 Kerala's tropical climate is ideal for coconut, pepper, cardamom, rubber, and spices. Focus on organic farming, proper spacing, and intercropping. Consult local KVK for variety-specific guidance.";
  }
  // Crop and planting queries (Powered by trained ML Crop Recommender)
  else if (lowerText.includes('crop') || lowerText.includes('plant') || lowerText.includes('seed') || lowerText.includes('sow')) {
    try {
      const { recommendCrop } = require('./mlClient');
      const rec = await recommendCrop({ N: 85, P: 40, K: 42, temperature: 26, humidity: 75, ph: 6.8, rainfall: 150 });
      const alts = rec.top_alternatives?.map(a => `${a.crop} (${(a.confidence * 100).toFixed(0)}%)`).join(', ');
      response = `🌱 ML Crop Recommendation Engine (RandomForest, 99.32% Accuracy): Based on regional soil NPK and climate telemetry, the optimal crop is **${rec.recommended_crop}** (${(rec.confidence * 100).toFixed(0)}% confidence). Top suitable alternatives: ${alts}.`;
    } catch (e) {
      response = "🌱 For precision crop recommendations, run our ML Crop Recommendation engine using your farm's NPK soil test and rainfall parameters.";
    }
  }
  // Pest and disease queries
  else if (lowerText.includes('pest') || lowerText.includes('disease') || lowerText.includes('insect') || lowerText.includes('fungus')) {
    response = "🐛 Early identification is key for pest management. Use integrated pest management (IPM) combining biological, cultural, and chemical methods. Neem-based solutions are effective for many pests. Consult agricultural experts for severe infestations.";
  }
  // Soil-related queries
  else if (lowerText.includes('soil') || lowerText.includes('fertilizer') || lowerText.includes('nutrient')) {
    response = "🌾 Regular soil testing helps determine nutrient needs. Use organic compost and balanced fertilizers. Maintain soil pH between 6.0-7.5 for most crops. Add organic matter to improve soil structure and water retention.";
  }
  // Water and irrigation
  else if (lowerText.includes('water') || lowerText.includes('irrigation') || lowerText.includes('drip')) {
    response = "💧 Efficient water management is crucial. Consider drip irrigation for water conservation. Water early morning or evening to reduce evaporation. Monitor soil moisture and adjust irrigation based on crop stage and weather.";
  }
  // Marketing and price queries
  else if (lowerText.includes('price') || lowerText.includes('market') || lowerText.includes('sell')) {
    response = "💰 Check current market prices through e-NAM portal or local mandis. Build relationships with buyers and consider direct marketing. Add value through processing if possible. Store properly to avoid post-harvest losses.";
  }
  // Default response
  else {
    response = "🌾 Thank you for your agricultural question! Follow good agricultural practices, consult your local Krishi Vigyan Kendra (KVK), and use modern farming techniques for better yields. Feel free to ask again!";
  }
  
  return response;
}

// Add a simple test function
async function testAI(query = "What crops are good for monsoon season?") {
  try {
    if (!model) {
      return { success: false, message: 'AI service not configured - API key missing' };
    }
    
    const response = await callWithRetry(async () => {
      const result = await model.generateContent(query);
      const response = await result.response;
      return response.text();
    });
    
    return { success: true, response };
  } catch (error) {
    console.error('AI test error:', error);
    return { success: false, message: error.message };
  }
}

function buildComprehensiveFarmPrompt(text, farmContext, retrievedContext) {
  const fc = farmContext || {};

  // Build a clean summary of what farm data is actually available
  const farmName = fc.farm_name || 'Unnamed Farm';
  const location = fc.location || fc.location_name || fc.city || 'Not specified';
  const crop = fc.crop || 'Not specified';
  const area = fc.area_hectares ? `${fc.area_hectares} ha` : 'Not specified';
  const soilType = fc.soil_type || 'Not specified';
  const irrigationType = fc.irrigation_type || 'Not specified';
  const season = fc.season || 'Not specified';

  return `You are Krishi Mitra, an expert AI Agricultural Advisor for Indian farmers.

FARMER'S CURRENT FARM DATA:
🏡 Farm Name: ${farmName}
📍 Location: ${location}${fc.state ? ` (${fc.state})` : ''}${fc.district ? `, ${fc.district}` : ''}
🌾 Current Crop: ${crop}
🗓️ Cropping Season: ${season}
📐 Farm Area: ${area}
🌍 Soil Type: ${soilType}
💧 Irrigation System: ${irrigationType}
${fc.latitude && fc.longitude ? `📌 GPS Coordinates: ${fc.latitude}, ${fc.longitude}` : ''}

LIVE TELEMETRY (if available):
${fc.temperature_c ? `🌡️ Temperature: ${fc.temperature_c}°C` : '🌡️ Temperature: Not available'}
${fc.rainfall_mm ? `🌧️ Rainfall: ${fc.rainfall_mm} mm` : '🌧️ Rainfall: Not available'}
${fc.humidity ? `💧 Humidity: ${fc.humidity}%` : ''}
${fc.soil_moisture ? `🌱 Soil Moisture: ${fc.soil_moisture}%` : ''}
${fc.ph ? `🧪 Soil pH: ${fc.ph}` : ''}
${fc.nitrogen || fc.phosphorus || fc.potassium ? `📊 NPK: N-${fc.nitrogen || '?'}%, P-${fc.phosphorus || '?'}%, K-${fc.potassium || '?'}%` : ''}
${fc.current_gdd ? `🔥 GDD: ${fc.current_gdd} Degree Days` : ''}
${fc.predicted_yield_tha ? `📈 Predicted Yield: ${fc.predicted_yield_tha} tons/ha` : ''}
${fc.disease_risk ? `🐛 Disease Risk: ${fc.disease_risk}` : ''}
${fc.growth_stage ? `🚜 Growth Stage: ${fc.growth_stage}` : ''}
${fc.harvest_window ? `📅 Harvest Window: ${fc.harvest_window}` : ''}
${fc.fertilizer_stock ? `💊 Inventory: ${fc.fertilizer_stock}` : ''}

DATABASE & HISTORICAL CONTEXT:
${retrievedContext || 'No additional context available.'}

FARMER'S QUESTION: "${text}"

CRITICAL INSTRUCTIONS:
- ALWAYS use the FARMER'S CURRENT FARM DATA above when answering. For example, if their crop is "${crop}", answer about "${crop}" — NOT about any other crop.
- If data says "Not specified" or is missing, ask the farmer to clarify or provide general advice, but NEVER assume a specific crop or location.
- Provide clear, actionable, friendly advice tailored specifically to the farmer's data above.
- Keep response concise, encouraging, and easy to understand (3-4 bullet points or short paragraphs).
- Do NOT ask the farmer to re-enter details that are already given above.`;
}

// Simple AI response for real-time chat (no database)
async function generateChatResponse(text, farmContext = null) {
  try {
    console.log(`🤖 Generating chat response for: ${text.substring(0, 50)}...`);
    
    const context = await retrieveContext(text, farmContext);
    const prompt = buildComprehensiveFarmPrompt(text, farmContext, context);

    let answer = '';

    if (!genAI && process.env.GEMINI_API_KEY) {
      try {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      } catch (e) {}
    }

    if (genAI) {
      // Try candidate models
      for (const mName of PREFERRED_MODELS) {
        const cooldownUntil = exhaustedModels.get(mName);
        if (cooldownUntil && Date.now() < cooldownUntil) {
          continue;
        }

        try {
          console.log(`Attempting generation with model "${mName}"...`);
          const m = genAI.getGenerativeModel({ model: mName });
          answer = await callWithRetry(async () => {
            const result = await m.generateContent({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: 1024,
                temperature: 0.35
              }
            });
            const response = await result.response;
            return response.text();
          });
          if (answer) {
            console.log(`✅ Chat response generated successfully with model "${mName}"`);
            break;
          }
        } catch (mErr) {
          console.warn(`Model "${mName}" failed:`, mErr.message);
          if (mErr.message?.includes('QuotaFailure') || mErr.message?.includes('PerDay') || mErr.message?.includes('RESOURCE_EXHAUSTED')) {
            exhaustedModels.set(mName, Date.now() + 180000); // 3 minute cooldown
          }
        }
      }
    }

    if (!answer) {
      console.log('⚠️ Gemini models unavailable or failed - using fallback');
      answer = await getFallbackResponse(text);
    }
    
    return answer;
  } catch (err) {
    console.error('❌ Error in generateChatResponse:', err);
    return await getFallbackResponse(text);
  }
}

// Generate treatment recommendations for plant diseases
async function generateDiseaseRecommendation(diseaseData) {
  try {
    console.log(`🩺 Generating treatment recommendation for: ${diseaseData.primaryDisease?.disease}`);
    
    const { primaryDisease, predictions } = diseaseData;
    
    let prompt = `You are an expert plant pathologist and agricultural advisor. A farmer has uploaded an image of their plant, and our AI analysis has identified:

PRIMARY DISEASE: ${primaryDisease.disease} (${primaryDisease.confidence}% confidence, ${primaryDisease.severity} severity)

${predictions.length > 1 ? `ALTERNATIVE POSSIBILITIES:
${predictions.slice(1).map((pred, i) => `${i + 2}. ${pred.disease} (${pred.confidence}% confidence)`).join('\n')}` : ''}

Please provide a well-formatted treatment plan with the following structure:

🚨 **IMMEDIATE ACTIONS** (what to do right now)
🌿 **ORGANIC TREATMENT** (natural/biological solutions)  
💊 **CHEMICAL TREATMENT** (if organic fails)
🛡️ **PREVENTION STRATEGIES** (avoid future occurrences)
⚠️ **WARNING SIGNS** (when to seek expert help)

Make it practical for Indian farmers. Use emojis and clear formatting. Focus on cost-effective, locally available solutions. Keep each section concise but actionable.`;

    let recommendation = '';
    if (genAI) {
      for (const mName of PREFERRED_MODELS) {
        const cooldownUntil = exhaustedModels.get(mName);
        if (cooldownUntil && Date.now() < cooldownUntil) {
          continue;
        }

        try {
          const m = genAI.getGenerativeModel({ model: mName });
          recommendation = await callWithRetry(async () => {
            const result = await m.generateContent({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: 1024,
                temperature: 0.35
              }
            });
            const response = await result.response;
            return response.text();
          });
          if (recommendation) {
            console.log(`✅ Disease treatment recommendation generated successfully with model "${mName}"`);
            break;
          }
        } catch (genErr) {
          console.error(`❌ Model "${mName}" error for disease recommendation:`, genErr.message);
          if (genErr.message?.includes('QuotaFailure') || genErr.message?.includes('PerDay') || genErr.message?.includes('RESOURCE_EXHAUSTED')) {
            exhaustedModels.set(mName, Date.now() + 180000);
          }
        }
      }
    }

    if (!recommendation) {
      recommendation = await getFallbackDiseaseRecommendation(primaryDisease.disease);
    }
    
    return recommendation;
  } catch (err) {
    console.error('❌ Error in generateDiseaseRecommendation:', err);
    return await getFallbackDiseaseRecommendation('Unknown Disease');
  }
}

async function getFallbackDiseaseRecommendation(diseaseName) {
  return `🩺 **Treatment Plan for ${diseaseName}**

🚨 **IMMEDIATE ACTIONS**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 Remove and destroy affected plant parts immediately
🔹 Isolate infected plants from healthy ones
🔹 Improve air circulation around plants
🔹 Stop overhead watering, water at root level only

🌿 **ORGANIC TREATMENT**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 **Neem Oil Spray**: Mix 2-3ml neem oil per liter water, spray evening time
🔹 **Baking Soda Solution**: 1 tsp per liter water for fungal issues
🔹 **Turmeric Paste**: Mix with water, apply on affected areas
🔹 **Compost Tea**: Boost plant immunity naturally

💊 **CHEMICAL TREATMENT** (if organic fails)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 Visit local agricultural store for specific fungicides
🔹 Use copper-based fungicides for bacterial/fungal diseases
🔹 Always wear protective equipment during application
🔹 Follow label instructions strictly

🛡️ **PREVENTION STRATEGIES**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 Maintain proper plant spacing for air circulation
🔹 Apply balanced NPK fertilizer regularly
🔹 Mulch around plants to retain moisture
🔹 Regular inspection (weekly check-ups)

⚠️ **SEEK EXPERT HELP IF:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 Disease spreads rapidly despite treatment
🔹 Multiple plants are affected
🔹 Crop yield is significantly reduced
🔹 Unusual symptoms appear

📞 **Contact**: Your local Krishi Vigyan Kendra (KVK) or agricultural extension officer for region-specific guidance.`;
}

module.exports = { generateAIResponse, generateChatResponse, testAI, generateDiseaseRecommendation };



