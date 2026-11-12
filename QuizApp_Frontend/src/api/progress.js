// Saved (unfinished) quizzes on the server, so they can be resumed on any device.
// Unlike authFetch these throw on network/server errors, which lets the caller
// tell "nothing saved" (null) apart from "couldn't reach the server".
const BASE = '/api/progress';

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, { ...options, headers: headers() });
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

// Categories with a quiz in progress: [{ category, answered, total, secondsRemaining }]
export const listProgressApi = () => request('');

// The saved quiz for one category, or null when there isn't one
export const getProgressApi = (categoryId) => request(`/${categoryId}`);

// keepalive lets the save finish even when the page is being closed
export const saveProgressApi = (categoryId, body, { keepalive = false } = {}) =>
  request(`/${categoryId}`, { method: 'PUT', body: JSON.stringify(body), keepalive });

export const deleteProgressApi = (categoryId) =>
  request(`/${categoryId}`, { method: 'DELETE', keepalive: true });
