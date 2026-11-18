const mongoose = require('mongoose');

// One quiz attempt the player has started and not yet submitted, so it can be resumed
// on any device. One per player + category.
//
// Only the server creates it (when it hands out the questions), and submitting uses it
// up. Each start gets a new `attemptId`, which the client sends back with every save and
// with the submit, so the server knows which questions were served and when. The client
// can't choose its own questions or submit the same attempt twice.
const quizProgressSchema = new mongoose.Schema({
  user:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category:         { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  // New on every start. Older saves have none until they are next read (see progress getOne).
  attemptId:        { type: mongoose.Schema.Types.ObjectId, unique: true, sparse: true },
  startedAt:        { type: Date },                          // when the questions were served
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
// Attempts left untouched for a week are deleted by MongoDB
quizProgressSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model('QuizProgress', quizProgressSchema);
