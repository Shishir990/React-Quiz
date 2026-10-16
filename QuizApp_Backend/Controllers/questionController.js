const Question = require('../Models/Question');
const Category = require('../Models/Category');
const mongoose = require('mongoose');

const DIFFICULTIES = ['easy', 'medium', 'hard'];

// Pick and check the editable fields; returns { data } or { error }
async function readQuestion(body) {
  const text = String(body.text || '').trim();
  const options = Array.isArray(body.options)
    ? body.options.map((o) => String(o).trim()).filter(Boolean)
    : [];
  const correctAnswer = String(body.correctAnswer || '').trim();
  const explanation = String(body.explanation || '').trim();
  const difficulty = body.difficulty || 'medium';
  const { category } = body;

  if (!text) return { error: 'Question text is required' };
  if (options.length < 2) return { error: 'Add at least two options' };
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return { error: 'Options must be different from each other' };
  if (!options.includes(correctAnswer)) return { error: 'The correct answer must be one of the options' };
  if (!DIFFICULTIES.includes(difficulty)) return { error: 'Difficulty must be easy, medium or hard' };
  if (!mongoose.isValidObjectId(category) || !(await Category.exists({ _id: category }))) {
    return { error: 'Choose an existing category' };
  }
  return { data: { text, options, correctAnswer, explanation, difficulty, category } };
}

// Admin only: includes the correct answers
exports.getAll = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category) {
      if (!mongoose.isValidObjectId(category)) return res.status(400).json({ message: 'Invalid category' });
      filter.category = category;
    }
    const questions = await Question.find(filter)
      .populate('category', 'name icon')
      .sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { data, error } = await readQuestion(req.body);
    if (error) return res.status(400).json({ message: error });
    const question = await Question.create({ ...data, createdBy: req.user._id });
    await question.populate('category', 'name icon');
    res.status(201).json(question);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Question not found' });
  try {
    const { data, error } = await readQuestion(req.body);
    if (error) return res.status(400).json({ message: error });
    const question = await Question.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true })
      .populate('category', 'name icon');
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json(question);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Question not found' });
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getQuizQuestions = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(404).json({ message: 'No questions found for this category' });
    }
    const match = { category: new mongoose.Types.ObjectId(categoryId) };
    // Every question in the category by default; ?limit=N asks for a random N instead
    const limit = parseInt(req.query.limit) > 0
      ? parseInt(req.query.limit)
      : await Question.countDocuments(match);

    // $sample also shuffles, so the order changes from quiz to quiz
    const sampled = await Question.aggregate([
      { $match: match },
      { $sample: { size: Math.max(limit, 1) } },
      { $project: { correctAnswer: 0, createdBy: 0 } }, // hide answer from frontend
    ]);
    const questions = await Question.populate(sampled, { path: 'category', select: 'name icon' });

    if (!questions.length) {
      return res.status(404).json({ message: 'No questions found for this category' });
    }

    res.json({ count: questions.length, questions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
