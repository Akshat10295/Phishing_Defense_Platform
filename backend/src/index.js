require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./api/routes/auth.routes');
const prisma = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());

// CORS configuration - Allow localhost:3000 in dev
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('CORS Policy violation: Request origin not allowed.'));
      }
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Rate Limiting - protect API endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});
app.use('/api/', limiter);

// Basic status route
app.get('/api/v1/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SentinelAI Gateway Status: Online',
    timestamp: new Date(),
  });
});

// Auth Routes mapping
app.use('/api/v1/auth', authRoutes);

// Database Health Check on startup
prisma.$connect()
  .then(() => {
    console.log('Successfully connected to PostgreSQL Database via Prisma.');
  })
  .catch((err) => {
    console.error('Critical: Failed to connect to database on boot.', err.message);
  });

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found on SentinelAI Gateway',
  });
});

// Centralised Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Gateway Error Exception:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Gateway Error',
  });
});

// Listen on configured port
app.listen(PORT, () => {
  console.log(`SentinelAI Gateway boot completed. Listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
});
