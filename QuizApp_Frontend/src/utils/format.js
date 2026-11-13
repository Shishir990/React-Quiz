// Small formatting helpers shared by the signed-in pages

export function initialsOf(name) {
  return name
    ? name.trim().split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';
}

export function timeAgo(date) {
  const mins = Math.round((Date.now() - new Date(date)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(date).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

// 75 → "1m 15s"
export function formatDuration(seconds) {
  if (seconds == null) return '—';
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  if (!m) return `${s}s`;
  return s % 60 ? `${m}m ${s % 60}s` : `${m}m`;
}

// 3, "quiz" → "3 quizzes"-style counts (adds a plain "s")
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Compact age: "just now", "25m ago", "3h ago", "2d ago", "1w ago", "2mo ago", "1y ago"
export function shortTimeAgo(date) {
  const mins = Math.floor((Date.now() - new Date(date)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// "13 Nov"
export const shortDate = (d) => new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short' });

// "Good morning" / "Good afternoon" / "Good evening" for the current local time
export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
