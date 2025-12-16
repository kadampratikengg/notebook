const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const Trip = require('../models/Trip');
const XLSX = require('xlsx');
const path = require('path');

// POST /submit
router.post('/submit', async (req, res) => {
  try {
    const payload = { ...req.body };

    // If trip is provided, validate names
    if (payload.trip) {
      const trip = await Trip.findById(payload.trip);
      if (!trip) return res.status(400).json({ error: 'Invalid trip' });

      const names = trip.participants.map(p => (p.name || '').trim().toLowerCase());
      const payer = (payload.name || '').trim().toLowerCase();
      if (!names.includes(payer)) {
        return res.status(400).json({ error: 'Payer name not part of trip participants' });
      }

      if (Array.isArray(payload.splitWith)) {
        for (let s of payload.splitWith) {
          if (!names.includes((s || '').trim().toLowerCase())) {
            return res.status(400).json({ error: `splitWith member ${s} not in trip` });
          }
        }
      }
    }

    // Expect payload.date is ISO string (frontend should convert IST->UTC ISO)
    const dateToSave = payload.date ? new Date(payload.date) : new Date();
    const doc = new Submission({
      ...payload,
      date: dateToSave
    });

    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// GET /download?tripId=...
router.get('/download', async (req, res) => {
  try {
    const filter = {};
    if (req.query.tripId) filter.trip = req.query.tripId;
    const submissions = await Submission.find(filter);

    const data = submissions.map(s => ({
      Name: s.name,
      Date: s.date ? s.date.toISOString() : '',
      Location: s.location,
      Amount: s.amount,
      PaymentMode: s.paymentMode,
      Description: s.description
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
