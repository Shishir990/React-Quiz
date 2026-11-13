const mongoose = require('mongoose');
const QuizProgress = require('../Models/QuizProgress');
const Question = require('../Models/Question');

const SECONDS_PER_QUESTION = 10;
const MAX_QUESTIONS = 500;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // abandoned quizzes expire after a week

const isId = (id) => mongoose.isValidObjectId(id);
// "Nothing saved" is a normal answer, not an error: 204 keeps the browser
// console clean (a 404 is logged in red on every quiz start)
const notFound = (res) => res.status(204).end();

// One line per refused save / deleted save, so a quiz that can't be resumed can be
// traced in the server (Vercel) logs. Ids only: no tokens or personal details.
const logEvent = (req, event, details = {}) => {
  console.warn(`[progress] ${event}`, JSON.stringify({
    user: String(req.user?._id || ''),
    category: req.params?.categoryId,
    ...details,
  }));
};
const reject = (req, res, status, message, details) => {
  logEvent(req, `save refused (${status}): ${message}`, details);
  return res.status(status).json({ message });
};

// GET /api/progress: which categories have a quiz in progress (for "Resume" buttons)
exports.listMine = async (req, res) => {
  try {
    const since = new Date(Date.now() - MAX_AGE_MS);
    const saved = await QuizProgress.find({ user: req.user._id, updatedAt: { $gte: since }, secondsRemaining: { $gt: 0 } })
      .select('category questions answers secondsRemaining updatedAt')
      .lean();
    res.json(saved.map((p) => ({
      category: p.category,
      total: p.questions.length,
      answered: Object.keys(p.answers || {}).length,
      secondsRemaining: p.secondsRemaining,
      updatedAt: p.updatedAt,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/progress/:categoryId: the saved quiz with its questions (answers hidden)
exports.getOne = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!isId(categoryId)) return notFound(res);

    const progress = await QuizProgress.findOne({ user: req.user._id, category: categoryId }).lean();
    if (!progress) return notFound(res);

    if (progress.secondsRemaining <= 0 || Date.now() - new Date(progress.updatedAt) > MAX_AGE_MS) {
      logEvent(req, 'deleted on read: expired', { secondsRemaining: progress.secondsRemaining, updatedAt: progress.updatedAt });
      await QuizProgress.deleteOne({ _id: progress._id });
      return notFound(res);
    }

    // Same fields the quiz endpoint sends: never the correct answer or explanation
    const docs = await Question.find({ _id: { $in: progress.questions }, category: categoryId })
      .select('-correctAnswer -explanation -createdBy -createdAt -updatedAt -__v')
      .populate('category', 'name icon')
      .lean();
    const byId = new Map(docs.map((q) => [String(q._id), q]));

    // Keep the saved order. If an admin deleted a question since, drop it and shift positions.
    const questions = [];
    const answers = {};
    const visited = {};
    const marked = {};
    const savedAnswers = progress.answers || {};
    const savedVisited = new Set(progress.visited || []);
    const savedMarked = new Set(progress.marked || []);
    let index = 0;
    progress.questions.forEach((id, oldPos) => {
      const q = byId.get(String(id));
      if (!q) return;
      const newPos = questions.length;
      questions.push(q);
      const picked = savedAnswers[oldPos];
      if (Number.isInteger(picked) && picked >= 0 && picked < q.options.length) answers[newPos] = picked;
      if (savedVisited.has(oldPos)) visited[newPos] = true;
      if (savedMarked.has(oldPos)) marked[newPos] = true;
      if (oldPos <= progress.index) index = newPos;
    });

    if (!questions.length) {
      logEvent(req, 'deleted on read: none of its questions exist any more', { saved: progress.questions.length });
      await QuizProgress.deleteOne({ _id: progress._id });
      return notFound(res);
    }

    res.json({
      categoryId,
      Questions: questions,
      answers,
      visited,
      marked,
      index,
      secondsRemaining: progress.secondsRemaining,
      totalTime: progress.totalTime,
      savedAt: progress.clientSavedAt || new Date(progress.updatedAt).getTime(),
    });
  } catch (err) {
    logEvent(req, 'read failed (500)', { error: err.message });
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/progress/:categoryId: create or update the saved quiz
exports.save = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { questionIds, answers = {}, visited = {}, marked = {}, index = 0, secondsRemaining, savedAt } = req.body || {};
    if (!isId(categoryId)) return reject(req, res, 400, 'Invalid category');

    if (!Array.isArray(questionIds) || !questionIds.length || questionIds.length > MAX_QUESTIONS
        || !questionIds.every(isId) || new Set(questionIds.map(String)).size !== questionIds.length) {
      return reject(req, res, 400, 'Invalid question list', {
        type: Array.isArray(questionIds) ? 'array' : typeof questionIds,
        count: Array.isArray(questionIds) ? questionIds.length : undefined,
      });
    }
    const filter = { user: req.user._id, category: categoryId };

    // Time ran out: nothing left to resume
    if (!(Number(secondsRemaining) > 0)) {
      logEvent(req, 'deleted on save: no time left', { secondsRemaining });
      await QuizProgress.deleteOne(filter);
      return res.json({ saved: false });
    }

    const existing = await QuizProgress.findOne(filter).select('questions secondsRemaining').lean();
    const sameQuiz = !!existing && existing.questions.map(String).join() === questionIds.map(String).join();

    // A new set of questions must all belong to this category
    if (!sameQuiz) {
      const count = await Question.countDocuments({ _id: { $in: questionIds }, category: categoryId });
      if (count !== questionIds.length) {
        return reject(req, res, 400, 'Questions do not match this category', { sent: questionIds.length, inCategory: count });
      }
    }

    const n = questionIds.length;
    const totalTime = n * SECONDS_PER_QUESTION;
    // The clock only runs down: a save can never add time back
    let seconds = Math.min(Math.floor(Number(secondsRemaining)), totalTime);
    if (sameQuiz) seconds = Math.min(seconds, existing.secondsRemaining);

    const cleanAnswers = {};
    for (const [pos, opt] of Object.entries(answers || {})) {
      const p = Number(pos);
      if (Number.isInteger(p) && p >= 0 && p < n && Number.isInteger(opt) && opt >= 0 && opt < 10) cleanAnswers[p] = opt;
    }
    const positions = (obj) => Object.keys(obj || {}).map(Number).filter((p) => Number.isInteger(p) && p >= 0 && p < n);
    const cleanVisited = positions(visited);
    const cleanMarked = positions(marked);
    const at = Number.isInteger(index) && index >= 0 && index < n ? index : 0;

    await QuizProgress.updateOne(
      filter,
      {
        $set: {
          questions: questionIds,
          answers: cleanAnswers,
          visited: cleanVisited,
          marked: cleanMarked,
          index: at,
          secondsRemaining: seconds,
          totalTime,
          clientSavedAt: Number.isFinite(savedAt) ? Math.min(savedAt, Date.now()) : Date.now(),
        },
      },
      { upsert: true }
    );
    res.json({ saved: true, secondsRemaining: seconds });
  } catch (err) {
    reject(req, res, 500, err.message);
  }
};

// DELETE /api/progress/:categoryId: "Exit & restart" / "Start over"
exports.remove = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (isId(categoryId)) {
      const { deletedCount } = await QuizProgress.deleteOne({ user: req.user._id, category: categoryId });
      if (deletedCount) logEvent(req, 'deleted by player (Exit & restart / Start over / submit)');
    }
    res.json({ deleted: true });
  } catch (err) {
    logEvent(req, 'delete failed (500)', { error: err.message });
    res.status(500).json({ message: err.message });
  }
};
