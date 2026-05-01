import { useQuiz } from "../Context/Context"
import "../Styles/Pages.css"
export function StartScreen() {
    const { dispatch,numQuestions} = useQuiz()

    return (
        <>
            <h2>Welcome to React Quiz</h2>
            <button className="next-finish-btn" onClick={() => { dispatch({ type: "Start" ,payload:numQuestions}) }}>Start Quiz</button>
        </>
    )
}