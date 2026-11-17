const jwt = require('jsonwebtoken');
const User = require('../Models/Users');
const { ACCESS_COOKIE, isSessionLive } = require('../Utils/session');

exports.protect = async (req, res, next) => {
  try {
    // The httpOnly cookie from the browser, or an Authorization header from API tools
    const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
    const token = bearer || req.cookies?.[ACCESS_COOKIE];

    if (!token) {
      console.warn(`[auth] 401 no token: ${req.method} ${req.originalUrl}`);
      return res.status(401).json({ message: 'Not authorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select('-password');
    // Deleted or deactivated accounts lose access even with an unexpired token
    if (!req.user || req.user.isActive === false) {
      console.warn(`[auth] 401 account missing/disabled: ${req.method} ${req.originalUrl} user ${decoded.id}`);
      return res.status(401).json({ message: 'Account not found or disabled' });
    }
    // Password changed or "sign out everywhere" since this token was issued
    if ((decoded.tv || 0) !== (req.user.tokenVersion || 0)) {
      console.warn(`[auth] 401 revoked token: ${req.method} ${req.originalUrl} user ${decoded.id}`);
      return res.status(401).json({ message: 'Your session has ended. Please sign in again.' });
    }
    // This device was signed out (from another device, or by logging out). Tokens issued
    // before `sid` existed have none and simply run out within 15 minutes.
    if (decoded.sid && !(await isSessionLive(req.user._id, decoded.sid))) {
      console.warn(`[auth] 401 session ended: ${req.method} ${req.originalUrl} user ${decoded.id}`);
      return res.status(401).json({ message: 'Your session has ended. Please sign in again.' });
    }

    next();
  } catch (err) {
    // Access tokens expire every 15 minutes by design (the browser then refreshes), so only
    // log tokens that are actually bad
    if (err.name !== 'TokenExpiredError') {
      console.error(`[auth] 401 ${err.name}: ${err.message}: ${req.method} ${req.originalUrl}`);
    }
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};