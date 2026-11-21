const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const LiveGame = require('../Models/LiveGame');
const serverError = require('../Utils/serverError');

// Live games run on a separate Socket.IO server (QuizApp_Live). It can't read this
// site's sign-in cookies, so the browser asks here for a short ticket and sends it
// when connecting. Tickets are signed with LIVE_TICKET_SECRET (not JWT_SECRET), so
// the live server can check them without being able to mint real sign-in tokens.
const TICKET_TTL = '60s';
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

// POST /api/live/ticket -> { ticket, url }
exports.ticket = (req, res) => {
  const secret = process.env.LIVE_TICKET_SECRET;
  // Locally the live server runs next to this one; in production its address must be set
  const url = process.env.LIVE_SERVER_URL || (isProduction ? '' : 'http://localhost:8090');
  if (!secret || !url) {
    return res.status(503).json({ message: 'Live games are not available right now.' });
  }
  const ticket = jwt.sign(
    { id: String(req.user._id), tv: req.user.tokenVersion || 0 },
    secret,
    { expiresIn: TICKET_TTL, audience: 'quizapp-live' },
  );
  res.json({ ticket, url });
};


const HISTORY_SIZE = 100;
const mine = (players, userId) => players.find((p) => String(p.user) === String(userId));

// GET /api/live/games: live games I played (hosting counts), newest first
exports.myGames = async (req, res) => {
  try {
    const games = await LiveGame.find({ 'players.user': req.user._id })
      .sort({ endedAt: -1 })
      .limit(HISTORY_SIZE)
      .select('mode source hostName host endedAt startedAt players.user players.name players.rank players.score players.correct questions.text')
      .lean();
    res.json(games.map((g) => {
      const me = mine(g.players, req.user._id);
      const winner = g.players.find((p) => p.rank === 1);
      return {
        _id: g._id,
        mode: g.mode,
        source: { kind: g.source?.kind, name: g.source?.name },
        hostName: g.hostName,
        isHost: String(g.host) === String(req.user._id),
        startedAt: g.startedAt,
        endedAt: g.endedAt,
        total: g.questions.length,
        players: g.players.length,
        me: me ? { rank: me.rank, score: me.score, correct: me.correct } : null,
        winner: winner ? { name: winner.name, score: winner.score } : null,
      };
    }));
  } catch (err) {
    serverError(req, res, err);
  }
};

// GET /api/live/games/:id: one game I played. Everyone's ranking, but only my own
// answers (with how many players picked each option).
exports.getGame = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Game not found' });
    const g = await LiveGame.findOne({ _id: req.params.id, 'players.user': req.user._id }).lean();
    if (!g) return res.status(404).json({ message: 'Game not found' });
    const me = mine(g.players, req.user._id);
    res.json({
      _id: g._id,
      code: g.code,
      mode: g.mode,
      source: { kind: g.source?.kind, name: g.source?.name },
      hostName: g.hostName,
      isHost: String(g.host) === String(req.user._id),
      seconds: g.seconds,
      totalSeconds: g.totalSeconds,
      startedAt: g.startedAt,
      endedAt: g.endedAt,
      total: g.questions.length,
      ranking: g.players.map((p) => ({
        rank: p.rank, name: p.name, score: p.score, correct: p.correct, timeMs: p.timeMs,
        isMe: String(p.user) === String(req.user._id),
      })),
      review: g.questions.map((q, i) => ({
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        myAnswer: me.answers[i]?.option ?? null,
        isCorrect: !!me.answers[i]?.isCorrect,
        points: me.answers[i]?.points ?? 0,
        counts: q.options.map((o) => g.players.filter((p) => p.answers[i]?.option === o).length),
      })),
    });
  } catch (err) {
    serverError(req, res, err);
  }
};
