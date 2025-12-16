// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

async function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.id) return res.status(401).json({ error: 'Invalid token' });

    // Optionally fetch user (or trust token payload)
    const user = await User.findById(payload.id).select('-passwordHash -resetToken -resetExpires');
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    console.error('auth error', err);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = authMiddleware;
