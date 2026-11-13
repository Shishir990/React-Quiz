// Summaries of a player's quiz results (dashboard, results, analytics, quiz list)
import { avg } from './stats';
import { addDays, dayKey, startOfDay } from './date';
import { shortDate } from './format';

// A quiz counts as passed at this score (%)
export const PASS_MARK = 50;

// Results whose category was deleted are grouped together
export const categoryKey = (r) => r.category?._id || 'deleted';

// Average percentage over a list of results
export const averageScore = (results) => avg(results, (r) => r.percentage);

// One entry per category: attempts, average, best and latest play
// (results arrive newest first, so the first item is the latest)
export function groupByCategory(results) {
  const groups = new Map();
  results.forEach((r) => {
    const key = categoryKey(r);
    if (!groups.has(key)) groups.set(key, { id: key, name: r.category?.name || 'Deleted category', icon: r.category?.icon || '📝', items: [] });
    groups.get(key).items.push(r);
  });
  return [...groups.values()].map((g) => ({
    ...g,
    attempts: g.items.length,
    avg: averageScore(g.items),
    best: Math.max(...g.items.map((r) => r.percentage)),
    last: g.items[0].createdAt,
  }));
}

// Best score, attempt count and last play per category id
export function progressByCategory(results) {
  const map = {};
  for (const r of results) {
    const id = r.category?._id;
    if (!id) continue;
    const p = map[id] || (map[id] = { best: 0, attempts: 0, last: r.createdAt });
    p.best = Math.max(p.best, r.percentage);
    p.attempts += 1;
    if (new Date(r.createdAt) > new Date(p.last)) p.last = r.createdAt;
  }
  return map;
}

// Streaks are counted in consecutive calendar days with at least one quiz
export function computeStreaks(results) {
  const days = new Set(results.map((r) => dayKey(r.createdAt)));
  let current = 0;
  // A streak is still alive if today has no quiz yet but yesterday did
  let cursor = days.has(dayKey(new Date())) ? new Date() : addDays(new Date(), -1);
  while (days.has(dayKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let prev = null;
  [...days].sort().forEach((k) => {
    run = prev && dayKey(addDays(new Date(`${prev}T00:00`), 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  });
  return { current, best };
}

// Midnight at the start of the period ("7" includes today and the 6 days before), or null for all time
export function periodStart(period) {
  if (period === 'all') return null;
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - (Number(period) - 1));
  return d;
}

// Quizzes per day for 7 / 30 days, or per week (last 12) for all time
export function activityBuckets(results, period) {
  const today = startOfDay(new Date());
  const buckets = [];
  if (period === 'all') {
    // Weeks start on Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    for (let i = 11; i >= 0; i--) {
      const start = new Date(monday);
      start.setDate(monday.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      buckets.push({ start, end, label: shortDate(start), title: `Week of ${shortDate(start)}` });
    }
  } else {
    for (let i = Number(period) - 1; i >= 0; i--) {
      const start = new Date(today);
      start.setDate(today.getDate() - i);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      buckets.push({ start, end, label: shortDate(start), title: start.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) });
    }
  }
  return buckets.map((b) => {
    const items = results.filter((r) => new Date(r.createdAt) >= b.start && new Date(r.createdAt) < b.end);
    return { ...b, value: items.length, avg: averageScore(items) };
  });
}
