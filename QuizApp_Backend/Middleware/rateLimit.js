const { rateLimit } = require('express-rate-limit');

// Per-IP limits on the endpoints people could abuse: guessing passwords,
// creating accounts in bulk, or spamming reset emails through our mail account.
// The counts live in memory, so on Vercel each running instance keeps its own;
// that still stops scripted bursts. A shared store (e.g. Redis) would make them exact.
const limiter = ({ minutes, max, message, onlyFailures = false }) =>
  rateLimit({
    windowMs: minutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-8', // tells clients when they can retry
    legacyHeaders: false,
    skipSuccessfulRequests: onlyFailures,
    handler: (req, res) => {
      console.warn(`[rate-limit] 429 ${req.method} ${req.originalUrl}`);
      res.status(429).json({ message });
    },
  });

exports.loginLimiter = limiter({
  minutes: 15, max: 10, onlyFailures: true,
  message: 'Too many failed sign-in attempts. Please wait 15 minutes and try again.',
});

exports.changePasswordLimiter = limiter({
  minutes: 15, max: 10, onlyFailures: true,
  message: 'Too many attempts. Please wait 15 minutes and try again.',
});

// Each request emails the new address (and the old one), so keep it tight
exports.emailChangeLimiter = limiter({
  minutes: 60, max: 5,
  message: 'Too many email change requests. Please wait an hour and try again.',
});

exports.registerLimiter = limiter({
  minutes: 60, max: 10,
  message: 'Too many accounts created from this network. Please try again later.',
});

exports.forgotPasswordLimiter = limiter({
  minutes: 60, max: 5,
  message: 'Too many password reset requests. Please wait an hour and try again.',
});

exports.resetPasswordLimiter = limiter({
  minutes: 15, max: 10,
  message: 'Too many attempts. Please wait 15 minutes and try again.',
});

// Refreshes happen about every 15 minutes per open tab; this only stops runaway loops or abuse
exports.refreshLimiter = limiter({
  minutes: 15, max: 60,
  message: 'Too many session refreshes. Please wait a few minutes and try again.',
});
