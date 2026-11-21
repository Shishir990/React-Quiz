const mongoose = require('mongoose');

// One document per pair of players: a pending friend request, or (once accepted) a friendship.
// Declining, cancelling or unfriending deletes it, so the pair can start over later.
const friendshipSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:    { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  // Both ids, smaller first: unique, so two players can never have two requests between them
  // (not even when both press "Add friend" at the same moment)
  pairKey:    { type: String, required: true, unique: true },
  acceptedAt: { type: Date },
}, { timestamps: true });

// "My friends" and "requests sent to me" / "sent by me"
friendshipSchema.index({ requester: 1, status: 1 });
friendshipSchema.index({ recipient: 1, status: 1 });

friendshipSchema.statics.pairKeyOf = (a, b) => [String(a), String(b)].sort().join(':');

module.exports = mongoose.model('Friendship', friendshipSchema);
