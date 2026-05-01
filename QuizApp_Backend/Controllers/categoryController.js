const Category = require('../Models/Category');
const Quiz = require('../Models/Quiz');

exports.getAll = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    // Count published quizzes per category
    const quizCounts = await Quiz.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    // Map counts onto categories
    const countMap = {};
    quizCounts.forEach(({ _id, count }) => {
      countMap[_id.toString()] = count;
    });

    const result = categories.map((cat) => ({
      ...cat.toObject(),
      quizCount: countMap[cat._id.toString()] || 0,
    }));

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