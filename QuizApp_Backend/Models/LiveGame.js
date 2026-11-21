const mongoose = require('mongoose');

// A finished live game. Written by the live server (QuizApp_Live/models.js, keep the
// two in step); this API only reads it, for each player's "Past games".
const liveGameSchema = new mongoose.Schema({
  code: String,
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hostName: String,
  mode: { type: String, enum: ['sync', 'exam'] },   // one at a time, or all at once
  source: { kind: { type: String, enum: ['category', 'custom'] }, id: String, name: String },
  seconds: Number,        // per question (sync)
  totalSeconds: Number,   // whole game (exam)
  questions: [{ _id: false, text: String, options: [String], correctAnswer: String, explanation: String }],
  players: [{
    _id: false,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    rank: Number,
    score: Number,
    correct: Number,
    timeMs: Number,
    answers: [{ _id: false, option: String, isCorrect: Boolean, points: Number, ms: Number }],
  }],
  startedAt: Date,
  endedAt: Date,
}, { timestamps: true });

liveGameSchema.index({ 'players.user': 1, endedAt: -1 });

module.exports = mongoose.model('LiveGame', liveGameSchema);
