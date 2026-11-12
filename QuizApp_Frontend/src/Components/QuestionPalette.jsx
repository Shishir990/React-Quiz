import { useState } from "react"
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

const TABS = [
    { id: "all", label: "All" },
    { id: "answered", label: "Answered" },
    { id: "unanswered", label: "Unanswered" },
    { id: "marked", label: "Review" },
]

export function QuestionPalette({ onFinish }) {
    const { Questions, index, answers, visited, marked, dispatch } = useQuiz()
    const [tab, setTab] = useState("all")
    const total = Questions.length
    const answeredCount = Object.keys(answers).length
    const markedCount = Object.keys(marked).length
    const skippedCount = Object.keys(visited).filter((i) => answers[i] == null && Number(i) !== index).length

    const shown = Questions
        .map((q, i) => ({ q, i }))
        .filter(({ i }) =>
            tab === "all" ? true
                : tab === "answered" ? answers[i] != null
                : tab === "marked" ? marked[i]
                : answers[i] == null
        )

    return (
        <aside className="qz-palette" aria-label="Question palette">
            <div className="qz-palette-head">
                <div>
                    <p className="qz-palette-title">Questions</p>
                    <p className="qz-palette-sub">{answeredCount} answered · {total - answeredCount} left</p>
                </div>
                <span className="qz-palette-count">{answeredCount}/{total}</span>
            </div>

            <div className="qz-palette-tabs" role="tablist" aria-label="Filter questions">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={tab === t.id}
                        className={`qz-palette-tab ${tab === t.id ? "is-active" : ""}`}
                        onClick={() => setTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="qz-palette-grid">
                {shown.map(({ q, i }) => {
                    const status = statusOf(i, index, answers, visited)
                    const isMarked = !!marked[i]
                    return (
                        <button
                            key={q._id || i}
                            className={`qz-palette-btn is-${status} ${isMarked ? "is-marked" : ""}`}
                            onClick={() => dispatch({ type: "GoTo", payload: i })}
                            aria-label={`Question ${i + 1}, ${STATUS_TEXT[status]}${isMarked ? ", marked for review" : ""}`}
                            aria-current={status === "current" ? "step" : undefined}
                        >
                            {i + 1}
                        </button>
                    )
                })}
                {shown.length === 0 && <p className="qz-palette-empty">Nothing here yet</p>}
            </div>

            <ul className="qz-legend">
                <li><span className="qz-legend-dot is-answered" />Answered ({answeredCount})</li>
                <li><span className="qz-legend-dot is-skipped" />Not answered ({skippedCount})</li>
                <li><span className="qz-legend-dot is-marked" />For review ({markedCount})</li>
                <li><span className="qz-legend-dot is-current" />Current</li>
                <li><span className="qz-legend-dot is-unvisited" />Not visited</li>
            </ul>

            <button className="qz-palette-submit" onClick={onFinish}>
                Finish quiz
            </button>
        </aside>
    )
}
