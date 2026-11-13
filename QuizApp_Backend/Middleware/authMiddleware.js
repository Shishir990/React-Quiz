const jwt = require('jsonwebtoken');
const User = require('../Models/Users');

exports.protect = async (req, res, next) => {
  console.log('🔒 protect middleware called');
  try {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('🔑 token:', token ? 'exists' : 'missing');

    if (!token) {
      console.warn(`[auth] 401 no token: ${req.method} ${req.originalUrl}`);
      return res.status(401).json({ message: 'Not authorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ decoded:', decoded);

    req.user = await User.findById(decoded.id).select('-password');
    console.log('👤 user found:', req.user ? req.user.email : 'NOT FOUND');
    // Deleted or deactivated accounts lose access even with an unexpired token
    if (!req.user || req.user.isActive === false) {
      console.warn(`[auth] 401 account missing/disabled: ${req.method} ${req.originalUrl} user ${decoded.id}`);
      return res.status(401).json({ message: 'Account not found or disabled' });
    }

    console.log('➡️ calling next()');
    next();
  } catch (err) {
    console.error(`[auth] 401 ${err.name}: ${err.message}: ${req.method} ${req.originalUrl}`);
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};