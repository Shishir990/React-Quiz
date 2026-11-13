// Number helpers for lists of results

export const sum = (list, fn) => list.reduce((s, x) => s + fn(x), 0);

// Rounded average of fn(x) over the list, 0 for an empty list
export const avg = (list, fn) => (list.length ? Math.round(sum(list, fn) / list.length) : 0);

// Rounded percentage, 0 when there's nothing to divide by
export const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
