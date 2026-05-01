const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  questions:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  duration:    { type: Number, default: 10 },   // in minutes
  passMark:    { type: Number, default: 50 },   // percentage
  isPublished: { type: Boolean, default: false },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);