import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getResultApi } from '../api/results';
import AppShell, { Icon, ScoreRing } from '../Components/AppShell';
import { formatDuration } from '../utils/format';
import '../Styles/Results.css';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'wrong', label: 'Incorrect' },
  { value: 'right', label: 'Correct' },
];

export default function ResultDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getResultApi(id)
      .then((data) => {
        if (data?._id) setResult(data);
        else setError(data?.message || 'Could not load this result.');
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const answers = (result?.answers || []).map((a, i) => ({ ...a, number: i + 1 }));
  const shown = answers.filter((a) => filter === 'all' || (filter === 'right' ? a.isCorrect : !a.isCorrect));
  const wrong = answers.filter((a) => !a.isCorrect).length;
  const playAgain = () => result?.category && navigate(`/quiz?category=${result.category._id}`);

  return (
    <AppShell title="Results">
      <Link to="/results" className="rs-back"><Icon name="back" size={15} /> All results</Link>

      {error && (
        <section className="db-panel db-empty">
          <span className="db-empty-icon" aria-hidden="true">🤔</span>
          <p className="db-empty-title">{error}</p>
          <Link className="db-btn-ghost" to="/results">Back to results</Link>
        </section>
      )}

      {!error && !result && (
        <>
          <div className="db-recent-skeleton rs-summary-skeleton" />
          <div className="db-recent-list">
            {[0, 1, 2].map((i) => <div key={i} className="db-recent-skeleton rs-q-skeleton" />)}
          </div>
        </>
      )}

      {result && (
        <>
          {/* Summary */}
          <section className="db-panel rs-summary">
            <span className="db-challenge-icon" aria-hidden="true">{result.category?.icon || '📝'}</span>
            <div className="rs-summary-body">
              <p className="db-eyebrow">
                {new Date(result.createdAt).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
              <h1 className="pg-title">{result.category?.name || 'Quiz'}</h1>
              <p className="rs-summary-meta">
                <span className={`db-tag ${result.passed ? 'db-tag-pass' : 'db-tag-fail'}`}>
                  {result.passed ? 'Passed' : 'Not passed'}
                </span>
                <span>{result.score} of {answers.length} correct</span>
                <span className="pg-dot" aria-hidden="true">·</span>
                <span>{formatDuration(result.timeTaken)}</span>
              </p>
            </div>
            <ScoreRing score={result.percentage} />
            {result.category && (
              <button className="db-btn-light" onClick={playAgain}>
                <Icon name="play" size={14} /> Play again
              </button>
            )}
          </section>

          {/* Answer review */}
          <section className="db-section">
            <div className="db-section-header">
              <div>
                <h2 className="db-section-title">Answer review</h2>
                <p className="db-section-sub">
                  {wrong ? `${wrong} to revisit` : 'A perfect run. Nothing to revisit!'}
                </p>
              </div>
              <div className="pg-chips" role="group" aria-label="Filter answers">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    className={`pg-chip ${filter === f.value ? 'is-active' : ''}`}
                    aria-pressed={filter === f.value}
                    onClick={() => setFilter(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {answers.length === 0 && (
              <div className="db-panel db-empty">
                <p className="db-empty-title">No answers were recorded for this attempt.</p>
              </div>
            )}

            {answers.length > 0 && shown.length === 0 && (
              <div className="db-panel db-empty">
                <p className="db-empty-title">
                  {filter === 'wrong' ? 'No incorrect answers. Nice work!' : 'No correct answers in this attempt.'}
                </p>
              </div>
            )}

            <ol className="rs-questions">
              {shown.map((a) => (
                <li key={a.number} className={`db-panel rs-q ${a.isCorrect ? 'is-right' : 'is-wrong'}`}>
                  <div className="rs-q-head">
                    <span className="rs-q-num">Q{a.number}</span>
                    <span className={`rs-q-verdict ${a.isCorrect ? 'is-right' : 'is-wrong'}`}>
                      <Icon name={a.isCorrect ? 'check' : 'x'} size={15} />
                      {a.isCorrect ? 'Correct' : a.selectedOption ? 'Incorrect' : 'Skipped'}
                    </span>
                  </div>

                  {a.question ? (
                    <>
                      <p className="rs-q-text">{a.question.text}</p>
                      <ul className="rs-options">
                        {a.question.options.map((opt) => {
                          const isAnswer = opt === a.question.correctAnswer;
                          const isPicked = opt === a.selectedOption;
                          return (
                            <li
                              key={opt}
                              className={`rs-option ${isAnswer ? 'is-answer' : ''} ${isPicked && !isAnswer ? 'is-picked-wrong' : ''}`}
                            >
                              <span>{opt}</span>
                              {isAnswer && <span className="rs-option-tag">Correct answer</span>}
                              {isPicked && !isAnswer && <span className="rs-option-tag">Your answer</span>}
                              {isPicked && isAnswer && <span className="rs-option-tag">Your answer</span>}
                            </li>
                          );
                        })}
                      </ul>
                      {a.question.explanation && (
                        <p className="rs-explain"><strong>Why:</strong> {a.question.explanation}</p>
                      )}
                    </>
                  ) : (
                    <p className="rs-q-text rs-q-missing">
                      This question has since been removed.{a.selectedOption && ` You answered "${a.selectedOption}".`}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </AppShell>
  );
}
