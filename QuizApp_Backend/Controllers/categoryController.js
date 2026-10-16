const Category = require('../Models/Category');
const Quiz = require('../Models/Quiz');
const Question = require('../Models/Question');
const mongoose = require('mongoose');

exports.getAll = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    // Count published quizzes per category
    const quizCounts = await Quiz.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    // Quizzes are played per category from its questions, so count those too,
    // broken down by difficulty
    const questionStats = await Question.aggregate([
      { $group: { _id: { category: '$category', difficulty: '$difficulty' }, count: { $sum: 1 } } },
    ]);

    // Map counts onto categories
    const countMap = {};
    quizCounts.forEach(({ _id, count }) => {
      countMap[_id.toString()] = count;
    });

    const questionMap = {};
    questionStats.forEach(({ _id, count }) => {
      const key = _id.category.toString();
      questionMap[key] = questionMap[key] || { easy: 0, medium: 0, hard: 0 };
      questionMap[key][_id.difficulty || 'medium'] += count;
    });

    const result = categories.map((cat) => {
      const byDifficulty = questionMap[cat._id.toString()] || { easy: 0, medium: 0, hard: 0 };
      return {
        ...cat.toObject(),
        quizCount: countMap[cat._id.toString()] || 0,
        questionCount: byDifficulty.easy + byDifficulty.medium + byDifficulty.hard,
        difficulty: byDifficulty,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Pick and check the editable fields; returns { data } or { error }
function readCategory(body) {
  const name = String(body.name || '').trim();
  if (!name) return { error: 'Category name is required' };
  if (name.length > 60) return { error: 'Keep the name under 60 characters' };
  return {
    data: {
      name,
      description: String(body.description || '').trim(),
      icon: String(body.icon || '').trim(),
    },
  };
}

const duplicateName = (err) => err.code === 11000;

exports.create = async (req, res) => {
  try {
    const { data, error } = readCategory(req.body);
    if (error) return res.status(400).json({ message: error });
    const category = await Category.create({ ...data, createdBy: req.user._id });
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: duplicateName(err) ? 'A category with this name already exists' : err.message });
  }
};

exports.update = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Category not found' });
  try {
    const { data, error } = readCategory(req.body);
    if (error) return res.status(400).json({ message: error });
    const category = await Category.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(400).json({ message: duplicateName(err) ? 'A category with this name already exists' : err.message });
  }
};

// Deletes the category and its questions; past results keep their scores
exports.remove = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Category not found' });
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    const { deletedCount } = await Question.deleteMany({ category: category._id });
    res.json({ message: 'Category deleted', questionsDeleted: deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
