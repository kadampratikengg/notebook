const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const XLSX = require('xlsx');
const Submission = require('./models/Submission');

dotenv.config();

const app = express();

// ========================= CORS FIX =========================

const allowedOrigins = [
  'https://notebook-six-brown.vercel.app', // your frontend
  'http://localhost:3000', // local development
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow mobile/postman

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log('❌ Blocked by CORS:', origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(express.json());

const PORT = process.env.PORT || 5000;

// ==================== MONGO CONNECT ==========================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB Error:', err));

// ==================== ROUTES ================================

// ➤ POST /submit
app.post('/submit', async (req, res) => {
  try {
    // Frontend sends ISO string in IST timezone (e.g. "2025-12-10T14:30")
    // Parse as IST by creating a UTC date then subtracting IST offset (+5:30)
    const istDateStr = req.body.date;
    const utcDate = new Date(istDateStr); // parses as UTC
    const istOffsetMs = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const dateToSave = new Date(utcDate.getTime() + istOffsetMs); // convert to true UTC

    const submission = new Submission({
      ...req.body,
      date: dateToSave,
    });

    await submission.save();
    res.status(201).json(submission);
  } catch (err) {
    console.error('❌ Submit Error:', err);
    res.status(400).json({ error: err.message });
  }
});

// ➤ GET /submissions
app.get('/submissions', async (req, res) => {
  try {
    const submissions = await Submission.find().sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    console.error('❌ Fetch Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ➤ GET /download
app.get('/download', async (req, res) => {
  try {
    const submissions = await Submission.find();

    const data = submissions.map((s) => ({
      Name: s.name,
      Date: s.date,
      Location: s.location,
      Amount: s.amount,
      PaymentMode: s.paymentMode,
      Description: s.description,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');

    const filePath = 'Submissions.xlsx';
    XLSX.writeFile(workbook, filePath);

    res.download(filePath);
  } catch (err) {
    console.error('❌ Excel Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ➤ Health Route
app.get('/', (req, res) => {
  res.status(200).send('Backend running successfully 🚀');
});

// ==================== START SERVER ===========================
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
