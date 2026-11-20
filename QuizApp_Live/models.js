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

module.exports = { User, Category, Question, Result };
