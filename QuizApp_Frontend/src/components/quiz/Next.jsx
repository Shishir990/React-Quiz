import { useQuiz } from "../../context/QuizContext";
import "../../styles/Pages.css"

const Arrow = ({ flip }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export function Next({ isLast, onFinish }) {
  const { answer, index, marked, dispatch } = useQuiz();
  const isMarked = !!marked[index];

  return (
    <>
      <button
        className="qz-prev"
        disabled={index === 0}
        onClick={() => dispatch({ type: "Prev" })}
      >
        <Arrow flip /> Previous
      </button>

      <button
        className={`qz-mark ${isMarked ? "is-marked" : ""}`}
        aria-pressed={isMarked}
        onClick={() => dispatch({ type: "ToggleMark" })}
        title="Mark this question to come back to it (M)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={isMarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 21V4h11l-1.5 4L16 12H5" />
        </svg>
        <span className="qz-mark-full">{isMarked ? "Marked for review" : "Mark for review"}</span>
        <span className="qz-mark-short">{isMarked ? "Marked" : "Review"}</span>
      </button>

      {isLast ? (
        <button className="qz-next" onClick={onFinish}>
          Finish quiz <Arrow />
        </button>
      ) : (
        <button
          className={`qz-next ${answer === null ? "is-skip" : ""}`}
          onClick={() => dispatch({ type: "Next" })}
        >
          {answer === null ? "Skip" : <>Next<span className="qz-next-word"> question</span></>} <Arrow />
        </button>
      )}
    </>
  );
}
