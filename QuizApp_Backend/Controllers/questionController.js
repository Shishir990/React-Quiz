const Question = require('../Models/Question');
const mongoose = require('mongoose');


exports.getAll = async (req, res) => {
  const { category } = req.query;
  const filter = category ? { category } : {};
  const questions = await Question.find(filter).populate('category', 'name');
  res.json(questions);
};

exports.create = async (req, res) => {
  try {
    const question = await Question.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(question);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(question);
};

exports.remove = async (req, res) => {
  await Question.findByIdAndDelete(req.params.id);
  res.json({ message: 'Question deleted' });
};

exports.getQuizQuestions = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const limit = parseInt(req.query.limit) || 15;

    const questions = await Question.find({ category: categoryId })
      .populate('category', 'name icon')
      .limit(limit)
      .select('-correctAnswer -createdBy'); // hide answer from frontend

    if (!questions.length) {
      return res.status(404).json({ message: 'No questions found for this category' });
    }

    res.json({ count: questions.length, questions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};