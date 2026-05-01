const Result = require('../Models/Result');
const Question = require('../Models/Question');
const Quiz = require('../Models/Quiz');

exports.submit = async (req, res) => {
  const { categoryId, answers, timeTaken } = req.body;
  // answers: [{ question: "questionId", selectedOption: "answer" }]
  console.log('Submit body received:', { categoryId, answers, timeTaken });
  try {
    // Fetch questions WITH correctAnswer from DB
    const questions = await Question.find({ category: categoryId });
    console.log('Questions found:', questions.length);
    if (!questions.length) {
      return res.status(404).json({ message: 'Questions not found' });
    }

    let score = 0;

    // Check each answer against DB
    const evaluated = answers.map(({ question, selectedOption }) => {
      const q = questions.find(q => q._id.toString() === question);
      const isCorrect = q?.correctAnswer === selectedOption;
      if (isCorrect) score++;
      return { question, selectedOption, isCorrect };
    });

    const total = questions.length;
    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= 50; // pass mark

    const result = await Result.create({
      user: req.user._id,
      quiz: categoryId,
      answers: evaluated,
      score,
      percentage,
      passed,
      timeTaken
    });

    // Send back evaluated answers so frontend can show correct/wrong
    res.status(201).json({
      score,
      total,
      percentage,
      passed,
      timeTaken,
      answers: evaluated  // ← frontend uses this to highlight correct/wrong
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};