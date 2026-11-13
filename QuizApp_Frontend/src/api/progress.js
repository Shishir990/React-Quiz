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
  // 204 = nothing saved. Anything else that isn't OK (including 404, e.g. a backend
  // without this route) is an error: it must never look like a successful save,
  // or the browser copy gets marked "on the server" and is later thrown away.
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

// Categories with a quiz in progress: [{ category, answered, total, secondsRemaining }]
export const listProgressApi = () => request('');

// Saves/deletes still on their way to the server (category id -> request).
// "Save & exit" lands on the quiz list straight away, and on a slow connection
// the next request can reach the server before the save does. The list uses
// these to show the right button; opening a quiz waits for them (below).
export const pendingSaves = new Map();
export const pendingDeletes = new Map();

const track = (map, id, promise) => {
  map.set(id, promise);
  return promise.finally(() => {
    if (map.get(id) === promise) map.delete(id); // a newer request may have replaced it
  });
};

// The saved quiz for one category, or null when there isn't one.
// Waits for a save/delete of that quiz still in flight, so it never reads
// a copy older than the one this browser just sent.
export const getProgressApi = async (categoryId) => {
  const inFlight = pendingSaves.get(categoryId) || pendingDeletes.get(categoryId);
  if (inFlight) await inFlight.catch(() => {});
  return request(`/${categoryId}`);
};

// keepalive lets the save finish even when the page is being closed
export const saveProgressApi = (categoryId, body, { keepalive = false } = {}) => {
  pendingDeletes.delete(categoryId);
  return track(pendingSaves, categoryId,
    request(`/${categoryId}`, { method: 'PUT', body: JSON.stringify(body), keepalive }));
};

export const deleteProgressApi = (categoryId) => {
  pendingSaves.delete(categoryId);
  return track(pendingDeletes, categoryId,
    request(`/${categoryId}`, { method: 'DELETE', keepalive: true }));
};
