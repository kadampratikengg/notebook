const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: false },
  name: { type: String, required: true },
  date: { type: Date, required: true },
  location: { type: String },
  amount: { type: Number, required: true },
  paymentMode: { type: String },
  description: { type: String },
  splitWith: [{ type: String }],
  splitShare: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('Submission', SubmissionSchema);
