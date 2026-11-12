const mongoose = require('mongoose');

// A quiz the player left part-way through, so it can be resumed on any device.
// One per player + category; removed when the quiz is submitted or restarted.
const quizProgressSchema = new mongoose.Schema({
  user:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category:         { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  questions:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }], // in the order shown
  answers:          { type: Map, of: Number, default: {} },  // question position -> option index
  visited:          [Number],                                // question positions opened
  marked:           [Number],                                // question positions marked for review
  index:            { type: Number, default: 0 },
  secondsRemaining: { type: Number, required: true },
  totalTime:        { type: Number, required: true },
  clientSavedAt:    { type: Number },                        // lets the client pick the newer of local/server copies
}, { timestamps: true });

quizProgressSchema.index({ user: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('QuizProgress', quizProgressSchema);
