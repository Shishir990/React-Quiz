// Chart colours follow the light/dark theme: the values live in
// styles/LightMode.css as --chart-* variables, so these must be applied
// through `style` (CSS variables don't work in SVG attributes).
//
// Dark: SERIES was validated on the card surface #121412 with the dataviz
// palette checker. Light: the original palette, checked for colour-blind
// separation. Every category is also named in a legend or label.
export const SERIES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];
// "Other" and "Skipped": a quiet gray that recedes on the cards
export const NEUTRAL = 'var(--chart-neutral)';
// A single series (score over time, activity) uses the theme accent
export const PRIMARY = 'var(--chart-primary)';
// Correct / wrong; the legend names each one
export const ANSWER_COLORS = { correct: 'var(--chart-correct)', wrong: 'var(--chart-wrong)', skipped: NEUTRAL };
