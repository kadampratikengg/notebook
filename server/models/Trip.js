const mongoose = require('mongoose');

const ParticipantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String }
}, { _id: false });

const TripSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  title: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  participants: [ParticipantSchema],
  joinCode: { type: String, unique: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Trip', TripSchema);
