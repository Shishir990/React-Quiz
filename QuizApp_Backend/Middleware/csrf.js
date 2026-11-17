// CSRF protection for cookie sign-in. Browsers attach cookies automatically, so a
// page on another site could try to submit a form or request to our API with the
// visitor's cookies. Requests that change data must therefore carry a custom header:
// another site's page can't add one (a cross-site request with custom headers needs
// CORS permission, which we don't give), while our own frontend always sends it.
// It is required even before sign-in, so another site can't sign a visitor in to an
// account of its choosing (login CSRF). Requests carrying an Authorization header are
// exempt: that header is never attached automatically. SameSite=Lax cookies are the
// first line of defence; this is the second.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const HEADER = 'x-quizapp-csrf';

module.exports = function csrfGuard(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.headers.authorization) return next();
  if (req.headers[HEADER] === '1') return next();
  console.warn(`[csrf] 403 missing header: ${req.method} ${req.originalUrl}`);
  res.status(403).json({ message: 'Request blocked: missing CSRF header.' });
};
