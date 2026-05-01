import { useQuiz } from "../Context/Context";
import { useNavigate } from "react-router-dom";
import '../Styles/Finish.css';

export function Finish() {
  const { answersLog, Questions, secondsRemaining, totalTime, result, resloading,setResult, dispatch, submitQuiz } = useQuiz();
  const navigate = useNavigate();

  const categoryId = Questions[0]?.category?._id || Questions[0]?.category;

  const handleSubmit = () => {
     console.log('totalTime:', totalTime);
  console.log('secondsRemaining:', secondsRemaining);
  console.log('timeTaken:', totalTime - secondsRemaining);
    submitQuiz(categoryId, answersLog, totalTime - secondsRemaining);
  };

  function handleReset(){
    setResult(null)
    dispatch({ type: "Reset",payload: Questions.length * 10  })
  }
  const formatTime = (seconds) => {
  if (!seconds || seconds === 0) return '00:00';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

  console.log(result)
  if (result) {
    return (
      <div className="result-screen">
        <div className="result-icon">{result.passed ? '🎉' : '😔'}</div>
        <h2>{result.passed ? 'Well done!' : 'Better luck next time!'}</h2>
        <p className="result-score">{result.percentage}%</p>
        <p className="result-sub">{result.score} out of {result.total} correct</p>
        <p className="result-sub">Time taken: {formatTime(result.timeTaken)}</p>
        <div className="answer-review">
          {result.answers?.map((a, i) => (
            <div key={i} className={`review-item ${a.isCorrect ? 'correct' : 'wrong'}`}>
              <span>{i + 1}. {a.selectedOption || 'Not answered'}</span>
              <span>{a.isCorrect ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>

        <div className="result-actions">
          <button onClick={handleReset}>Try Again</button>
          <button onClick={() => {
            dispatch({type:"HardReset"})
            setResult(null)
            navigate("/dashboard")
          }}>Dashboard</button>
        </div>
      </div>
    );
  }

  // Submit screen
  return (
    <div className="finish-screen">
      <h2>You've answered all {Questions.length} questions!</h2>
      <p>Answered: {answersLog?.length} / {Questions.length}</p>
      <button onClick={handleSubmit} disabled={resloading}>
        {resloading ? 'Submitting...' : 'Submit Quiz ✓'}
      </button>
      <button onClick={() => navigate('/dashboard')}>Exit</button>
    </div>
  );
}