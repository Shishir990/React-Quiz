const mongoose = require('mongoose');

// One signed-in device. Only a SHA-256 hash of its refresh token is stored, so a
// database leak can't be replayed. Each refresh rotates the token: the old row is
// marked revoked and points at its replacement, which lets reuse of an old token
// (a sign it was stolen) be detected.
const sessionSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash:  { type: String, required: true, unique: true },
  expiresAt:  { type: Date, required: true },
  revokedAt:  { type: Date },
  replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  userAgent:  { type: String, default: '' },
}, { timestamps: true });

// MongoDB deletes rows on its own once they expire
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);
