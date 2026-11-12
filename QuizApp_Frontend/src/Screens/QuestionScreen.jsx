import { Next } from "../Components/Next";
import { useQuiz } from "../Context/Context";
import { Questions } from "../Components/Questions";
import { Timer } from "../Components/Timer";
import { QuestionPalette } from "../Components/QuestionPalette";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Finish } from "./FinishScreen";
import "../Styles/Pages.css";
import "../Styles/Quiz.css";

export function QuestionScreen() {
  const { user, index, numQuestions, secondsRemaining, fetchQues, status, dispatch, answers, Questions: questions, visited, marked, discardProgress, flushProgress } = useQuiz();
  const [exitOpen, setExitOpen] = useState(false);
  const hasLastQuesReached = index === numQuestions - 1;
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get("category");
  const navigate = useNavigate();

  useEffect(() => {
    fetchQues(categoryId);
  }, [categoryId]);

  // Leaving the screen any other way (browser back, a link) saves to the server too
  useEffect(() => () => flushProgress(), []);

  // ← / → move between questions
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest("input, textarea")) return;
      if (e.key === "ArrowRight") dispatch({ type: "Next" });
      if (e.key === "ArrowLeft") dispatch({ type: "Prev" });
      if ((e.key === "m" || e.key === "M") && !e.ctrlKey && !e.metaKey && !e.altKey) dispatch({ type: "ToggleMark" });
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
  // Progress = questions opened so far, not the one currently on screen
  const visitedCount = Object.keys(visited).filter((i) => Number(i) < numQuestions).length;
  const progress = numQuestions ? Math.round((visitedCount / numQuestions) * 100) : 0;
  const lowTime = secondsRemaining < 30;

  const finishQuiz = () => {
    const unanswered = numQuestions - Object.keys(answers).length;
    const forReview = Object.keys(marked).length;
    const plural = (n) => (n === 1 ? "question" : "questions");
    const warnings = [
      unanswered > 0 && `${unanswered} unanswered ${plural(unanswered)}`,
      forReview > 0 && `${forReview} ${plural(forReview)} marked for review`,
    ].filter(Boolean);
    if (warnings.length && !window.confirm(`You have ${warnings.join(" and ")}. Finish anyway?`)) return;
    dispatch({ type: "Finish" });
  };

  // Progress is saved as you go; this pushes the latest copy to the server
  const saveAndExit = () => {
    flushProgress();
    dispatch({ type: "HardReset" });
    navigate("/dashboard");
  };

  const exitAndRestart = () => {
    discardProgress(categoryId);
    dispatch({ type: "HardReset" });
    navigate("/dashboard");
  };

  const startOver = async () => {
    if (!window.confirm("Start this quiz again? Your saved answers and time will be cleared.")) return;
    await discardProgress(categoryId);
    fetchQues(categoryId, undefined, { fresh: true });
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
            {user?.name && (
              <span className="qz-player" title={`Playing as ${user.name}`}>
                <span className="qz-player-dot" aria-hidden="true" />
                <span className="qz-player-name">{user.name}</span>
              </span>
            )}
            <button className="qz-restart" onClick={startOver} title="Start this quiz again">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
              </svg>
              <span className="qz-restart-label">Start over</span>
            </button>
            <div className={`qz-timer ${lowTime ? "is-low" : ""}`} aria-label="Time remaining">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" />
              </svg>
              <Timer />
            </div>
            <button className="qz-close" onClick={() => setExitOpen(true)} aria-label="Exit quiz" title="Exit quiz">
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
          <span className="qz-progress-pct">{visitedCount} of {numQuestions} visited · {progress}%</span>
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

      {exitOpen && (
        <ExitDialog
          answered={Object.keys(answers).length}
          total={numQuestions}
          onClose={() => setExitOpen(false)}
          onSave={saveAndExit}
          onRestart={exitAndRestart}
        />
      )}
    </div>
  );
}

function ExitDialog({ answered, total, onClose, onSave, onRestart }) {
  // Esc closes the dialog
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="qz-modal-backdrop" onClick={onClose}>
      <div
        className="qz-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qz-exit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="qz-exit-title" className="qz-modal-title">Leave this quiz?</h2>
        <p className="qz-modal-text">
          You've answered {answered} of {total}. Save your progress to pick up where you left off,
          or exit and start fresh next time.
        </p>

        <div className="qz-modal-actions">
          <button className="qz-modal-btn is-primary" onClick={onSave} autoFocus>
            Save &amp; exit
            <span>Answers and time are kept</span>
          </button>
          <button className="qz-modal-btn is-danger" onClick={onRestart}>
            Exit &amp; restart
            <span>Progress is cleared</span>
          </button>
        </div>

        <button className="qz-modal-cancel" onClick={onClose}>Keep playing</button>
      </div>
    </div>
  );
}
