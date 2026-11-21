// Rules for quizzes players write themselves. Same limits as the server
// (QuizApp_Backend/Controllers/userQuizController.js), so most mistakes show up before saving.
export const QUIZ_LIMITS = {
  MAX_QUIZZES: 50,
  MIN_QUESTIONS: 3,
  MAX_QUESTIONS: 50,
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 6,
  TITLE: 100,
  DESCRIPTION: 300,
  TEXT: 500,
  OPTION: 200,
  EXPLANATION: 500,
};

// A new question in the editor; `correct` is an index into `options`
export const blankQuestion = () => ({ key: crypto.randomUUID(), text: '', options: ['', '', '', ''], correct: 0, explanation: '' });

export const blankQuiz = () => ({ title: '', description: '', questions: [blankQuestion(), blankQuestion(), blankQuestion()] });

// A saved quiz, in the shape the editor works with
export const editorQuiz = (quiz) => ({
  title: quiz.title || '',
  description: quiz.description || '',
  questions: (quiz.questions || []).map((q) => ({
    key: q._id || crypto.randomUUID(),
    text: q.text,
    options: [...q.options],
    correct: Math.max(0, q.options.indexOf(q.correctAnswer)),
    explanation: q.explanation || '',
  })),
});

// What the server takes
export const quizPayload = (form) => ({
  title: form.title.trim(),
  description: form.description.trim(),
  questions: form.questions.map((q) => {
    const options = q.options.map((o) => o.trim());
    return { text: q.text.trim(), options, correctAnswer: options[q.correct], explanation: q.explanation.trim() };
  }),
});

// The first problem found, as { message, question } (question index, or -1 for the quiz itself), or null
export function quizProblem(form) {
  const L = QUIZ_LIMITS;
  if (!form.title.trim()) return { message: 'Give the quiz a title.', question: -1 };
  if (form.title.trim().length > L.TITLE) return { message: `Keep the title under ${L.TITLE} characters.`, question: -1 };
  if (form.description.trim().length > L.DESCRIPTION) return { message: `Keep the description under ${L.DESCRIPTION} characters.`, question: -1 };
  if (form.questions.length < L.MIN_QUESTIONS) return { message: `Add at least ${L.MIN_QUESTIONS} questions.`, question: -1 };
  if (form.questions.length > L.MAX_QUESTIONS) return { message: `Use at most ${L.MAX_QUESTIONS} questions.`, question: -1 };

  for (let i = 0; i < form.questions.length; i++) {
    const q = form.questions[i];
    const options = q.options.map((o) => o.trim());
    const at = (message) => ({ message: `Question ${i + 1}: ${message}`, question: i });
    if (!q.text.trim()) return at('write the question.');
    if (q.text.trim().length > L.TEXT) return at(`keep it under ${L.TEXT} characters.`);
    if (options.length < L.MIN_OPTIONS) return at(`add at least ${L.MIN_OPTIONS} options.`);
    if (options.some((o) => !o)) return at('fill in every option, or remove the empty ones.');
    if (options.some((o) => o.length > L.OPTION)) return at(`keep each option under ${L.OPTION} characters.`);
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return at('two options are the same.');
    if (q.explanation.trim().length > L.EXPLANATION) return at(`keep the explanation under ${L.EXPLANATION} characters.`);
  }
  return null;
}
