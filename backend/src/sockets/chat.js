const { generateAIResponse } = require('../services/aiService');
const { Query } = require('../models/Query');
const plantDiseaseService = require('../services/plantDiseaseService');
const { generateDiseaseRecommendation } = require('../services/aiService');

function initChatSockets(io) {
  io.on('connection', (socket) => {
    console.log('👋 User connected:', socket.id);

    // Join room per user/session  
    socket.on('join', ({ roomId }) => {
      if (roomId) {
        socket.join(roomId);
        console.log(`🏠 User ${socket.id} joined room ${roomId}`);
        socket.emit('joined_room', { roomId });
      }
    });

    // Handle user messages (matches frontend expectation)
    socket.on('user_message', async (payload) => {
      const { roomId, text, userId, farmContext } = payload || {};
      if (!roomId || !text || typeof text !== 'string' || !text.trim()) {
        socket.emit('error', { message: 'Invalid message or roomId' });
        return;
      }

      try {
        console.log(`💬 Received message in room ${roomId}: ${text.substring(0, 50)}...`);
        
        // Show typing indicator to all users in room
        io.to(roomId).emit('assistant_typing', { roomId });

        let enrichedContext = { ...(farmContext || {}) };

        // If crop or farm is missing, enrich from DB
        try {
          const mongoose = require('mongoose');
          if (mongoose.connection.readyState === 1 && (!enrichedContext.crop || enrichedContext.crop === 'Not specified')) {
            const { Farm } = require('../models/Farm');
            const userFarm = await Farm.findOne(userId && !userId.startsWith('user-') ? { farmer_id: userId } : {}).sort({ created_at: -1 }).lean();
            if (userFarm) {
              enrichedContext = {
                farm_name: userFarm.farm_name,
                location: userFarm.location_name,
                crop: userFarm.crop,
                season: userFarm.season,
                area_hectares: userFarm.area_hectares,
                soil_type: userFarm.soil_type,
                irrigation_type: userFarm.irrigation_type,
                latitude: userFarm.latitude,
                longitude: userFarm.longitude,
                ...enrichedContext,
                crop: enrichedContext.crop && enrichedContext.crop !== 'Not specified' ? enrichedContext.crop : userFarm.crop,
                farm_name: enrichedContext.farm_name && enrichedContext.farm_name !== 'My Farm' ? enrichedContext.farm_name : userFarm.farm_name
              };
            }
          }
        } catch (dbErr) {
          console.warn('DB farm context enrichment fallback:', dbErr.message);
        }

        // Generate AI response using dedicated chat function with 35s timeout safeguard
        const { generateChatResponse, getFallbackResponse } = require('../services/aiService');
        
        const aiPromise = generateChatResponse(text, enrichedContext);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI response timed out')), 35000)
        );

        let aiResponse = '';
        try {
          aiResponse = await Promise.race([aiPromise, timeoutPromise]);
        } catch (aiError) {
          console.warn('⚠️ AI live response failed or timed out, generating agronomic fallback:', aiError.message);
          aiResponse = await getFallbackResponse(text);
        }
        
        // Send AI response to all users in room
        io.to(roomId).emit('assistant_message', { 
          text: aiResponse || '🌾 Krishi Mitra Advisory: For precision agronomic care, please monitor soil moisture and inspect crop canopy regularly. Consult your local KVK for immediate agrochemical dosing.'
        });
        
        console.log(`✅ Sent AI response to room ${roomId}`);

        // Asynchronously persist query to DB if connected
        try {
          const mongoose = require('mongoose');
          if (mongoose.connection.readyState === 1) {
            Query.create({
              text,
              response: aiResponse,
              farmer_id: userId || 'anonymous',
              status: 'answered',
              metadata: {
                crop: enrichedContext?.crop,
                farm_name: enrichedContext?.farm_name,
                location: enrichedContext?.location,
                soil_type: enrichedContext?.soil_type
              }
            }).catch(e => console.warn('Async query save warning:', e.message));
          }
        } catch (saveErr) {}
      } catch (error) {
        console.error('❌ Chat error:', error);
        if (roomId) {
          io.to(roomId).emit('assistant_message', { 
            text: '🌾 Krishi Mitra Advisory: For precision agronomic care, please monitor soil moisture and inspect crop canopy regularly. Consult your local KVK for immediate agrochemical dosing.'
          });
        }
        socket.emit('error', { message: 'Failed to process message' });
      }
    });

    // Handle plant disease identification from image uploads
    socket.on('plant_image_upload', async (payload) => {
      const { roomId, imageData, fileName } = payload || {};
      if (!roomId || !imageData) {
        socket.emit('error', { message: 'Missing image data or roomId' });
        return;
      }

      try {
        console.log(`📸 Received plant image upload in room ${roomId}: ${fileName || 'unnamed'}`);
        
        // Show processing indicator
        io.to(roomId).emit('assistant_typing', { roomId });
        
        // Convert base64 image data to buffer
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        const processingMessage = '📸 **Image Received!**\n\n🔍 Running advanced plant disease analysis...\n🤖 This may take a few moments for accurate results.';
        
        io.to(roomId).emit('assistant_message', { 
          text: processingMessage
        });
        
        // Identify plant disease with timeout safeguard
        const diseaseResult = await Promise.race([
          plantDiseaseService.identifyDisease(imageBuffer),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Disease identification timed out')), 30000))
        ]);
        
        // Format and send disease identification results
        const diseaseReport = await plantDiseaseService.formatDiseaseReport(diseaseResult);
        io.to(roomId).emit('assistant_message', { 
          text: diseaseReport
        });
        
        // If disease was successfully identified, generate AI treatment recommendations
        if (diseaseResult && diseaseResult.success) {
          io.to(roomId).emit('assistant_typing', { roomId });
          
          try {
            const treatmentRecommendation = await Promise.race([
              generateDiseaseRecommendation(diseaseResult),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Treatment recommendation timed out')), 20000))
            ]);
            const treatmentTitle = '🩺 **AI Treatment Recommendations**';
            
            io.to(roomId).emit('assistant_message', { 
              text: `${treatmentTitle}\n\n${treatmentRecommendation}`
            });
            
            console.log(`✅ Sent complete disease analysis and treatment for room ${roomId}`);
          } catch (treatmentError) {
            console.error('❌ Error generating treatment recommendation:', treatmentError.message);
            const treatmentErrorMessage = '⚠️ Disease identified but unable to generate treatment recommendations right now. Please consult with a local agricultural expert for treatment advice.';
            io.to(roomId).emit('assistant_message', { 
              text: treatmentErrorMessage
            });
          }
        }
      } catch (error) {
        console.error('❌ Plant disease identification error:', error);
        const errorMessage = '❌ Sorry, I encountered an error analyzing your plant image. Please try again with a clearer photo or consult with a local agricultural expert.';
        if (roomId) {
          io.to(roomId).emit('assistant_message', { 
            text: errorMessage
          });
        }
        socket.emit('error', { message: 'Failed to process plant image' });
      }
    });

    socket.on('disconnect', () => {
      console.log('👋 User disconnected:', socket.id);
    });
  });
}

module.exports = { initChatSockets };


