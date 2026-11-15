// Chart colors for the dark soft-lime theme.
// SERIES (categories, in this fixed order) was validated on the card surface #121412
// with the dataviz palette checker: lightness band, chroma, contrast all pass; the
// closest colour-blind pair is in the 6-8 band, which is fine because every category
// is also named in a legend or label.
export const SERIES = ['#65A30D', '#0284C7', '#EC4899', '#8B5CF6'];
// "Other" and "Skipped": a quiet gray that recedes on the dark cards
export const NEUTRAL = '#3A403A';
// A single series (score over time, activity) uses the theme accent
export const PRIMARY = '#A3E635';
// Correct / wrong use the theme's good and bad colours; the legend names each one
export const ANSWER_COLORS = { correct: '#A3E635', wrong: '#F87171', skipped: NEUTRAL };
