import { useQuiz } from "../Context/Context";
import "../Styles/Pages.css"
export function Next({ isLast }) {
  const { answer, dispatch } = useQuiz();

  return (
    <button
      disabled={answer === null}
      className="next-finish-btn"
      onClick={() => {
        if (isLast) {
          dispatch({ type: "Finish" }); // ✅ safe to dispatch here
        } else {
          dispatch({ type: "Next" });
        }
      }}
    >
      {isLast ? 'Finish Quiz →' : 'Next →'}
    </button>
  );
}