const mongoose = require('mongoose');
const User = require('../Models/Users');
const Category = require('../Models/Category');
const Question = require('../Models/Question');
const Result = require('../Models/Result');

const DAY = 24 * 60 * 60 * 1000;
const ACTIVITY_DAYS = 14;

// GET /api/admin/stats — numbers for the console overview
exports.stats = async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * DAY);
    const since = new Date(Date.now() - ACTIVITY_DAYS * DAY);

    const [users, admins, newUsers, categories, questions, noExplanation, perCategory, attempts, attemptsWeek, avg, activity, recent, byCategory] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      Category.find().select('name icon createdAt').lean(),
      Question.countDocuments(),
      Question.countDocuments({ $or: [{ explanation: '' }, { explanation: { $exists: false } }] }),
      Question.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Result.countDocuments(),
      Result.countDocuments({ createdAt: { $gte: weekAgo } }),
      Result.aggregate([{ $group: { _id: null, pct: { $avg: '$percentage' }, passed: { $sum: { $cond: ['$passed', 1, 0] } } } }]),
      Result.aggregate([
        { $match: { createdAt: { $gte: since } } },
        // Days are bucketed in UTC
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      Result.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .select('user quiz percentage passed createdAt')
        .populate('user', 'name')
        .populate({ path: 'quiz', model: 'Category', select: 'name icon' })
        .lean(),
      // Attempts and average score per category (Result.quiz holds the category id)
      Result.aggregate([
        { $group: { _id: '$quiz', attempts: { $sum: 1 }, avg: { $avg: '$percentage' } } },
        { $sort: { attempts: -1 } },
      ]),
    ]);

    const counts = new Map(perCategory.map((c) => [String(c._id), c.count]));
    const days = [...Array(ACTIVITY_DAYS)].map((_, i) => {
      const key = new Date(Date.now() - (ACTIVITY_DAYS - 1 - i) * DAY).toISOString().slice(0, 10);
      return { day: key, count: activity.find((a) => a._id === key)?.count || 0 };
    });

    res.json({
      users: { total: users, admins, newThisWeek: newUsers },
      content: {
        categories: categories.length,
        questions,
        // Categories players can't start because they have no questions
        emptyCategories: categories.filter((c) => !counts.get(String(c._id))).map((c) => ({ _id: c._id, name: c.name, icon: c.icon })),
        missingExplanations: noExplanation,
      },
      attempts: {
        total: attempts,
        thisWeek: attemptsWeek,
        avgScore: avg[0] ? Math.round(avg[0].pct) : 0,
        passRate: attempts && avg[0] ? Math.round((avg[0].passed / attempts) * 100) : 0,
      },
      activity: days,
      popular: byCategory
        .map((b) => ({ cat: categories.find((c) => String(c._id) === String(b._id)), attempts: b.attempts, avgScore: Math.round(b.avg) }))
        .filter((b) => b.cat)
        .slice(0, 5)
        .map(({ cat, ...rest }) => ({ _id: cat._id, name: cat.name, icon: cat.icon, createdAt: cat.createdAt, ...rest })),
      recent: recent.map((r) => ({
        _id: r._id,
        user: r.user ? r.user.name : 'Deleted user',
        category: r.quiz ? { _id: r.quiz._id, name: r.quiz.name, icon: r.quiz.icon } : null,
        percentage: r.percentage,
        passed: r.passed,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/users — every account with its quiz activity
exports.users = async (req, res) => {
  try {
    const [users, activity] = await Promise.all([
      User.find().select('-password').sort({ createdAt: -1 }).lean(),
      Result.aggregate([
        { $group: { _id: '$user', quizzes: { $sum: 1 }, avg: { $avg: '$percentage' }, last: { $max: '$createdAt' } } },
      ]),
    ]);
    const byUser = new Map(activity.map((a) => [String(a._id), a]));

    res.json(users.map((u) => {
      const a = byUser.get(String(u._id));
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive !== false,
        createdAt: u.createdAt,
        quizzes: a?.quizzes || 0,
        avgScore: a ? Math.round(a.avg) : null,
        lastActive: a?.last || null,
      };
    }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Shared guard for changes to another user's account
async function findOtherUser(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ message: 'User not found' });
    return null;
  }
  // Admins can't demote or disable themselves, so there is always at least one admin
  if (String(req.params.id) === String(req.user._id)) {
    res.status(400).json({ message: "You can't change your own account here" });
    return null;
  }
  const user = await User.findById(req.params.id).select('-password');
  if (!user) res.status(404).json({ message: 'User not found' });
  return user;
}

const publicUser = (u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role, isActive: u.isActive !== false });

// PATCH /api/admin/users/:id/role  { role: 'admin' | 'player' }
exports.setRole = async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'player'].includes(role)) return res.status(400).json({ message: 'Role must be admin or player' });
  try {
    const user = await findOtherUser(req, res);
    if (!user) return;
    user.role = role;
    await user.save();
    res.json(publicUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/admin/users/:id/status  { isActive: boolean }
exports.setStatus = async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') return res.status(400).json({ message: 'isActive must be true or false' });
  try {
    const user = await findOtherUser(req, res);
    if (!user) return;
    user.isActive = isActive;
    await user.save();
    res.json(publicUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
