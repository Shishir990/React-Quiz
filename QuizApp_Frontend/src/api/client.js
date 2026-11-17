// Every API call goes through apiFetch. Sign-in lives in httpOnly cookies that the
// browser sends on its own (page scripts can't read them), so nothing here touches a
// token. It adds the CSRF header to data-changing requests, and when the 15-minute
// access token has run out (401) it renews the session once and retries.
const CSRF_HEADERS = { 'X-QuizApp-CSRF': '1' };
const SAFE_METHODS = new Set(['GET', 'HEAD']);

// A 401 from these means "wrong password" or "no session", not "token expired"
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/google', '/auth/refresh', '/auth/logout',
  '/auth/forgot-password', '/auth/reset-password'];

// The server sets this readable, secret-free cookie next to the real (httpOnly) ones.
// Without it there is no session to restore, so signed-out visitors skip the request.
export const mightBeSignedIn = () => document.cookie.split('; ').includes('qa_session=1');

// Fired when the session can't be renewed; the app then shows the signed-out state
export const SIGNED_OUT_EVENT = 'quizapp:signed-out';

let refreshing = null; // one refresh at a time in this tab

async function requestRefresh() {
  const res = await fetch('/api/auth/refresh', { method: 'POST', headers: CSRF_HEADERS, credentials: 'same-origin' });
  // 409: another tab renewed the session a moment ago, and the browser already has the new cookies
  return res.ok || res.status === 409;
}

// Renew the session. Requests that expire together share one refresh, and tabs take
// turns (they share cookies, and each refresh token works only once).
function refreshSession() {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        if (navigator.locks?.request) return await navigator.locks.request('quizapp-session-refresh', requestRefresh);
        return await requestRefresh();
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

// fetch('/api' + path) with the session handled. Returns the Response, like fetch.
export async function apiFetch(path, options = {}, { retried = false } = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    ...(typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
    ...(SAFE_METHODS.has(method) ? {} : CSRF_HEADERS),
    ...options.headers,
  };
  const res = await fetch(`/api${path}`, { ...options, headers, credentials: 'same-origin' });

  if (res.status === 401 && !retried && !NO_REFRESH.some((p) => path.startsWith(p))) {
    if (await refreshSession()) return apiFetch(path, options, { retried: true });
    window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
  }
  return res;
}
