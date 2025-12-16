// server/routes/trips.js
const express = require('express');
const Trip = require('../models/Trip');
const auth = require('../middleware/auth');
const JoinRequest = require('../models/JoinRequest');
const Submission = require('../models/Submission');
const Activity = require('../models/Activity');

const router = express.Router();

/**
 * GET /api/trips
 * Returns list of trips belonging to authenticated user (if token present).
 * If no auth provided, returns all trips (useful for public endpoints).
 */
router.get('/trips', authOptional, async (req, res) => {
  try {
    // If authenticated, return only trips owned by user
    if (req.user) {
      const trips = await Trip.find({ owner: req.user._id }).sort({
        createdAt: -1,
      });
      return res.json(trips);
    }
    // Otherwise return all trips
    const trips = await Trip.find().sort({ createdAt: -1 });
    return res.json(trips);
  } catch (err) {
    console.error('GET /trips error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});
/**
 * POST /api/trips
 * Create a trip - requires auth
 */
router.post('/trips', auth, async (req, res) => {
  try {
    const {
      title,
      startDate,
      endDate,
      participants = [],
      description,
      joinCode,
    } = req.body;
    const trip = new Trip({
      owner: req.user._id,
      title,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      participants: Array.isArray(participants) ? participants : [],
      description,
      joinCode: joinCode || generateJoinCode(),
    });
    // log activity: created
    try {
      await Activity.create({
        trip: trip._id,
        user: req.user._id,
        userName: req.user.name,
        action: 'created',
        details: `Trip created: ${trip.title || '(untitled)'}`,
      });
    } catch (e) {
      console.error('Activity create error', e);
    }
    await trip.save();
    return res.status(201).json(trip);
  } catch (err) {
    console.error('POST /trips error', err);
    if (err.code === 11000 && err.keyPattern && err.keyPattern.joinCode) {
      return res.status(400).json({ error: 'Join code collision, try again' });
    }
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/trips/:id
 * Get a single trip by id (auth optional)
 */
router.get('/trips/:id', authOptional, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    return res.json(trip);
  } catch (err) {
    console.error('GET /trips/:id error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/trips/:id
 * Update existing trip (owner only)
 */
router.put('/trips/:id', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    // Only owner can update
    if (!trip.owner || String(trip.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not allowed to edit this trip' });
    }

    const {
      title,
      startDate,
      endDate,
      participants = [],
      description,
    } = req.body;
    trip.title = title;
    trip.startDate = startDate ? new Date(startDate) : trip.startDate;
    trip.endDate = endDate ? new Date(endDate) : trip.endDate;
    trip.participants = Array.isArray(participants)
      ? participants
      : trip.participants;
    trip.description = description;

    await trip.save();

    // log activity: edited
    try {
      await Activity.create({
        trip: trip._id,
        user: req.user._id,
        userName: req.user.name,
        action: 'edited',
        details: `Trip edited: ${trip.title || '(untitled)'}`,
      });
    } catch (e) {
      console.error('Activity create error', e);
    }

    return res.json(trip);
  } catch (err) {
    console.error('PUT /trips/:id error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/trips/:id
 * Delete a trip (requires auth and ownership)
 */
router.delete('/trips/:id', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    // Only owner can delete
    if (!trip.owner || String(trip.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not allowed to delete this trip' });
    }

    // Cascade: delete related data (submissions, join requests, activities)
    try {
      const delSub = await Submission.deleteMany({ trip: trip._id });
      const delJR = await JoinRequest.deleteMany({ trip: trip._id });
      const delAct = await Activity.deleteMany({ trip: trip._id });
      console.log(
        `Cascade delete for trip ${trip._id}: submissions=${delSub.deletedCount}, joinRequests=${delJR.deletedCount}, activities=${delAct.deletedCount}`
      );
    } catch (e) {
      console.error('Error during cascade delete', e);
    }

    await Trip.deleteOne({ _id: trip._id });
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /trips/:id error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/trips/join/:code
 * Lookup trip by joinCode (public)
 */
router.get('/trips/join/:code', async (req, res) => {
  try {
    const t = await Trip.findOne({ joinCode: req.params.code });
    if (!t) return res.status(404).json({ error: 'Trip not found' });
    return res.json(t);
  } catch (err) {
    console.error('GET /trips/join/:code error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Legacy: POST /trips/join/:code/request
router.post('/trips/join/:code/request', async (req, res) => {
  try {
    const trip = await Trip.findOne({ joinCode: req.params.code });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const user = req.user || undefined;
    const name = user ? user.name : (req.body.name || '').trim();
    // prevent duplicate pending requests by name for anonymous requests
    if (!user && name) {
      const existing = await JoinRequest.findOne({
        trip: trip._id,
        name: name,
        status: 'pending',
      });
      if (existing)
        return res
          .status(400)
          .json({ error: 'Join request already pending for this name' });
    }

    const jr = new JoinRequest({
      trip: trip._id,
      user: user ? user._id : undefined,
      name: name || '',
      message: req.body.message || '',
    });
    await jr.save();

    // log activity
    try {
      await Activity.create({
        trip: trip._id,
        user: user ? user._id : undefined,
        userName: jr.name,
        action: 'join_requested',
        details: jr.message || '',
      });
    } catch (e) {
      console.error(e);
    }

    return res.json({ ok: true, request: jr });
  } catch (err) {
    console.error('POST /trips/join/:code/request', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/trips/:id/join-requests
 * Simple placeholder: records a join request (not persisted here).
 * If you have a join-request model, replace this with real persistence.
 */
router.post('/trips/:id/join-requests', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    // If user is already participant, return error
    const { message } = req.body || {};
    const user = req.user || null;

    // if authenticated user, check membership
    if (user) {
      const uname = (user.name || '').trim().toLowerCase();
      const isMember = trip.participants?.some(
        (p) => (p.name || '').trim().toLowerCase() === uname
      );
      if (isMember)
        return res.status(400).json({ error: 'Already a participant' });

      // prevent duplicate pending join requests by same user
      const existing = await JoinRequest.findOne({
        trip: trip._id,
        user: user._id,
        status: 'pending',
      });
      if (existing)
        return res.status(400).json({ error: 'Join request already pending' });
    }

    const jr = new JoinRequest({
      trip: trip._id,
      user: user ? user._id : undefined,
      name: user ? user.name : req.body.name || '',
      message: message || '',
    });
    await jr.save();

    // log activity: join requested
    try {
      await Activity.create({
        trip: trip._id,
        user: user ? user._id : undefined,
        userName: user ? user.name : jr.name,
        action: 'join_requested',
        details: jr.message || 'Join request',
      });
    } catch (e) {
      console.error('Activity create error', e);
    }

    return res.status(201).json({ ok: true, request: jr });
  } catch (err) {
    console.error('POST /trips/:id/join-requests error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/trips/:id/join-requests
 * Owner only: list pending join requests
 */
router.get('/trips/:id/join-requests', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (!trip.owner || String(trip.owner) !== String(req.user._id))
      return res.status(403).json({ error: 'Not allowed' });
    const items = await JoinRequest.find({
      trip: trip._id,
      status: 'pending',
    }).sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    console.error('GET /trips/:id/join-requests error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/trips/:id/join-requests/:reqId/accept
 * Owner only: accept request -> add participant and mark request accepted
 */
router.post(
  '/trips/:id/join-requests/:reqId/accept',
  auth,
  async (req, res) => {
    try {
      const trip = await Trip.findById(req.params.id);
      if (!trip) return res.status(404).json({ error: 'Trip not found' });
      if (!trip.owner || String(trip.owner) !== String(req.user._id))
        return res.status(403).json({ error: 'Not allowed' });

      const jr = await JoinRequest.findById(req.params.reqId);
      if (!jr || String(jr.trip) !== String(trip._id))
        return res.status(404).json({ error: 'Request not found' });
      if (jr.status !== 'pending')
        return res.status(400).json({ error: 'Request already processed' });

      // Add participant (avoid duplicates)
      const name =
        jr.name ||
        (jr.user
          ? (await require('../models/User').findById(jr.user)).name
          : undefined) ||
        'Unknown';
      const exists = trip.participants?.some(
        (p) =>
          (p.name || '').trim().toLowerCase() ===
          (name || '').trim().toLowerCase()
      );
      if (!exists) {
        trip.participants = trip.participants || [];
        trip.participants.push({ name });
        await trip.save();
      }

      jr.status = 'accepted';
      await jr.save();

      // log activity: join_approved
      try {
        await Activity.create({
          trip: trip._id,
          user: jr.user || undefined,
          userName: name,
          action: 'join_approved',
          details: `Join request approved for ${name}`,
        });
      } catch (e) {
        console.error('Activity create error', e);
      }

      return res.json({ ok: true, trip });
    } catch (err) {
      console.error('POST accept error', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

/**
 * POST /api/trips/:id/join-requests/:reqId/reject
 */
router.post(
  '/trips/:id/join-requests/:reqId/reject',
  auth,
  async (req, res) => {
    try {
      const trip = await Trip.findById(req.params.id);
      if (!trip) return res.status(404).json({ error: 'Trip not found' });
      if (!trip.owner || String(trip.owner) !== String(req.user._id))
        return res.status(403).json({ error: 'Not allowed' });

      const jr = await JoinRequest.findById(req.params.reqId);
      if (!jr || String(jr.trip) !== String(trip._id))
        return res.status(404).json({ error: 'Request not found' });
      if (jr.status !== 'pending')
        return res.status(400).json({ error: 'Request already processed' });

      jr.status = 'rejected';
      await jr.save();

      // log activity: join_rejected
      try {
        await Activity.create({
          trip: trip._id,
          user: jr.user || undefined,
          userName: jr.name || undefined,
          action: 'join_rejected',
          details: `Join request rejected for ${jr.name || 'unknown'}`,
        });
      } catch (e) {
        console.error('Activity create error', e);
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error('POST reject error', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

/**
 * GET /api/trips/:id/history
 * Returns activity log for trip - accessible to owner and participants
 */
router.get('/trips/:id/history', auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    // allow access if owner or participant
    const isMember =
      (trip.owner && String(trip.owner) === String(req.user._id)) ||
      (trip.participants || []).some(
        (p) =>
          (p._id && String(p._id) === String(req.user._id)) ||
          (p.name && p.name === req.user.name)
      );
    if (!isMember) return res.status(403).json({ error: 'Not allowed' });

    const items = await Activity.find({ trip: trip._id })
      .sort({ createdAt: -1 })
      .limit(200);
    return res.json(items);
  } catch (err) {
    console.error('GET history error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* ----------------------
   Helper functions
   ---------------------- */
function generateJoinCode() {
  // Simple readable code - adjust to your needs
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * authOptional middleware:
 * - tries to set req.user using your auth middleware
 * - if not present, continues without failing (public read)
 */
function authOptional(req, res, next) {
  // require auth middleware but allow unauthenticated requests
  const authHeader = req.headers.authorization || '';
  if (!authHeader) return next();
  // reuse your auth middleware logic
  return require('../middleware/auth')(req, res, (err) => {
    // auth middleware calls next() on success, or returns 401 on failure
    // If it returned a response (401), let it through; otherwise proceed.
    // Note: our auth middleware above returns res on failure, so we need to detect that.
    // If middleware already responded, do nothing. If not, continue.
    try {
      if (res.headersSent) return; // auth middleware already responded (unauthorized)
    } catch (e) {} // ignore
    next();
  });
}

/** Additional endpoints: user's own join requests **/
router.get('/join-requests/me', auth, async (req, res) => {
  try {
    const items = await JoinRequest.find({ user: req.user._id })
      .populate('trip')
      .sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    console.error('GET join-requests/me error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/join-requests/:id
 * Allows a user to cancel their own join request
 */
router.delete('/join-requests/:id', auth, async (req, res) => {
  try {
    const jr = await JoinRequest.findById(req.params.id);
    if (!jr) return res.status(404).json({ error: 'Join request not found' });
    if (!jr.user || String(jr.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    await jr.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE join-request error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
