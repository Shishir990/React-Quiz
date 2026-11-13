// Soft color per category, cycling in creation order so a category keeps
// its color everywhere in the console (and when lists are filtered or sorted)
const TINTS = ['#FCE7F3', '#DBEAFE', '#EDE9FE', '#DCFCE7', '#E0E7FF', '#F3E8FF', '#FEF3C7', '#CCFBF1', '#E0F2FE', '#FFE4E6', '#FFEDD5', '#ECFCCB'];

export function categoryTints(categories) {
  return new Map(
    [...categories]
      .sort((a, b) => String(a.createdAt || a._id).localeCompare(String(b.createdAt || b._id)))
      .map((c, i) => [c._id, TINTS[i % TINTS.length]])
  );
}
