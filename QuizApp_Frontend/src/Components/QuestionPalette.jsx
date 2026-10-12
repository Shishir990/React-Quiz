import { useQuiz } from "../Context/Context"

function statusOf(i, index, answers, visited) {
    if (i === index) return "current"
    if (answers[i] != null) return "answered"
    if (visited[i]) return "skipped"
    return "unvisited"
}

const STATUS_TEXT = {
    current: "current",
    answered: "answered",
    skipped: "not answered",
    unvisited: "not visited",
}

export function QuestionPalette({ onFinish }) {
    const { Questions, index, answers, visited, dispatch } = useQuiz()
    const total = Questions.length
    const answeredCount = Object.keys(answers).length
    const skippedCount = Object.keys(visited).filter((i) => answers[i] == null && Number(i) !== index).length

    return (
        <aside className="qz-palette" aria-label="Question palette">
            <div className="qz-palette-head">
                <p className="qz-palette-title">Questions</p>
                <span className="qz-palette-count">{answeredCount}/{total} answered</span>
            </div>

            <div className="qz-palette-grid">
                {Questions.map((q, i) => {
                    const status = statusOf(i, index, answers, visited)
                    return (
                        <button
                            key={q._id || i}
                            className={`qz-palette-btn is-${status}`}
                            onClick={() => dispatch({ type: "GoTo", payload: i })}
                            aria-label={`Question ${i + 1}, ${STATUS_TEXT[status]}`}
                            aria-current={status === "current" ? "step" : undefined}
                        >
                            {i + 1}
                        </button>
                    )
                })}
            </div>

            <ul className="qz-legend">
                <li><span className="qz-legend-dot is-answered" />Answered ({answeredCount})</li>
                <li><span className="qz-legend-dot is-skipped" />Not answered ({skippedCount})</li>
                <li><span className="qz-legend-dot is-current" />Current</li>
                <li><span className="qz-legend-dot is-unvisited" />Not visited</li>
            </ul>

            <button className="qz-palette-submit" onClick={onFinish}>
                Finish quiz
            </button>
        </aside>
    )
}
