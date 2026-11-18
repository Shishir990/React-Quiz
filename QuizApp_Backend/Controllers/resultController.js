const mongoose = require('mongoose');
const Result = require('../Models/Result');
const Question = require('../Models/Question');
const Quiz = require('../Models/Quiz');
const QuizProgress = require('../Models/QuizProgress');
const serverError = require('../Utils/serverError');
const { PASS_MARK } = require('../Utils/quizRules');

// What the client gets back after submitting (the same for a first submit and a repeat)
const submitResponse = (r) => ({
  _id: r._id,
  score: r.score,
  total: r.total,
  percentage: r.percentage,
  passed: r.passed,
  timeTaken: r.timeTaken,
  answers: r.answers.map(({ question, selectedOption, isCorrect }) => ({ question, selectedOption, isCorrect })),
});

// POST /api/results/submit  { attemptId, answers: [{ question, selectedOption }], timeTaken }
// Scores the attempt the server opened when it served the questions (see
// getQuizQuestions), never a question list sent by the client. Each attempt gives
// exactly one result: sending the same submit again returns that result unchanged.
exports.submit = async (req, res) => {
  const { attemptId, categoryId, answers = [], timeTaken } = req.body || {};
  // Ids must be real id strings: an object would reach MongoDB as a query operator
  const isIdString = (v) => typeof v === 'string' && mongoose.isValidObjectId(v);
  if (attemptId !== undefined && !isIdString(attemptId)) {
    return res.status(400).json({ message: 'Invalid attempt' });
  }
  if (attemptId === undefined && !isIdString(categoryId)) {
    return res.status(400).json({ message: 'Invalid attempt' });
  }

  try {
    // Clients from before attempt ids send only the category: use its open attempt
    const attempt = await QuizProgress.findOne(
      attemptId ? { attemptId, user: req.user._id } : { user: req.user._id, category: categoryId }
    ).lean();

    if (!attempt) {
      // Already submitted (a retry after a lost response, a double click): same result again
      const done = attemptId && await Result.findOne({ attempt: attemptId, user: req.user._id }).lean();
      if (done) return res.status(200).json(submitResponse(done));
      return res.status(409).json({ message: 'This quiz is no longer in progress. Start it again to submit a new attempt.' });
    }

    // Score out of the questions this attempt was served (minus any deleted since)
    const questions = await Question.find({ _id: { $in: attempt.questions } }).select('correctAnswer').lean();
    const byId = new Map(questions.map((q) => [String(q._id), q]));
    const served = attempt.questions.map(String).filter((id) => byId.has(id));
    if (!served.length) {
      await QuizProgress.deleteOne({ _id: attempt._id });
      return res.status(409).json({ message: 'The questions in this quiz no longer exist. Start it again.' });
    }

    // Each served question counts once; anything else in the request is ignored
    const seen = new Set();
    const evaluated = (Array.isArray(answers) ? answers : [])
      .filter((a) => {
        const id = String(a?.question);
        if (!byId.has(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map(({ question, selectedOption }) => {
        const chosen = typeof selectedOption === 'string' ? selectedOption : '';
        return { question, selectedOption: chosen, isCorrect: byId.get(String(question)).correctAnswer === chosen };
      });

    const score = evaluated.filter((a) => a.isCorrect).length;
    const total = served.length;
    const percentage = Math.round((score / total) * 100);

    // The client's time is only accepted within what the server can vouch for:
    // - at least the time the saves show was used (the stored clock only runs down)
    // - at most the time since the questions were served, and never over the quiz length
    const startedAt = new Date(attempt.startedAt || attempt.createdAt).getTime();
    const maxTime = Math.max(0, Math.min(attempt.totalTime, Math.floor((Date.now() - startedAt) / 1000)));
    const minTime = Math.min(maxTime, Math.max(0, attempt.totalTime - attempt.secondsRemaining));
    const claimed = Number.isFinite(Number(timeTaken)) ? Math.round(Number(timeTaken)) : maxTime;
    const seconds = Math.min(maxTime, Math.max(minTime, claimed));

    let result;
    try {
      result = await Result.create({
        user: req.user._id,
        quiz: attempt.category, // Result.quiz holds the category id
        attempt: attempt.attemptId,
        answers: evaluated,
        score,
        total,
        percentage,
        passed: percentage >= PASS_MARK,
        timeTaken: seconds,
      });
    } catch (err) {
      // Two submits of one attempt at the same moment: the unique index lets only
      // one result in, and the other request returns that one
      if (err.code === 11000 && attempt.attemptId) {
        const done = await Result.findOne({ attempt: attempt.attemptId, user: req.user._id }).lean();
        if (done) return res.status(200).json(submitResponse(done));
      }
      throw err;
    }

    // Used up. Deleted only after the result is saved, so a failed save can be retried.
    try {
      await QuizProgress.deleteOne({ _id: attempt._id });
    } catch {
      // A leftover attempt can't be scored twice (the result exists) and expires in a week
    }

    res.status(201).json(submitResponse(result));
  } catch (err) {
    serverError(req, res, err);
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
    serverError(req, res, err);
  }
};

// GET /api/results/analytics — every attempt of the logged-in user, oldest first,
// reduced to what the analytics charts need: answer counts and accuracy by difficulty.
// The page filters and groups these itself, so one request covers every chart.
exports.analytics = async (req, res) => {
  try {
    const results = await Result.find({ user: req.user._id })
      .sort({ createdAt: 1 })
      .limit(1000)
      .populate({ path: 'quiz', model: 'Category', select: 'name icon' })
      .populate({ path: 'answers.question', select: 'difficulty' })
      .lean();

    res.json(results.map((r) => {
      const answered = r.answers.length;
      // Older results don't store how many questions were served; work it back from the score
      const estimated = r.percentage > 0 ? Math.round((r.score * 100) / r.percentage) : answered;
      const total = Math.max(r.total ?? estimated, answered);

      const difficulty = { easy: { correct: 0, answered: 0 }, medium: { correct: 0, answered: 0 }, hard: { correct: 0, answered: 0 } };
      r.answers.forEach((a) => {
        const level = difficulty[a.question?.difficulty]; // undefined when the question was deleted
        if (!level) return;
        level.answered++;
        if (a.isCorrect) level.correct++;
      });

      return {
        _id: r._id,
        category: r.quiz ? { _id: r.quiz._id, name: r.quiz.name, icon: r.quiz.icon } : null,
        percentage: r.percentage,
        passed: r.passed,
        timeTaken: r.timeTaken,
        createdAt: r.createdAt,
        total,
        correct: r.score,
        wrong: answered - r.score,
        skipped: total - answered,
        difficulty,
      };
    }));
  } catch (err) {
    serverError(req, res, err);
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
    serverError(req, res, err);
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
    serverError(req, res, err);
  }
};
