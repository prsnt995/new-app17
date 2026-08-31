const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config(); // fallback to root .env if present

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 5050;

// MIDDLEWARE
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// HEALTH CHECK ROUTE
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'NamasteMart Firebase Admin Backend',
    timestamp: new Date().toISOString(),
  });
});

// START SERVER
const server = app.listen(PORT, () => {
  console.log(`🚀 Node.js Backend with Firebase Admin SDK running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const fallbackPort = Number(PORT) === 5000 ? 5001 : Number(PORT) + 1;
    console.log(`⚠️ Port ${PORT} is in use (macOS AirPlay). Switching to fallback port ${fallbackPort}...`);
    app.listen(fallbackPort, () => {
      console.log(`🚀 Node.js Backend with Firebase Admin SDK running on http://localhost:${fallbackPort}`);
    });
  } else {
    console.error('Server error:', err);
  }
});
