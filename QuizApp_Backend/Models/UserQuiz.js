const mongoose = require('mongoose');

// A quiz a player wrote themselves, to host as a live game. Private to its owner.
// Questions are stored inside the quiz (not in the shared question bank), so they
// never show up in the categories everyone plays.
const questionSchema = new mongoose.Schema({
  text:          { type: String, required: true },
  options:       [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },   // must match one option
  explanation:   { type: String, default: '' },
});

const userQuizSchema = new mongoose.Schema({
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  questions:   [questionSchema],
}, { timestamps: true });

module.exports = mongoose.model('UserQuiz', userQuizSchema);
