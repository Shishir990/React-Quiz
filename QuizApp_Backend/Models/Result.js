const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question:      { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  selectedOption: String,
  isCorrect:     Boolean,
});

const resultSchema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quiz:           { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  answers:        [answerSchema],
  score:          { type: Number, required: true },       // raw score
  percentage:     { type: Number, required: true },
  passed:         { type: Boolean, required: true },
  timeTaken:      { type: Number },                       // in seconds
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);