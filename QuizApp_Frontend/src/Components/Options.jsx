import { useEffect } from "react"
import { useQuiz } from "../Context/Context"
import "../Styles/Pages.css"

const LETTERS = ["A", "B", "C", "D", "E", "F"]

export function Options({ options }) {
    const { dispatch, answer } = useQuiz()

    // Keyboard shortcuts: A–D (or 1–4) pick an option
    useEffect(() => {
        if (!options?.length) return
        const onKey = (e) => {
            if (e.target.closest("input, textarea")) return
            const key = e.key.toUpperCase()
            let i = LETTERS.indexOf(key)
            if (i === -1 && /^[1-9]$/.test(key)) i = Number(key) - 1
            if (i >= 0 && i < options.length) dispatch({ type: "AnswerClicked", payload: i })
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [options, dispatch])

    return (
        <div className="qz-options" role="radiogroup" aria-label="Answer options">
            {options?.map((option, index) => {
                const selected = index === answer
                return (
                    <button
                        key={index}
                        role="radio"
                        aria-checked={selected}
                        className={`qz-option ${selected ? "is-selected" : ""}`}
                        onClick={() => dispatch({ type: "AnswerClicked", payload: index })}
                    >
                        <span className="qz-option-letter">{LETTERS[index]}</span>
                        <span className="qz-option-text">{option}</span>
                        {selected && (
                            <svg className="qz-option-check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" />
                            </svg>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
