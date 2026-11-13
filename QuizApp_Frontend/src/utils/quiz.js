// Quiz rules and helpers shared by the quiz screens, the quiz list and the context

// Each question adds this much to the quiz timer (the server uses the same value)
export const SECONDS_PER_QUESTION = 10;

// Letters shown next to answer options
export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// "~3 min" for a quiz with this many questions
export function estimateTime(questionCount) {
  const mins = Math.max(1, Math.round((questionCount * SECONDS_PER_QUESTION) / 60));
  return `~${mins} min`;
}

// "easy" / "medium" / "hard" when one level clearly dominates a category, else "mixed"
export function difficultyLabel(difficulty) {
  if (!difficulty) return null;
  const entries = Object.entries(difficulty).filter(([, n]) => n > 0);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (!total) return null;
  const [level, count] = entries.sort((a, b) => b[1] - a[1])[0];
  if (count / total < 0.6) return 'mixed';
  return level;
}

// What gets sent to the server: the chosen option text for each answered question
export function buildAnswersLog(questions, answers) {
  return Object.keys(answers)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((i) => questions[i])
    .map((i) => ({
      question: questions[i]._id,
      selectedOption: questions[i].options[answers[i]],
    }));
}
