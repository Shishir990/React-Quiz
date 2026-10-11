const Category = require('../Models/Category');
const Quiz = require('../Models/Quiz');
const Question = require('../Models/Question');

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

exports.create = async (req, res) => {
  try {
    const category = await Category.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};