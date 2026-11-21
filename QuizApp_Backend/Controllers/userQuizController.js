const mongoose = require('mongoose');
const UserQuiz = require('../Models/UserQuiz');
const serverError = require('../Utils/serverError');
const inputError = require('../Utils/inputError');

// Same limits as the quiz builder in the app (src/utils/userQuiz.js)
const LIMITS = {
  MAX_QUIZZES: 50,        // per player
  MIN_QUESTIONS: 3,
  MAX_QUESTIONS: 50,
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 6,
  TITLE: 100,
  DESCRIPTION: 300,
  TEXT: 500,
  OPTION: 200,
  EXPLANATION: 500,
};

const clean = (v) => (typeof v === 'string' ? v.trim() : '');

// Pick and check the editable fields; returns { data } or { error }
function readQuiz(body = {}) {
  const title = clean(body.title);
  const description = clean(body.description);
  if (!title) return { error: 'Give the quiz a title' };
  if (title.length > LIMITS.TITLE) return { error: `Keep the title under ${LIMITS.TITLE} characters` };
  if (description.length > LIMITS.DESCRIPTION) return { error: `Keep the description under ${LIMITS.DESCRIPTION} characters` };

  const list = Array.isArray(body.questions) ? body.questions : [];
  if (list.length < LIMITS.MIN_QUESTIONS) return { error: `Add at least ${LIMITS.MIN_QUESTIONS} questions` };
  if (list.length > LIMITS.MAX_QUESTIONS) return { error: `Use at most ${LIMITS.MAX_QUESTIONS} questions` };

  const questions = [];
  for (let i = 0; i < list.length; i++) {
    const q = list[i] || {};
    const n = `Question ${i + 1}`;
    const text = clean(q.text);
    // Strings only: anything else would be stored as "[object Object]"
    const options = Array.isArray(q.options) ? q.options.map(clean).filter(Boolean) : [];
    const correctAnswer = clean(q.correctAnswer);
    const explanation = clean(q.explanation);

    if (!text) return { error: `${n}: write the question` };
    if (text.length > LIMITS.TEXT) return { error: `${n}: keep it under ${LIMITS.TEXT} characters` };
    if (options.length < LIMITS.MIN_OPTIONS) return { error: `${n}: add at least ${LIMITS.MIN_OPTIONS} options` };
    if (options.length > LIMITS.MAX_OPTIONS) return { error: `${n}: use at most ${LIMITS.MAX_OPTIONS} options` };
    if (options.some((o) => o.length > LIMITS.OPTION)) return { error: `${n}: keep each option under ${LIMITS.OPTION} characters` };
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return { error: `${n}: two options are the same` };
    if (!options.includes(correctAnswer)) return { error: `${n}: mark which option is correct` };
    if (explanation.length > LIMITS.EXPLANATION) return { error: `${n}: keep the explanation under ${LIMITS.EXPLANATION} characters` };
    questions.push({ text, options, correctAnswer, explanation });
  }
  return { data: { title, description, questions } };
}

// The signed-in player's own quiz, or null (someone else's quiz is "not found" too)
const findMine = (req) => (mongoose.isValidObjectId(req.params.id)
  ? UserQuiz.findOne({ _id: req.params.id, owner: req.user._id })
  : null);

// GET /api/user-quizzes: my quizzes, newest change first (without the questions)
exports.listMine = async (req, res) => {
  try {
    const quizzes = await UserQuiz.aggregate([
      { $match: { owner: req.user._id } },
      { $sort: { updatedAt: -1 } },
      { $project: { title: 1, description: 1, createdAt: 1, updatedAt: 1, questionCount: { $size: '$questions' } } },
    ]);
    res.json(quizzes);
  } catch (err) {
    serverError(req, res, err);
  }
};

// GET /api/user-quizzes/:id: one of my quizzes, with answers (for editing)
exports.getOne = async (req, res) => {
  try {
    const quiz = await findMine(req)?.lean();
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    serverError(req, res, err);
  }
};

// POST /api/user-quizzes
exports.create = async (req, res) => {
  const { data, error } = readQuiz(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    if (await UserQuiz.countDocuments({ owner: req.user._id }) >= LIMITS.MAX_QUIZZES) {
      return res.status(400).json({ message: `You can keep up to ${LIMITS.MAX_QUIZZES} quizzes. Delete one to make room.` });
    }
    const quiz = await UserQuiz.create({ ...data, owner: req.user._id });
    res.status(201).json(quiz);
  } catch (err) {
    inputError(req, res, err);
  }
};

// PUT /api/user-quizzes/:id: replaces the title, description and questions
exports.update = async (req, res) => {
  const { data, error } = readQuiz(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    const quiz = await findMine(req);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    quiz.set(data);
    await quiz.save();
    res.json(quiz);
  } catch (err) {
    inputError(req, res, err);
  }
};

// DELETE /api/user-quizzes/:id
exports.remove = async (req, res) => {
  try {
    const quiz = await findMine(req);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    await quiz.deleteOne();
    res.json({ message: 'Quiz deleted' });
  } catch (err) {
    serverError(req, res, err);
  }
};
