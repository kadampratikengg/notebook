const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const auth = require('../middleware/auth');
const Activity = require('../models/Activity');
const Trip = require('../models/Trip');
const XLSX = require('xlsx');
const path = require('path');

// POST /submit
// If a submission is for a trip, require authentication and enforce that
// the authenticated user is submitting for themselves (or the trip owner)
router.post('/submit', async (req, res) => {
  try {
    const payload = { ...req.body };

    // If trip is provided, validate names
    if (payload.trip) {
      // require auth for trip-scoped submissions
      if (!req.headers.authorization)
        return res
          .status(401)
          .json({ error: 'Authentication required for trip submissions' });

      // run auth middleware to populate req.user
      await new Promise((resolve, reject) => {
        auth(req, res, (err) => (err ? reject(err) : resolve()));
      }).catch((e) => {
        return res.status(401).json({ error: 'Authentication required' });
      });

      const trip = await Trip.findById(payload.trip);
      if (!trip) return res.status(400).json({ error: 'Invalid trip' });

      const names = trip.participants.map((p) =>
        (p.name || '').trim().toLowerCase()
      );
      const payer = (payload.name || '').trim().toLowerCase();

      // payer must be part of trip
      if (!names.includes(payer)) {
        return res
          .status(400)
          .json({ error: 'Payer name not part of trip participants' });
      }

      // ensure logged in user is submitting for themselves unless they are the trip owner
      if (
        req.user &&
        req.user.name &&
        req.user.name.trim().toLowerCase() !== payer
      ) {
        // allow owner to submit/edit on behalf
        if (!trip.owner || String(trip.owner) !== String(req.user._id)) {
          return res
            .status(403)
            .json({
              error: 'You may only submit payments under your own name',
            });
        }
      }

      if (Array.isArray(payload.splitWith)) {
        for (let s of payload.splitWith) {
          if (!names.includes((s || '').trim().toLowerCase())) {
            return res
              .status(400)
              .json({ error: `splitWith member ${s} not in trip` });
          }
        }
      }
    }

    // Expect payload.date is ISO string (frontend should convert IST->UTC ISO)
    const dateToSave = payload.date ? new Date(payload.date) : new Date();
    const docPayload = { ...payload, date: dateToSave };
    if (req.user && payload.trip) docPayload.createdBy = req.user._id;

    const doc = new Submission(docPayload);

    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /submissions/:id
 * Edit a submission - only the trip owner (admin) may edit submissions.
 * Edits are recorded as Activity entries.
 */
router.put('/submissions/:id', auth, async (req, res) => {
  try {
    const s = await Submission.findById(req.params.id);
    if (!s) return res.status(404).json({ error: 'Submission not found' });

    if (!s.trip)
      return res
        .status(400)
        .json({ error: 'Cannot edit a non-trip submission' });

    const trip = await Trip.findById(s.trip);
    if (!trip)
      return res
        .status(400)
        .json({ error: 'Parent trip not found (it may have been deleted)' });

    // only trip owner may edit submissions
    if (!trip.owner || String(trip.owner) !== String(req.user._id))
      return res
        .status(403)
        .json({ error: 'Not allowed to edit submissions for this trip' });

    // capture old values for activity details
    const old = {
      name: s.name,
      amount: s.amount,
      description: s.description,
      date: s.date,
      location: s.location,
    };

    // apply allowed updates from body
    const up = req.body || {};
    [
      'name',
      'amount',
      'description',
      'date',
      'location',
      'splitWith',
      'splitShare',
      'paymentMode',
    ].forEach((k) => {
      if (up[k] !== undefined) s[k] = up[k];
    });

    s.edited = true;
    s.editedBy = req.user._id;
    s.editedAt = new Date();

    await s.save();

    // log activity
    try {
      const changes = [];
      Object.keys(old).forEach((k) => {
        const oldVal =
          old[k] instanceof Date ? old[k].toISOString() : String(old[k] || '');
        const newVal =
          s[k] instanceof Date ? s[k].toISOString() : String(s[k] || '');
        if (oldVal !== newVal) changes.push(`${k}: '${oldVal}' -> '${newVal}'`);
      });
      await Activity.create({
        trip: trip._id,
        user: req.user._id,
        userName: req.user.name,
        action: 'submission_edited',
        details: `Submission ${s._id} edited. ${changes.join('; ')}`,
      });
    } catch (e) {
      console.error('Activity create error', e);
    }

    return res.json(s);
  } catch (err) {
    console.error('PUT /submissions/:id error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /submissions (optional tripId filter)
router.get('/submissions', async (req, res) => {
  try {
    const filter = {};
    if (req.query.tripId) filter.trip = req.query.tripId;
    const items = await Submission.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /submissions/:id - fetch a single submission (useful before edits)
router.get('/submissions/:id', async (req, res) => {
  try {
    const s = await Submission.findById(req.params.id);
    if (!s) return res.status(404).json({ error: 'Submission not found' });
    return res.json(s);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /download?tripId=...
router.get('/download', async (req, res) => {
  try {
    const filter = {};
    if (req.query.tripId) filter.trip = req.query.tripId;
    const submissions = await Submission.find(filter);

    const data = submissions.map((s) => ({
      Name: s.name,
      Date: s.date ? s.date.toISOString() : '',
      Location: s.location,
      Amount: s.amount,
      PaymentMode: s.paymentMode,
      Description: s.description,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');
    const filePath = path.join(__dirname, '..', 'Submissions.xlsx');
    XLSX.writeFile(workbook, filePath);
    res.download(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
