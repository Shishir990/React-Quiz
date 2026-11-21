const mongoose = require('mongoose');

// Something that happened for a player: a friend request, an accepted request, or an
// invite to a live game. Stored so the bell shows it later too; also pushed live through
// the live server (see Utils/notify.js). Deleted automatically after 30 days.
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who it's for
  type: { type: String, enum: ['friend_request', 'friend_accepted', 'game_invite'], required: true },
  // Who caused it (name copied, so a list needs no lookups)
  actor: {
    id:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
  },
  // friend_request: requestId · game_invite: code (the room) and quizName
  data: {
    requestId: { type: mongoose.Schema.Types.ObjectId },
    code:      { type: String },
    quizName:  { type: String },
  },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);
