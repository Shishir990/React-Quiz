const User = require('../Models/Users');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { isMailConfigured, sendMail } = require('../Config/mailer');

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

exports.register = async (req, res) => {
  // Role is never taken from the request: everyone signs up as a player and
  // admins are promoted from the admin console (or scripts/makeAdmin.js)
  const { name, email, password } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password });
    res.status(201).json({ token: generateToken(user._id), user: { id: user._id, name, email, role: user.role } });
  } catch (err) {
    console.error('❌ Register error name:', err.name);
    console.error('❌ Register error message:', err.message);
    console.error('❌ Register error stack:', err.stack);
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    if (user.isActive === false)
      return res.status(403).json({ message: 'This account has been disabled. Contact an admin.' });

    res.json({ token: generateToken(user._id), user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json(req.user);
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: 'Current and new password are required' });
  if (newPassword.length < 6)
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  if (newPassword === currentPassword)
    return res.status(400).json({ message: 'New password must be different from the current one' });

  try {
    // protect() strips the hash, so load it again to verify the current password
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword; // hashed by the pre('save') hook
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
        subject: 'Reset your QuizApp password',
        text:
          `Hi ${user.name},\n\nWe received a request to reset your QuizApp password. ` +
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
    res.status(500).json({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || typeof token !== 'string')
    return res.status(400).json({ message: 'Reset link is invalid' });
  if (!password || password.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' });

  try {
    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user || user.isActive === false)
      return res.status(400).json({ message: 'This reset link is invalid or has expired. Request a new one.' });

    user.password = password; // hashed by the pre('save') hook
    user.resetPasswordToken = undefined; // one-time use
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Your password has been reset. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const resetEmailHtml = (name, link) => `
<div style="background:#F8FAFD;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0F172A">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:32px">
    <p style="margin:0 0 24px;font-size:18px;font-weight:700">QuizApp</p>
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
