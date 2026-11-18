// Error reporting with Sentry. Required first in server.js, before Express loads,
// so Sentry can instrument it. Does nothing unless SENTRY_DSN is set.
//
// Only unexpected failures are reported (500s and crashes, see Utils/reportError.js).
// Expected refusals (401, 403, 409, 429) stay in the logs.
require('dotenv').config();
const Sentry = require('@sentry/node');

// Never send these, wherever they appear: session cookies, passwords, emailed tokens
const SECRET_KEYS = /cookie|authorization|password|token|secret|credential/i;

// Query-string values that are secrets (e.g. ?token=...)
const stripTokens = (text) =>
  typeof text === 'string' ? text.replace(/([?&](?:token|code|password)=)[^&#\s'"]*/gi, '$1[removed]') : text;

function scrub(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 6) return value;
  for (const key of Object.keys(value)) {
    if (SECRET_KEYS.test(key)) value[key] = '[removed]';
    else value[key] = scrub(value[key], depth + 1);
  }
  return value;
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // production / preview on Vercel, development locally
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: 0, // errors only, no performance tracing (stays within the free tier)

    // Collect as little as possible. The SDK's defaults include cookies, headers and bodies.
    dataCollection: {
      userInfo: false,                 // reportError adds the user id itself; no IP or email
      cookies: false,
      httpHeaders: { request: { allow: ['user-agent', 'content-type'] }, response: false },
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },

    // Second line of defence: strip anything secret that still got into the event
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.query_string;
        scrub(event.request.headers);
      }
      scrub(event.extra);
      scrub(event.contexts);
      if (event.user) event.user = { id: event.user.id };
      return event;
    },
    beforeBreadcrumb(crumb) {
      // The local debug logger prints whole requests and responses (📥 / 📤)
      if (crumb.category === 'console' && /^\s*(📥|📤)/u.test(String(crumb.message || ''))) return null;
      // Log lines and request breadcrumbs include URLs, which could carry ?token=...
      if (typeof crumb.message === 'string') crumb.message = stripTokens(crumb.message);
      if (crumb.data) {
        if (Array.isArray(crumb.data.arguments)) crumb.data.arguments = crumb.data.arguments.map(stripTokens);
        if (typeof crumb.data.url === 'string') crumb.data.url = stripTokens(crumb.data.url);
      }
      return crumb;
    },
  });
}

module.exports = Sentry;
