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

// Enforce critical environment variables — fail loudly if unset
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is missing.');
  console.error('Please configure JWT_SECRET in .env or deployment environment before launching AgriSense.');
  process.exit(1);
}

const { connectToDatabase } = require('./utils/db');

const queryRoutes = require('./routes/query');
const infoRoutes = require('./routes/info');
const officerRoutes = require('./routes/officer');
const krishiSevaKendraRoutes = require('./routes/krishiSevaKendra');
const cropPricesRoutes = require('./routes/cropPrices');
const farmRoutes = require('./routes/farm');
const yieldPredictionRoutes = require('./routes/yieldPrediction');
const diseaseRiskRoutes = require('./routes/diseaseRisk');
const inventoryRoutes = require('./routes/inventory');
const farmActivityRoutes = require('./routes/farmActivity');
const harvestManagementRoutes = require('./routes/harvestManagement');
const alertRoutes = require('./routes/alerts');
const authRoutes = require('./routes/auth');
const mandiRoutes = require('./routes/mandi');
const soilRoutes = require('./routes/soil');
const { initChatSockets } = require('./sockets/chat');
const { setIo } = require('./utils/io');

const app = express();
const server = http.createServer(app);

// Unified CORS policy across REST API and WebSockets
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://localhost:3001')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Blocked by CORS policy: Origin ${origin} is not authorized`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(morgan('dev'));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Root endpoint for Render & monitoring
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
  res.json({ 
    status: 'ok', 
    uptime: process.uptime(),
    dbState: require('mongoose').connection.readyState === 1 ? 'connected' : 'offline_fallback',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount Routes
app.use('/api/query', queryRoutes);
app.use('/api', infoRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/krishi-seva-kendra', krishiSevaKendraRoutes);
app.use('/api/crop-prices', cropPricesRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/ml', yieldPredictionRoutes);
app.use('/api/ml', diseaseRiskRoutes);
app.use('/api', diseaseRiskRoutes);
app.use('/api', inventoryRoutes);
app.use('/api/farm-activities', farmActivityRoutes);
app.use('/api/harvest-management', harvestManagementRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/mandi', mandiRoutes);
app.use('/api/soil', soilRoutes);

// Socket.io initialization
initChatSockets(io);
setIo(io);

// 404 Catch-All Handler for unmatched API routes
app.use((req, res, next) => {
  res.status(404).json({
    status: 'fail',
    error: `Cannot ${req.method} ${req.originalUrl} — Route not found on AgriSense API`
  });
});

// Global Error-Handling Middleware (prevents stack trace leak in production)
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  
  if (statusCode >= 500) {
    console.error('❌ Unhandled Server Error:', err);
  }

  res.status(statusCode).json({
    status: 'error',
    error: err.message || 'Internal server error',
    code: err.code || undefined,
    ...(isProd ? {} : { stack: err.stack })
  });
});

// Start server - MongoDB Atlas ready
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

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
