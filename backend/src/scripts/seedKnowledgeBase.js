const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { KnowledgeBase } = require('../models/KnowledgeBase');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrisense';

async function seedKnowledgeBase() {
  console.log('🌾 Seeding Kisan Call Center (KCC) Agronomy Knowledge Base...');
  const jsonPath = path.join(__dirname, '../data/kcc_agronomy_knowledgebase.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ Knowledge base dataset file not found at:', jsonPath);
    process.exit(1);
  }

  const articles = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`Loaded ${articles.length} verified agronomy articles.`);

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected to MongoDB.');

    for (const art of articles) {
      await KnowledgeBase.findOneAndUpdate(
        { title: art.title },
        {
          title: art.title,
          content: art.content,
          tags: art.tags
        },
        { upsert: true, new: true }
      );
      console.log(`  ✓ Synced: ${art.title}`);
    }

    console.log(`🎉 Successfully seeded ${articles.length} articles into KnowledgeBase collection.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.warn(`⚠️ MongoDB connection unavailable (${err.message}). In-memory fallback will serve knowledge base.`);
    process.exit(0);
  }
}

seedKnowledgeBase();
