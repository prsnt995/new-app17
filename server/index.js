const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5050;

const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:19006',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));

app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/payments', authLimiter);

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'NamasteMart Supabase Backend',
    timestamp: new Date().toISOString(),
  });
});

// START SERVER
const server = app.listen(PORT, () => {
  console.log(`🚀 Node.js Backend with Supabase running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const fallbackPort = Number(PORT) === 5000 ? 5001 : Number(PORT) + 1;
    console.log(`⚠️ Port ${PORT} is in use (macOS AirPlay). Switching to fallback port ${fallbackPort}...`);
    app.listen(fallbackPort, () => {
      console.log(`🚀 Node.js Backend with Supabase running on http://localhost:${fallbackPort}`);
    });
  } else {
    console.error('Server error:', err);
  }
});
