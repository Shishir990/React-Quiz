const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text:          { type: String, required: true },
  options:       [{ type: String, required: true }],   // 4 options
  correctAnswer: { type: String, required: true },      // must match one option
  explanation:   { type: String, default: '' },         // optional explanation
  difficulty:    { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  category:      { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);