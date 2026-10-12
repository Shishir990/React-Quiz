import { useQuiz } from "../Context/Context";
import "../Styles/Pages.css"

const Arrow = ({ flip }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export function Next({ isLast, onFinish }) {
  const { answer, index, dispatch } = useQuiz();

  return (
    <>
      <button
        className="qz-prev"
        disabled={index === 0}
        onClick={() => dispatch({ type: "Prev" })}
      >
        <Arrow flip /> Previous
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
          {answer === null ? "Skip" : "Next question"} <Arrow />
        </button>
      )}
    </>
  );
}
