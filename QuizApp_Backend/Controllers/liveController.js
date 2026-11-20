const jwt = require('jsonwebtoken');

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
