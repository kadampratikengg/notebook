// server/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRouter = require('./routes/auth');      // should exist: server/routes/auth.js
const tripsRouter = require('./routes/trips');    // should exist
const submissionsRouter = require('./routes/submissions'); // should exist

const app = express();
const PORT = process.env.PORT || 5000;

// Basic CORS allow from FRONTEND_URL or localhost:3000
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// mount routers under /api so frontend can call /api/auth/register etc.
app.use('/api', authRouter);
app.use('/api', tripsRouter);
app.use('/api', submissionsRouter);

// health
app.get('/', (req, res) => res.send('Notebook backend running'));

// connect mongo and start server
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/notebook', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Mongo connected');
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}).catch(err => {
  console.error('MongoDB connection error', err);
});
