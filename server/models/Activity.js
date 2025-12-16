const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    action: { type: String, required: true }, // e.g. created, edited, join_requested, join_approved, join_rejected
    details: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', ActivitySchema);
