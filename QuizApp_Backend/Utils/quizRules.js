// Rules shared by starting, saving and submitting a quiz
module.exports = {
  SECONDS_PER_QUESTION: 10,
  MAX_QUESTIONS: 500,
  PASS_MARK: 50,                               // percentage
  MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000,         // unfinished attempts expire after a week
};
