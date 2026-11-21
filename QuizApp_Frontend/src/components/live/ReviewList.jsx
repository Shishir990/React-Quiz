import { useState } from 'react';
import { Icon } from '../ui';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'wrong', label: 'Wrong or skipped' },
  { value: 'right', label: 'Correct' },
];

// Every question of a finished game: the right answer, this player's answer, and how
// many players picked each option. Used on the final screen and in Past games.
//   review  [{ text, options, correctAnswer, explanation, myAnswer, counts }]
export default function ReviewList({ review }) {
  const [filter, setFilter] = useState('all');
  const isRight = (q) => q.myAnswer === q.correctAnswer;
  const rightCount = review.filter(isRight).length;
  const shown = review
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => filter === 'all' || (filter === 'right' ? isRight(q) : !isRight(q)));

  return (
    <div className="lv-review">
      <div className="lv-review-head">
        <p className="db-section-sub">You got {rightCount} of {review.length} right.</p>
        <div className="pg-chips" role="group" aria-label="Show questions">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" className={`pg-chip ${filter === f.value ? 'is-active' : ''}`} aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ol className="lv-review-list">
        {shown.map(({ q, i }) => {
          const right = isRight(q);
          return (
            <li key={i} className={`lv-review-item ${right ? 'is-right' : 'is-wrong'}`}>
              <div className="lv-review-q">
                <span className="lv-review-num">{i + 1}</span>
                <p>{q.text}</p>
                <span className={`lv-review-mark ${right ? 'is-right' : 'is-wrong'}`}>
                  <Icon name={right ? 'check' : 'x'} size={15} /> {right ? 'Correct' : q.myAnswer ? 'Wrong' : 'Skipped'}
                </span>
              </div>
              <ul className="lv-review-options">
                {q.options.map((o, k) => {
                  const isCorrect = o === q.correctAnswer;
                  const isMine = o === q.myAnswer;
                  return (
                    <li key={k} className={`${isCorrect ? 'is-correct' : ''} ${isMine && !isCorrect ? 'is-mine-wrong' : ''}`}>
                      <span className="lv-review-letter">{LETTERS[k]}</span>
                      <span className="lv-review-text">{o}</span>
                      {isMine && <span className="lv-tag">Your answer</span>}
                      <span className="lv-review-count" title={`${q.counts[k]} picked this`}>{q.counts[k]}</span>
                    </li>
                  );
                })}
              </ul>
              {q.explanation && <p className="lv-review-why"><strong>Why:</strong> {q.explanation}</p>}
            </li>
          );
        })}
        {shown.length === 0 && <li className="db-section-sub">Nothing here.</li>}
      </ol>
    </div>
  );
}
