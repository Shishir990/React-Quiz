// The parts of QuizApp_Backend's models this server reads and writes. It shares the
// backend's database, so these must match QuizApp_Backend/Models (same collections,
// same field names). Only Result is written; the others are read-only here.
const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  isActive: { type: Boolean, default: true },
  tokenVersion: { type: Number, default: 0 },
}, { strict: false }));

const Category = mongoose.model('Category', new mongoose.Schema({
  name: String,
}, { strict: false }));

const Question = mongoose.model('Question', new mongoose.Schema({
  text: String,
  options: [String],
  correctAnswer: String,
  explanation: String,
  difficulty: String,
  category: { type: ObjectId, ref: 'Category' },
}, { strict: false }));

// A quiz a player wrote (QuizApp_Backend/Models/UserQuiz.js), questions inside it
const UserQuiz = mongoose.model('UserQuiz', new mongoose.Schema({
  owner: { type: ObjectId, ref: 'User' },
  title: String,
  questions: [{ text: String, options: [String], correctAnswer: String, explanation: String }],
}, { strict: false }));

// Same shape as QuizApp_Backend/Models/Result.js, so live games show up in
// results, analytics and the leaderboard like any other attempt
const Result = mongoose.model('Result', new mongoose.Schema({
  user: { type: ObjectId, ref: 'User', required: true },
  quiz: { type: ObjectId, ref: 'Quiz', required: true }, // holds the category id
  answers: [{
    question: { type: ObjectId, ref: 'Question' },
    selectedOption: String,
    isCorrect: Boolean,
  }],
  score: { type: Number, required: true },
  total: Number,
  percentage: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  timeTaken: Number,
  attempt: ObjectId,
}, { timestamps: true }));

// A finished live game, for every player's "Past games". Written only here; the main
// API (QuizApp_Backend/Models/LiveGame.js) reads it. Keep the two in step.
const liveGameSchema = new mongoose.Schema({
  code: String,
  host: { type: ObjectId, ref: 'User' },
  hostName: String,
  mode: { type: String, enum: ['sync', 'exam'] },
  source: { kind: { type: String, enum: ['category', 'custom'] }, id: String, name: String },
  seconds: Number,        // per question (sync)
  totalSeconds: Number,   // whole game (exam)
  questions: [{ _id: false, text: String, options: [String], correctAnswer: String, explanation: String }],
  players: [{
    _id: false,
    user: { type: ObjectId, ref: 'User' },
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
// "Games I played", newest first
liveGameSchema.index({ 'players.user': 1, endedAt: -1 });
const LiveGame = mongoose.model('LiveGame', liveGameSchema);

module.exports = { User, Category, Question, UserQuiz, Result, LiveGame };
