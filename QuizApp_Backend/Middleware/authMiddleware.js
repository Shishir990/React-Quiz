const jwt = require('jsonwebtoken');
const User = require('../Models/Users');

exports.protect = async (req, res, next) => {
  console.log('🔒 protect middleware called');
  try {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('🔑 token:', token ? 'exists' : 'missing');

    if (!token) return res.status(401).json({ message: 'Not authorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ decoded:', decoded);

    req.user = await User.findById(decoded.id).select('-password');
    console.log('👤 user found:', req.user ? req.user.email : 'NOT FOUND');

    console.log('➡️ calling next()');
    next();
  } catch (err) {
    console.error('❌ protect error:', err.message, err.stack);
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};