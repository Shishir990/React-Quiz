// Sign-in sessions held in httpOnly cookies, so page scripts can never read them:
// - access token: a 15-minute JWT { id, tv } sent with every /api request
// - refresh token: a random 30-day token sent only to /api/auth, stored hashed in
//   the sessions collection and rotated (single use) on every refresh
// `tv` is the user's tokenVersion: bumping it ends every access token at once.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Session = require('../Models/Session');

const ACCESS_COOKIE = 'qa_access';
const REFRESH_COOKIE = 'qa_refresh';
// Readable by the page, holds no secret: only tells the app a session may exist, so
// signed-out visitors don't make a session request that is bound to fail
const HINT_COOKIE = 'qa_session';
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 30;
const REFRESH_MAX_AGE_MS = REFRESH_DAYS * 24 * 60 * 60 * 1000;
// Two tabs refreshing at the same moment can both send the same (just rotated)
// token; within this window that's treated as a race, not as theft
const REUSE_GRACE_MS = 15 * 1000;

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const cookieBase = {
  httpOnly: true,                // not readable by JavaScript
  secure: isProduction,          // HTTPS only in production (local dev is plain http)
  sameSite: 'lax',               // not sent on cross-site POSTs (CSRF), still sent on normal links
};

const signAccessToken = (user) =>
  jwt.sign({ id: user._id, tv: user.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });

function setAccessCookie(res, user) {
  res.cookie(ACCESS_COOKIE, signAccessToken(user), { ...cookieBase, path: '/api', maxAge: ACCESS_MAX_AGE_MS });
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, { ...cookieBase, path: '/api/auth', maxAge: REFRESH_MAX_AGE_MS });
  res.cookie(HINT_COOKIE, '1', { ...cookieBase, httpOnly: false, path: '/', maxAge: REFRESH_MAX_AGE_MS });
}

function clearSessionCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { ...cookieBase, path: '/api' });
  res.clearCookie(REFRESH_COOKIE, { ...cookieBase, path: '/api/auth' });
  res.clearCookie(HINT_COOKIE, { ...cookieBase, httpOnly: false, path: '/' });
}

// A new refresh session for this device; returns the Session row.
// `previous` is the row being rotated, so the device keeps its id and sign-in time.
async function createSession(req, res, user, previous = null) {
  const token = crypto.randomBytes(32).toString('hex');
  const _id = new mongoose.Types.ObjectId();
  const session = await Session.create({
    _id,
    user: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + REFRESH_MAX_AGE_MS),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
    ip: String(req.ip || '').replace(/^::ffff:/, '').slice(0, 45),
    family: previous ? (previous.family || previous._id) : _id,
    startedAt: previous ? (previous.startedAt || previous.createdAt) : new Date(),
  });
  setRefreshCookie(res, token);
  return session;
}

// Sign this device in: both cookies
async function startSession(req, res, user) {
  setAccessCookie(res, user);
  await createSession(req, res, user);
}

// End every session of a user: access tokens via tokenVersion, refresh tokens by deletion
async function endAllSessions(user) {
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  await Session.deleteMany({ user: user._id });
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REUSE_GRACE_MS,
  hashToken,
  setAccessCookie,
  clearSessionCookies,
  createSession,
  startSession,
  endAllSessions,
};
