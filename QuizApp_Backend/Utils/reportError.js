const Sentry = require('@sentry/node');
const { waitUntil } = require('@vercel/functions');

// Send an unexpected error to Sentry (when it's configured).
// On Vercel the function can be frozen as soon as the response is sent, so the
// upload is handed to waitUntil, which keeps the function alive until it's done
// without delaying the response.
module.exports = function reportError(err, req) {
  if (!Sentry.isInitialized()) return;
  Sentry.withScope((scope) => {
    if (req) {
      scope.setTag('route', `${req.method} ${req.baseUrl || ''}${req.route?.path || req.path || ''}`);
      if (req.user?._id) scope.setUser({ id: String(req.user._id) });
    }
    Sentry.captureException(err);
  });
  waitUntil(Sentry.flush(2000));
};
