// In-progress quizzes are kept in localStorage, one entry per player + category,
// so leaving the quiz (back button, refresh, "Save & exit") can be resumed later.
const PREFIX = 'quizProgress:';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // forget abandoned quizzes after a week

const keyFor = (userId, categoryId) => `${PREFIX}${userId}:${categoryId}`;

export function saveProgress(userId, categoryId, data) {
  if (!userId || !categoryId) return;
  try {
    localStorage.setItem(keyFor(userId, categoryId), JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    // storage full or blocked: the quiz still works, it just can't be resumed
  }
}

export function loadProgress(userId, categoryId) {
  if (!userId || !categoryId) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(userId, categoryId)));
    if (!saved?.Questions?.length || !(saved.secondsRemaining > 0) || Date.now() - saved.savedAt > MAX_AGE) {
      clearProgress(userId, categoryId);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

export function clearProgress(userId, categoryId) {
  if (!userId || !categoryId) return;
  try { localStorage.removeItem(keyFor(userId, categoryId)); } catch { /* ignore */ }
}

// Category ids this player has an unfinished quiz in.
// unsyncedOnly: just the ones whose save never reached the server
export function savedCategoryIds(userId, { unsyncedOnly = false } = {}) {
  const ids = new Set();
  if (!userId) return ids;
  try {
    const prefix = `${PREFIX}${userId}:`;
    // Collect keys first: loadProgress may delete expired entries
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
    for (const key of keys) {
      const id = key.slice(prefix.length);
      const saved = loadProgress(userId, id);
      if (saved && !(unsyncedOnly && saved.synced)) ids.add(id);
    }
  } catch { /* ignore */ }
  return ids;
}
