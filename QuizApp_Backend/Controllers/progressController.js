const mongoose = require('mongoose');
const QuizProgress = require('../Models/QuizProgress');
const Question = require('../Models/Question');
const serverError = require('../Utils/serverError');

const { MAX_QUESTIONS, MAX_AGE_MS } = require('../Utils/quizRules');

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
    serverError(req, res, err);
  }
};

// GET /api/progress/:categoryId: the saved quiz with its questions (answers hidden)
exports.getOne = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!isId(categoryId)) return notFound(res);

    const progress = await QuizProgress.findOne({ user: req.user._id, category: categoryId }).lean();
    if (!progress) return notFound(res);

    // Saves made before attempts had ids get one now, so they can still be submitted
    if (!progress.attemptId) {
      progress.attemptId = new mongoose.Types.ObjectId();
      await QuizProgress.updateOne({ _id: progress._id, attemptId: { $exists: false } }, { $set: { attemptId: progress.attemptId } });
    }

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

    // Some questions were deleted: store the shortened attempt, so the client's next
    // save (which sends this list) matches it
    if (questions.length !== progress.questions.length) {
      const keys = (obj) => Object.keys(obj).map(Number);
      await QuizProgress.updateOne({ _id: progress._id }, {
        $set: { questions: questions.map((q) => q._id), answers, visited: keys(visited), marked: keys(marked), index },
      });
    }

    res.json({
      categoryId,
      attemptId: progress.attemptId,
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
    serverError(req, res, err);
  }
};

// PUT /api/progress/:categoryId: update the unfinished attempt.
// Only starting a quiz creates one (GET /api/questions/quiz/:categoryId), so a save
// can't change which questions were served; it only records answers, position and time.
exports.save = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { attemptId, questionIds, answers = {}, visited = {}, marked = {}, index = 0, secondsRemaining, savedAt } = req.body || {};
    if (!isId(categoryId)) return reject(req, res, 400, 'Invalid category');

    if (!Array.isArray(questionIds) || !questionIds.length || questionIds.length > MAX_QUESTIONS
        || !questionIds.every(isId) || new Set(questionIds.map(String)).size !== questionIds.length) {
      return reject(req, res, 400, 'Invalid question list', {
        type: Array.isArray(questionIds) ? 'array' : typeof questionIds,
        count: Array.isArray(questionIds) ? questionIds.length : undefined,
      });
    }
    if (attemptId !== undefined && !isId(attemptId)) return reject(req, res, 400, 'Invalid attempt');

    // Clients from before attempt ids send none; they match on the question list alone
    const filter = { user: req.user._id, category: categoryId, ...(attemptId ? { attemptId } : {}) };
    const existing = await QuizProgress.findOne(filter).select('questions secondsRemaining').lean();
    if (!existing) {
      return reject(req, res, 409, 'This quiz is no longer in progress. Start it again.', { attemptId });
    }
    if (existing.questions.map(String).join() !== questionIds.map(String).join()) {
      return reject(req, res, 409, 'These are not the questions this quiz was started with.', { attemptId });
    }

    const n = questionIds.length;
    // The clock only runs down: a save can never add time back. At 0 the attempt is
    // kept, so the player can still submit it; it just can't be resumed.
    const seconds = Math.max(0, Math.min(Math.floor(Number(secondsRemaining) || 0), existing.secondsRemaining));

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
      { _id: existing._id },
      {
        $set: {
          answers: cleanAnswers,
          visited: cleanVisited,
          marked: cleanMarked,
          index: at,
          secondsRemaining: seconds,
          clientSavedAt: Number.isFinite(savedAt) ? Math.min(savedAt, Date.now()) : Date.now(),
        },
      }
    );
    res.json({ saved: true, secondsRemaining: seconds });
  } catch (err) {
    reject(req, res, 500, 'Could not save your progress. Please try again.', { error: err.message });
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
    serverError(req, res, err);
  }
};
