const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true }, // store bcrypt hash

  // Forgot/reset password support
  resetToken: { type: String },
  resetExpires: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
