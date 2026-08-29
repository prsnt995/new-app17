require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

// HEALTH CHECK ROUTE
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'NamasteMart Firebase Admin Backend',
    timestamp: new Date().toISOString(),
  });
});

// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Node.js Backend with Firebase Admin SDK running on http://localhost:${PORT}`);
});
