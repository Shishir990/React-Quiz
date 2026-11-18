// Error reporting with Sentry. Imported first in main.jsx. Does nothing unless
// VITE_SENTRY_DSN is set at build time (a DSN is safe to ship: it can only send events).
//
// Reports React crashes (ErrorBoundary) and errors nothing else caught. Failed API
// calls are not reported here: the server reports its own 500s.
import * as Sentry from '@sentry/react';

// Pasted values often pick up quotes or a stray space/newline, which Sentry rejects
const dsn = (import.meta.env.VITE_SENTRY_DSN || '').trim().replace(/^["']+|["']+$/g, '');

// Reset and email-change links carry one-time tokens in the address
const stripTokens = (url) => (typeof url === 'string' ? url.replace(/([?&](token|code)=)[^&#]*/gi, '$1[removed]') : url);

if (dsn) {
  Sentry.init({
    dsn,
    // Vercel sets VITE_VERCEL_ENV (production / preview) for Vite builds; locally it's the Vite mode
    environment: import.meta.env.VITE_VERCEL_ENV || import.meta.env.MODE,
    tracesSampleRate: 0, // errors only

    // Collect as little as possible: no cookies, headers, bodies or query strings
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },

    beforeSend(event) {
      if (event.request) {
        event.request.url = stripTokens(event.request.url);
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.query_string;
      }
      if (event.user) event.user = { id: event.user.id };
      return event;
    },
    beforeBreadcrumb(crumb) {
      // Page changes and requests can include ?token=... in the URL
      if (crumb.data) {
        for (const key of ['url', 'from', 'to']) crumb.data[key] = stripTokens(crumb.data[key]);
      }
      return crumb;
    },
  });
}

// Who hit the error: the account id only, never the email or name
export const setSentryUser = (id) => {
  if (dsn) Sentry.setUser(id ? { id: String(id) } : null);
};

export const reportError = (error, context) => {
  if (dsn) Sentry.captureException(error, context);
};
