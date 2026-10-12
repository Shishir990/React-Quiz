import { useQuiz } from "../Context/Context"
import { Options } from "./Options"
import "../Styles/Pages.css"
export function Questions() {
    const { Questions, index } = useQuiz()
    const Question = Questions[index]

    return (
        <section className="qz-question" aria-labelledby="qz-question-text">
            <p className="qz-eyebrow">Question {String(index + 1).padStart(2, "0")}</p>
            <h1 id="qz-question-text" className="qz-question-text">{Question?.text}</h1>
            <p className="qz-hint">Select one correct answer.</p>
            <Options options={Question?.options} Question={Question} />
        </section>
    )
}
