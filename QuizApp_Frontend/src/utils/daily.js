// Local-date key, e.g. "2026-10-11"
export function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// The same category for everyone on a given day, rotating daily
export function pickDailyChallenge(categories) {
  const playable = categories.filter((c) => c.questionCount > 0).sort((a, b) => a._id.localeCompare(b._id));
  if (!playable.length) return null;
  const key = dayKey(new Date());
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return playable[hash % playable.length];
}
