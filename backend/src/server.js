// Force Google DNS — fixes MongoDB Atlas SRV resolution on networks
// where the router DNS doesn't support SRV record lookups
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

// Load .env file from the backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const { connectToDatabase } = require('./utils/db');

const queryRoutes = require('./routes/query');
const infoRoutes = require('./routes/info');
const officerRoutes = require('./routes/officer');
const krishiSevaKendraRoutes = require('./routes/krishiSevaKendra');
const cropPricesRoutes = require('./routes/cropPrices');
const farmRoutes = require('./routes/farm');
const { initChatSockets } = require('./sockets/chat');
const { setIo } = require('./utils/io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Root endpoint for Render
app.get('/', (req, res) => {
  res.json({ 
    message: 'AgriSense Backend API is running!', 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const yieldPredictionRoutes = require('./routes/yieldPrediction');
const diseaseRiskRoutes = require('./routes/diseaseRisk');
const inventoryRoutes = require('./routes/inventory');
const farmActivityRoutes = require('./routes/farmActivity');
const harvestManagementRoutes = require('./routes/harvestManagement');
const alertRoutes = require('./routes/alerts');
const authRoutes = require('./routes/auth');
const mandiRoutes = require('./routes/mandi');

// Routes
app.use('/api/query', queryRoutes);
app.use('/api', infoRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/krishi-seva-kendra', krishiSevaKendraRoutes);
app.use('/api/crop-prices', cropPricesRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/ml', yieldPredictionRoutes);
app.use('/api/ml', diseaseRiskRoutes);
app.use('/api', inventoryRoutes);
app.use('/api/farm-activities', farmActivityRoutes);
app.use('/api/harvest-management', harvestManagementRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/mandi', mandiRoutes);

// Socket.io
initChatSockets(io);
setIo(io);

// Start server - MongoDB Atlas ready
const PORT = process.env.PORT || 3001;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

async function startServer() {
  try {
    // Connect to MongoDB Atlas
    await connectToDatabase();
    console.log('✅ Connected to MongoDB Atlas');
  } catch (error) {
    console.warn('⚠️ Starting server without database connection (fallback mode active)');
  }
  
  // Start the server
  server.listen(PORT, HOST, () => {
    console.log(`🚀 Backend listening on ${HOST}:${PORT}`);
    console.log(`🌐 Health check: http://${HOST}:${PORT}/api/health`);
    console.log(`🤖 AI test: http://${HOST}:${PORT}/api/query/test-ai`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

startServer();


