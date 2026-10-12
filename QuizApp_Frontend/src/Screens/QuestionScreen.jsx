import { Next } from "../Components/Next";
import { useQuiz } from "../Context/Context";
import { Questions } from "../Components/Questions";
import { Timer } from "../Components/Timer";
import { QuestionPalette } from "../Components/QuestionPalette";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { Finish } from "./FinishScreen";
import "../Styles/Pages.css";
import "../Styles/Quiz.css";

export function QuestionScreen() {
  const { index, numQuestions, secondsRemaining, fetchQues, status, dispatch, answers, Questions: questions } = useQuiz();
  const hasLastQuesReached = index === numQuestions - 1;
  const { categoryId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchQues(categoryId);
  }, [categoryId]);

  // ← / → move between questions
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest("input, textarea")) return;
      if (e.key === "ArrowRight") dispatch({ type: "Next" });
      if (e.key === "ArrowLeft") dispatch({ type: "Prev" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  if (status === "finished") {
    return <Finish />;
  }

  if (status === "loading") {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading questions...</p>
      </div>
    );
  }

  const category = questions[0]?.category;
  const progress = numQuestions ? Math.round(((index + 1) / numQuestions) * 100) : 0;
  const lowTime = secondsRemaining < 30;

  const finishQuiz = () => {
    const unanswered = numQuestions - Object.keys(answers).length;
    if (
      unanswered > 0 &&
      !window.confirm(`You have ${unanswered} unanswered ${unanswered === 1 ? "question" : "questions"}. Finish anyway?`)
    ) return;
    dispatch({ type: "Finish" });
  };

  const exitQuiz = () => {
    if (!window.confirm("Leave this quiz? Your progress will be lost.")) return;
    dispatch({ type: "HardReset" });
    navigate("/dashboard");
  };

  return (
    <div className="qz-page">
      <header className="qz-header">
        <div className="qz-header-row">
          <div className="qz-brand">
            <div className="qz-brand-icon" aria-hidden="true">{category?.icon || "Q/"}</div>
            <div>
              <p className="qz-brand-name">QuizApp</p>
              <p className="qz-brand-sub">{category?.name || "Quiz"}</p>
            </div>
          </div>

          <div className="qz-header-actions">
            <div className={`qz-timer ${lowTime ? "is-low" : ""}`} aria-label="Time remaining">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" />
              </svg>
              <Timer />
            </div>
            <button className="qz-close" onClick={exitQuiz} aria-label="Exit quiz" title="Exit quiz">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div
          className="qz-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Quiz progress"
        >
          <div className="qz-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="qz-progress-meta">
          <span>Question {index + 1} of {numQuestions}</span>
          <span className="qz-progress-pct">{progress}% complete</span>
        </div>
      </header>

      <div className="qz-layout">
        <main className="qz-body">
          <Questions />
          <div className="qz-footer">
            <Next isLast={hasLastQuesReached} onFinish={finishQuiz} />
          </div>
        </main>
        <QuestionPalette onFinish={finishQuiz} />
      </div>
    </div>
  );
}
