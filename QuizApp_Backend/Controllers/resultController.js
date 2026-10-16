const mongoose = require('mongoose');
const Result = require('../Models/Result');
const Question = require('../Models/Question');
const Quiz = require('../Models/Quiz');

exports.submit = async (req, res) => {
  const { categoryId, answers = [], timeTaken, questionIds } = req.body;
  // answers: [{ question: "questionId", selectedOption: "answer" }]
  // questionIds: every question the player was shown, answered or not
  console.log('Submit body received:', { categoryId, answers, timeTaken });
  try {
    // Fetch questions WITH correctAnswer from DB
    const questions = await Question.find({ category: categoryId });
    console.log('Questions found:', questions.length);
    if (!questions.length) {
      return res.status(404).json({ message: 'Questions not found' });
    }

    const inCategory = new Map(questions.map((q) => [q._id.toString(), q]));
    // Score out of the questions actually served. Older clients don't send
    // questionIds, so fall back to the whole category as before.
    const served = Array.isArray(questionIds)
      ? [...new Set(questionIds.map(String))].filter((id) => inCategory.has(id))
      : [...inCategory.keys()];
    const servedSet = new Set(served);

    let score = 0;
    const seen = new Set();

    // Check each answer against DB; count each served question at most once
    const evaluated = (Array.isArray(answers) ? answers : [])
      .filter(({ question }) => {
        const id = String(question);
        if (!servedSet.has(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map(({ question, selectedOption }) => {
        const isCorrect = inCategory.get(String(question)).correctAnswer === selectedOption;
        if (isCorrect) score++;
        return { question, selectedOption, isCorrect };
      });

    const total = served.length || questions.length;
    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= 50; // pass mark

    const result = await Result.create({
      user: req.user._id,
      quiz: categoryId,
      answers: evaluated,
      score,
      percentage,
      passed,
      timeTaken
    });

    // Send back evaluated answers so frontend can show correct/wrong
    res.status(201).json({
      _id: result._id,
      score,
      total,
      percentage,
      passed,
      timeTaken,
      answers: evaluated  // ← frontend uses this to highlight correct/wrong
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// GET /api/results/me — the logged-in user's quiz history, newest first
exports.myHistory = async (req, res) => {
  try {
    const results = await Result.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .select('-answers')
      // `quiz` holds the category id (see submit), so populate from Category
      .populate({ path: 'quiz', model: 'Category', select: 'name icon' })
      .lean();

    res.json(results.map((r) => ({
      _id: r._id,
      category: r.quiz ? { _id: r.quiz._id, name: r.quiz.name, icon: r.quiz.icon } : null,
      score: r.score,
      percentage: r.percentage,
      passed: r.passed,
      timeTaken: r.timeTaken,
      createdAt: r.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/results/:id — one of the logged-in user's attempts, with each question
exports.getOne = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Result not found' });
  }
  try {
    const result = await Result.findOne({ _id: req.params.id, user: req.user._id })
      .populate({ path: 'quiz', model: 'Category', select: 'name icon' })
      .populate({ path: 'answers.question', select: 'text options correctAnswer explanation difficulty' })
      .lean();
    if (!result) return res.status(404).json({ message: 'Result not found' });

    res.json({
      _id: result._id,
      category: result.quiz ? { _id: result.quiz._id, name: result.quiz.name, icon: result.quiz.icon } : null,
      score: result.score,
      percentage: result.percentage,
      passed: result.passed,
      timeTaken: result.timeTaken,
      createdAt: result.createdAt,
      answers: result.answers.map((a) => ({
        selectedOption: a.selectedOption,
        isCorrect: a.isCorrect,
        // null when the question has since been deleted
        question: a.question ? {
          text: a.question.text,
          options: a.question.options,
          correctAnswer: a.question.correctAnswer,
          explanation: a.question.explanation,
          difficulty: a.question.difficulty,
        } : null,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const PERIOD_DAYS = { week: 7, month: 30 };
const LEADERBOARD_SIZE = 50;

// GET /api/results/leaderboard?period=week|month|all&category=<id>
// Points = the sum of each player's best score (%) in every category they played,
// so replaying a quiz can only raise a score, never farm points.
// Ties go to the player whose best attempts took less time in total.
exports.leaderboard = async (req, res) => {
  const period = PERIOD_DAYS[req.query.period] ? req.query.period : req.query.period === 'all' ? 'all' : 'week';
  const { category } = req.query;

  const match = {};
  if (period !== 'all') {
    match.createdAt = { $gte: new Date(Date.now() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000) };
  }
  if (category) {
    if (!mongoose.isValidObjectId(category)) return res.status(400).json({ message: 'Invalid category' });
    match.quiz = new mongoose.Types.ObjectId(category);
  }

  try {
    const rows = await Result.aggregate([
      { $match: match },
      // Best attempt first within each user + category
      { $sort: { percentage: -1, timeTaken: 1 } },
      { $group: {
        _id: { user: '$user', quiz: '$quiz' },
        best: { $first: '$percentage' },
        bestTime: { $first: { $ifNull: ['$timeTaken', 0] } },
        attempts: { $sum: 1 },
        pctSum: { $sum: '$percentage' },
      } },
      { $group: {
        _id: '$_id.user',
        points: { $sum: '$best' },
        time: { $sum: '$bestTime' },
        categories: { $sum: 1 },
        attempts: { $sum: '$attempts' },
        pctSum: { $sum: '$pctSum' },
      } },
      { $sort: { points: -1, time: 1, _id: 1 } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user', pipeline: [{ $project: { name: 1, avatar: 1, isActive: 1 } }] } },
      { $unwind: '$user' },
      { $match: { 'user.isActive': { $ne: false } } },
    ]);

    const players = rows.map((r, i) => ({
      rank: i + 1,
      userId: r._id,
      name: r.user.name,
      avatar: r.user.avatar,
      points: r.points,
      quizzes: r.attempts,
      categories: r.categories,
      avgScore: Math.round(r.pctSum / r.attempts),
      time: r.time,
    }));

    const myId = req.user._id.toString();
    res.json({
      period,
      category: category || null,
      totalPlayers: players.length,
      players: players.slice(0, LEADERBOARD_SIZE),
      me: players.find((p) => p.userId.toString() === myId) || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
