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
  total:          { type: Number },                       // questions served (older results lack it)
  percentage:     { type: Number, required: true },
  passed:         { type: Boolean, required: true },
  timeTaken:      { type: Number },                       // in seconds
  // The attempt this result came from (older results have none). Unique, so one
  // attempt can only ever produce one result, even when two submits race.
  attempt:        { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

resultSchema.index({ attempt: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Result', resultSchema);