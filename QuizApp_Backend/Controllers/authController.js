const User = require('../Models/Users');
const Session = require('../Models/Session');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { isMailConfigured, sendMail } = require('../Config/mailer');
const serverError = require('../Utils/serverError');
const { isText, normalizeEmail, emailError, nameError, newPasswordError } = require('../Utils/validate');

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

const {
  REFRESH_COOKIE, REUSE_GRACE_MS, hashToken: hashSessionToken,
  setAccessCookie, clearSessionCookies, createSession, startSession, endAllSessions,
  sessionIdOf, sessionRowsFilter,
} = require('../Utils/session');

// What the client is told about the signed-in user. The session itself lives in
// httpOnly cookies, so no token is ever sent in a response body.
// `user` must be loaded with its password hash (not stripped) for hasPassword to be right.
const publicUser = (user) => ({
  _id: user._id, id: user._id, name: user.name, email: user.email, role: user.role,
  hasPassword: !!user.password, // Google-only accounts have none
  pendingEmail: pendingEmailOf(user),
});

// The address waiting to be confirmed, while its link still works
const pendingEmailOf = (user) =>
  user.pendingEmail && user.emailChangeExpires > new Date() ? user.pendingEmail : undefined;

exports.register = async (req, res) => {
  // Role is never taken from the request: everyone signs up as a player and
  // admins are promoted from the admin console (or scripts/makeAdmin.js)
  const { name, password } = req.body || {};
  const email = normalizeEmail(req.body?.email);
  const problem = nameError(name) || emailError(email) || newPasswordError(password);
  if (problem) return res.status(400).json({ message: problem });

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name: name.trim(), email, password });
    await startSession(req, res, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    // Two sign-ups with the same email at the same moment: the unique index catches the second
    if (err.code === 11000) return res.status(400).json({ message: 'Email already registered' });
    serverError(req, res, err);
  }
};

exports.login = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { password } = req.body || {};
  if (!email || !isText(password) || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  try {
    const user = await User.findOne({ email }).select('+emailChangeExpires');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    if (user.isActive === false)
      return res.status(403).json({ message: 'This account has been disabled. Contact an admin.' });

    await startSession(req, res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    serverError(req, res, err);
  }
};

exports.getMe = async (req, res) => {
  try {
    // protect() leaves out the password hash; it's only read here to say whether one exists
    const extra = await User.findById(req.user._id).select('password pendingEmail emailChangeExpires').lean();
    const { pendingEmail: _pending, ...me } = req.user.toObject();
    res.json({ ...me, hasPassword: !!extra?.password, pendingEmail: extra ? pendingEmailOf(extra) : undefined });
  } catch (err) {
    serverError(req, res, err);
  }
};

// ── Profile ──

// PUT /api/auth/profile  { name }
exports.updateProfile = async (req, res) => {
  const { name } = req.body || {};
  const problem = nameError(name);
  if (problem) return res.status(400).json({ message: problem });

  try {
    const user = await User.findByIdAndUpdate(req.user._id, { name: name.trim() }, { new: true })
      .select('+emailChangeExpires');
    res.json({ success: true, message: 'Your name has been updated.', user: publicUser(user) });
  } catch (err) {
    serverError(req, res, err);
  }
};

// ── Change of email ──
// The new address must prove it's real and belongs to this person: it only replaces
// the old one once the link emailed to it is opened. The old address is told, so a
// stolen session can't quietly move the account (and its password resets) elsewhere.
const EMAIL_CHANGE_TTL_MINUTES = 60;

// POST /api/auth/email-change  { email, password }  (password: when the account has one)
exports.requestEmailChange = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { password } = req.body || {};
  const problem = emailError(email);
  if (problem) return res.status(400).json({ message: problem });

  if (isProduction && (!isMailConfigured() || !clientUrl()))
    return res.status(503).json({ message: 'Changing your email is not available right now. Contact an admin.' });

  try {
    const user = await User.findById(req.user._id);
    if (email === user.email) return res.status(400).json({ message: 'That is already your email address.' });
    if (user.password && !(await user.matchPassword(password)))
      return res.status(400).json({ message: 'Current password is incorrect' });
    if (await User.exists({ email }))
      return res.status(400).json({ message: 'That email address is already used by another account.' });

    const token = crypto.randomBytes(32).toString('hex');
    user.pendingEmail = email;
    user.emailChangeToken = hashToken(token);
    user.emailChangeExpires = new Date(Date.now() + EMAIL_CHANGE_TTL_MINUTES * 60 * 1000);
    await user.save();

    const link = `${clientUrl()}/confirm-email?token=${token}`;
    const reply = {
      success: true,
      message: `We've sent a confirmation link to ${email}. Your email changes once you open it.`,
      pendingEmail: email,
    };

    if (!isMailConfigured()) {
      console.log(`\n🔗 Email change link for ${user.email} -> ${email} (SMTP not configured):\n${link}\n`);
      return res.json(reply);
    }

    try {
      await sendMail({
        to: email,
        subject: 'Confirm your new Quizora email',
        text:
          `Hi ${user.name},\n\nOpen this link to make ${email} the email for your Quizora account ` +
          `(it expires in ${EMAIL_CHANGE_TTL_MINUTES} minutes):\n\n${link}\n\n` +
          `If you didn't ask for this, ignore this email; nothing will change.`,
        html: actionEmailHtml({
          heading: 'Confirm your new email',
          body: `Hi ${escapeHtml(user.name)}, open this link to make <b>${escapeHtml(email)}</b> the email for your Quizora account. It expires in ${EMAIL_CHANGE_TTL_MINUTES} minutes.`,
          button: 'Confirm new email',
          link,
          footer: "If you didn't ask for this, you can ignore this email. Nothing will change.",
        }),
      });
    } catch (mailErr) {
      console.error('❌ Email change mail failed:', mailErr.message);
      user.pendingEmail = undefined;
      user.emailChangeToken = undefined;
      user.emailChangeExpires = undefined;
      await user.save();
      return res.status(502).json({ message: "We couldn't send the confirmation email. Please try again later." });
    }

    // Heads-up to the current address; failing to send it shouldn't block the change
    sendMail({
      to: user.email,
      subject: 'Your Quizora email is being changed',
      text:
        `Hi ${user.name},\n\nSomeone signed in to your Quizora account asked to change its email to ${maskEmail(email)}. ` +
        `If this was you, there's nothing to do.\n\nIf it wasn't, change your password and sign out of all devices ` +
        `in Settings right away.`,
      html: actionEmailHtml({
        heading: 'Your email is being changed',
        body: `Hi ${escapeHtml(user.name)}, someone signed in to your Quizora account asked to change its email to <b>${escapeHtml(maskEmail(email))}</b>. If this was you, there's nothing to do.`,
        footer: "If it wasn't you, change your password and sign out of all devices in Settings right away.",
      }),
    }).catch((err) => console.warn(`[auth] email change notice failed: ${err.message}`));

    res.json(reply);
  } catch (err) {
    serverError(req, res, err);
  }
};

// DELETE /api/auth/email-change: drop a change that hasn't been confirmed yet
exports.cancelEmailChange = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $unset: { pendingEmail: 1, emailChangeToken: 1, emailChangeExpires: 1 } },
    );
    res.json({ success: true, message: 'Email change cancelled.' });
  } catch (err) {
    serverError(req, res, err);
  }
};

// POST /api/auth/email-change/confirm  { token }: no session needed, the link is the proof
exports.confirmEmailChange = async (req, res) => {
  const { token } = req.body || {};
  if (!isText(token) || !token) return res.status(400).json({ message: 'Confirmation link is invalid' });

  const invalid = { message: 'This confirmation link is invalid or has expired. Request a new one from Settings.' };
  try {
    const user = await User.findOne({
      emailChangeToken: hashToken(token),
      emailChangeExpires: { $gt: new Date() },
    });
    if (!user || user.isActive === false || !user.pendingEmail) return res.status(400).json(invalid);

    const email = user.pendingEmail;
    const clear = () => {
      user.pendingEmail = undefined;
      user.emailChangeToken = undefined; // one-time use
      user.emailChangeExpires = undefined;
    };

    // Someone may have signed up with it since the link was sent
    if (await User.exists({ email, _id: { $ne: user._id } })) {
      clear();
      await user.save();
      return res.status(400).json({ message: 'That email address is now used by another account.' });
    }

    user.email = email;
    clear();
    await user.save();
    res.json({ success: true, message: `Your email is now ${email}.`, user: publicUser(user) });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'That email address is now used by another account.' });
    serverError(req, res, err);
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!isText(currentPassword) || !currentPassword || !isText(newPassword) || !newPassword)
    return res.status(400).json({ message: 'Current and new password are required' });
  const problem = newPasswordError(newPassword, 'New password');
  if (problem) return res.status(400).json({ message: problem });
  if (newPassword === currentPassword)
    return res.status(400).json({ message: 'New password must be different from the current one' });

  try {
    // protect() strips the hash, so load it again to verify the current password
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword; // hashed by the pre('save') hook
    // Old sessions (any device, any copied token) end now; this device gets a fresh one
    await endAllSessions(user);
    await startSession(req, res, user);
    res.json({ success: true, message: 'Password updated. Other devices have been signed out.' });
  } catch (err) {
    serverError(req, res, err);
  }
};

// ── Forgot / reset password ──
const RESET_TTL_MINUTES = 15;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// The link must point at our own frontend. Never build it from the request's
// Origin/Host headers: anyone could send a reset for someone else's email with
// a fake origin and collect the token when they click.
const clientUrl = () =>
  (process.env.CLIENT_URL || (isProduction ? '' : 'http://localhost:5173')).replace(/\/+$/, '');

exports.forgotPassword = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/\S+@\S+\.\S+/.test(email))
    return res.status(400).json({ message: 'Enter a valid email address' });

  if (isProduction && (!isMailConfigured() || !clientUrl()))
    return res.status(503).json({ message: 'Password reset is not available right now. Contact an admin.' });

  // Same reply whether or not the email exists, so this can't be used to find accounts
  const reply = { success: true, message: 'If an account exists for that email, a reset link is on its way.' };

  try {
    const user = await User.findOne({ email });
    if (!user || user.isActive === false) return res.json(reply);

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(token);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
    await user.save();

    const link = `${clientUrl()}/reset-password?token=${token}`;

    if (!isMailConfigured()) {
      // Local development without SMTP: print the link instead of emailing it
      console.log(`\n🔗 Password reset link for ${email} (SMTP not configured):\n${link}\n`);
      return res.json(reply);
    }

    try {
      await sendMail({
        to: user.email,
        subject: 'Reset your Quizora password',
        text:
          `Hi ${user.name},\n\nWe received a request to reset your Quizora password. ` +
          `Open this link to choose a new one (it expires in ${RESET_TTL_MINUTES} minutes):\n\n${link}\n\n` +
          `If you didn't ask for this, you can ignore this email; your password won't change.`,
        html: resetEmailHtml(user.name, link),
      });
    } catch (mailErr) {
      console.error('❌ Reset email failed:', mailErr.message);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(502).json({ message: "We couldn't send the reset email. Please try again later." });
    }

    res.json(reply);
  } catch (err) {
    serverError(req, res, err);
  }
};

const findByResetToken = (token) =>
  User.findOne({
    resetPasswordToken: hashToken(token),
    resetPasswordExpires: { $gt: new Date() },
  });

// "shishirsaklani928@gmail.com" -> "shi•••928@gmail.com": enough to tell
// your own accounts apart without showing the full address
const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  const shown = local.length > 6 ? `${local.slice(0, 3)}•••${local.slice(-3)}` : `${local[0]}•••`;
  return `${shown}@${domain}`;
};

// Lets the reset page say which account the link is for (and catch dead
// links) before the user types a new password
exports.checkResetToken = async (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string')
    return res.status(400).json({ message: 'Reset link is invalid' });

  try {
    const user = await findByResetToken(token);
    if (!user || user.isActive === false)
      return res.status(400).json({ message: 'This reset link is invalid or has expired. Request a new one.' });

    res.json({ valid: true, email: maskEmail(user.email), name: user.name.split(' ')[0] });
  } catch (err) {
    serverError(req, res, err);
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || typeof token !== 'string')
    return res.status(400).json({ message: 'Reset link is invalid' });
  const problem = newPasswordError(password);
  if (problem) return res.status(400).json({ message: problem });

  try {
    const user = await findByResetToken(token);
    if (!user || user.isActive === false)
      return res.status(400).json({ message: 'This reset link is invalid or has expired. Request a new one.' });

    user.password = password; // hashed by the pre('save') hook
    user.resetPasswordToken = undefined; // one-time use
    user.resetPasswordExpires = undefined;
    // Whoever had the old password (or a copied token) is signed out everywhere
    await endAllSessions(user);
    clearSessionCookies(res);

    res.json({ success: true, message: 'Your password has been reset. You can now sign in.' });
  } catch (err) {
    serverError(req, res, err);
  }
};

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const resetEmailHtml = (name, link) => `
<div style="background:#F8FAFD;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0F172A">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:32px">
    <p style="margin:0 0 24px;font-size:18px;font-weight:700">Quizora</p>
    <h1 style="margin:0 0 12px;font-size:22px">Reset your password</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#334155">
      Hi ${escapeHtml(name)}, we received a request to reset your password.
      This link expires in ${RESET_TTL_MINUTES} minutes.
    </p>
    <a href="${link}" style="display:inline-block;background:#10B981;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px">Choose a new password</a>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#64748B">
      If you didn't ask for this, you can ignore this email. Your password won't change.
    </p>
  </div>
</div>`;

// Same look as the reset email. `body` is HTML: escape anything user-supplied in it.
// `button`/`link` are optional (a notice has no action).
const actionEmailHtml = ({ heading, body, button, link, footer }) => `
<div style="background:#F8FAFD;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0F172A">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:32px">
    <p style="margin:0 0 24px;font-size:18px;font-weight:700">Quizora</p>
    <h1 style="margin:0 0 12px;font-size:22px">${escapeHtml(heading)}</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#334155">${body}</p>
    ${button && link ? `<a href="${link}" style="display:inline-block;background:#10B981;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px">${escapeHtml(button)}</a>` : ''}
    ${footer ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#64748B">${escapeHtml(footer)}</p>` : ''}
  </div>
</div>`;

// ── Sign in with Google ──
// The browser gets a signed ID token from Google Identity Services and sends it here.
// We verify it with Google's library (signature, expiry, and that it was issued for
// OUR client id), then find or create the account and return our own JWT.
const { OAuth2Client } = require('google-auth-library');
let googleClient = null;
const googleClientId = () => (process.env.GOOGLE_CLIENT_ID || '').trim();

// GET /api/auth/google/config: the public client id (not a secret), or null when
// Google sign-in isn't set up, so the frontend knows whether to show the button
exports.googleConfig = (req, res) => {
  res.json({ clientId: googleClientId() || null });
};

// POST /api/auth/google  { credential: "<Google ID token>" }
exports.googleLogin = async (req, res) => {
  const clientId = googleClientId();
  if (!clientId) return res.status(503).json({ message: 'Google sign-in is not set up on this server.' });

  const { credential } = req.body || {};
  if (!isText(credential) || !credential) return res.status(400).json({ message: 'Missing Google credential' });

  let profile;
  try {
    googleClient = googleClient || new OAuth2Client(clientId);
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
    profile = ticket.getPayload();
  } catch (err) {
    console.warn(`[auth] Google token rejected: ${err.message}`);
    return res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
  }
  // Only trust addresses Google has verified, otherwise anyone could claim someone's email
  if (!profile?.sub || !profile.email || profile.email_verified !== true) {
    return res.status(401).json({ message: 'Your Google account email is not verified.' });
  }

  const email = normalizeEmail(profile.email);
  try {
    let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email }] }).select('+emailChangeExpires');
    if (user && user.isActive === false) {
      return res.status(403).json({ message: 'This account has been disabled. Contact an admin.' });
    }

    let created = false;
    if (!user) {
      // New player: name and picture from the Google profile, no password
      const name = (profile.name || email.split('@')[0]).trim().slice(0, 60);
      user = await User.create({ name, email, googleId: profile.sub, avatar: profile.picture || '' });
      created = true;
    } else if (!user.googleId) {
      // Existing email/password account: link it, since Google verified the address
      user.googleId = profile.sub;
      if (!user.avatar && profile.picture) user.avatar = profile.picture;
      await user.save();
    }

    await startSession(req, res, user);
    res.status(created ? 201 : 200).json({ user: publicUser(user), created });
  } catch (err) {
    // Two first-time sign-ins racing: the unique index catches the second
    if (err.code === 11000) return res.status(409).json({ message: 'Please try signing in again.' });
    serverError(req, res, err);
  }
};

// ── Sessions ──

// POST /api/auth/refresh: swap the refresh cookie for a new pair of cookies.
// Each refresh token works once. Presenting one that was already used means a copy
// exists somewhere else, so every session of that user is ended (theft detection),
// except within a few seconds of its rotation, when it is just two tabs racing.
exports.refresh = async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!isText(token) || !token) return res.status(401).json({ message: 'Not signed in' });

  try {
    const tokenHash = hashSessionToken(token);
    // Claim the session atomically, so two requests cannot both rotate it
    const session = await Session.findOneAndUpdate(
      { tokenHash, revokedAt: null, expiresAt: { $gt: new Date() } },
      { revokedAt: new Date() },
    );

    if (!session) {
      const used = await Session.findOne({ tokenHash });
      if (used?.revokedAt && Date.now() - used.revokedAt.getTime() < REUSE_GRACE_MS) {
        // Another tab refreshed a moment ago and the browser already has its new cookie
        return res.status(409).json({ message: 'Session was just refreshed. Retry the request.', code: 'REFRESH_RACE' });
      }
      if (used?.revokedAt) {
        console.warn(`[auth] refresh token reused for user ${used.user}: ending all sessions`);
        const owner = await User.findById(used.user);
        if (owner) await endAllSessions(owner);
      }
      clearSessionCookies(res);
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }

    const user = await User.findById(session.user);
    if (!user || user.isActive === false) {
      await Session.deleteMany({ user: session.user });
      clearSessionCookies(res);
      return res.status(401).json({ message: 'Account not found or disabled' });
    }

    const next = await createSession(req, res, user, session);
    session.replacedBy = next._id;
    await session.save();
    setAccessCookie(res, user, sessionIdOf(next));
    res.json({ user: publicUser(user) });
  } catch (err) {
    serverError(req, res, err);
  }
};

// POST /api/auth/logout: end this device's session. Every row of it goes, so its
// access token stops working too (protect checks the session still exists).
exports.logout = async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  try {
    if (isText(token) && token) {
      const row = await Session.findOneAndDelete({ tokenHash: hashSessionToken(token) }).lean();
      if (row) await Session.deleteMany(sessionRowsFilter(row.user, sessionIdOf(row)));
    }
  } catch (err) {
    // The cookies are cleared below either way; an orphaned session just expires
    console.warn(`[auth] logout cleanup failed: ${err.message}`);
  }
  clearSessionCookies(res);
  res.json({ success: true });
};

// POST /api/auth/logout-all: end every session of this user, on every device
exports.logoutAll = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    await endAllSessions(user);
    clearSessionCookies(res);
    res.json({ success: true, message: 'Signed out of all devices.' });
  } catch (err) {
    serverError(req, res, err);
  }
};

// GET /api/auth/sessions: the devices signed in to this account.
// The refresh cookie is sent to /api/auth, so the device asking can be marked "current".
exports.listSessions = async (req, res) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    const currentHash = isText(token) && token ? hashSessionToken(token) : null;
    const rows = await Session.find({ user: req.user._id, revokedAt: null, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .lean();

    const sessions = rows.map((s) => ({
      id: String(sessionIdOf(s)),
      userAgent: s.userAgent || '',
      ip: s.ip || '',
      startedAt: s.startedAt || s.createdAt,
      lastActiveAt: s.createdAt, // a new row is written on every refresh
      expiresAt: s.expiresAt,
      current: s.tokenHash === currentHash,
    }));
    // This device first, then most recently active
    sessions.sort((a, b) => Number(b.current) - Number(a.current));
    res.json(sessions);
  } catch (err) {
    serverError(req, res, err);
  }
};

// DELETE /api/auth/sessions/:id: sign out one other device, at once: its refresh token
// stops working and protect rejects its access token on the next request.
exports.revokeSession = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: 'Session not found' });

  try {
    const owned = sessionRowsFilter(req.user._id, id);
    const token = req.cookies?.[REFRESH_COOKIE];
    if (isText(token) && token) {
      const mine = await Session.exists({ ...owned, tokenHash: hashSessionToken(token) });
      if (mine) return res.status(400).json({ message: 'Use "Sign out" to end the session on this device.' });
    }

    const { deletedCount } = await Session.deleteMany(owned);
    if (!deletedCount) return res.status(404).json({ message: 'Session not found' });
    res.json({ success: true, message: 'Device signed out.' });
  } catch (err) {
    serverError(req, res, err);
  }
};
