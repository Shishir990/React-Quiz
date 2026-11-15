const Quiz = require('../Models/Quiz');
const serverError = require('../Utils/serverError');
const inputError = require('../Utils/inputError');

exports.getAll = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isPublished: true };
    if (category) filter.category = category;

    const quizzes = await Quiz.find(filter)
      .populate('category', 'name icon')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (err) {
    serverError(req, res, err);
  }
};

exports.getOne = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('category', 'name icon')
      .populate('questions');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    serverError(req, res, err);
  }
};

exports.create = async (req, res) => {
  try {
    const quiz = await Quiz.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(quiz);
  } catch (err) {
    inputError(req, res, err);
  }
};

exports.update = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    inputError(req, res, err);
  }
};

exports.remove = async (req, res) => {
  try {
    await Quiz.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quiz deleted' });
  } catch (err) {
    serverError(req, res, err);
  }
};