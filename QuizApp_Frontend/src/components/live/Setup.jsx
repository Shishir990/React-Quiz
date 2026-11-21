import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCategories, useUserQuizzes } from '../../api/queries';
import { Icon } from '../ui';

const COUNTS = [5, 10, 15, 20];
const TIMES = [10, 20, 30];
const MIN_QUESTIONS = 3; // same as the live server

// Before a game: host a new room (from a category or one of your own quizzes),
// or join one with a code. `initialQuizId` preselects one of your quizzes.
export default function Setup({ onCreate, onJoin, disabled, initialCode = '', initialQuizId = '' }) {
  const { data: categories = [], isPending } = useCategories();
  const playable = categories.filter((c) => (c.questionCount ?? 0) >= MIN_QUESTIONS);
  const { data: myQuizzes = [], isPending: quizzesPending } = useUserQuizzes();
  const hostable = myQuizzes.filter((q) => q.questionCount >= MIN_QUESTIONS);

  const [source, setSource] = useState(initialQuizId ? 'mine' : 'category');
  const [quizId, setQuizId] = useState(initialQuizId);
  const [categoryId, setCategoryId] = useState('');
  const [count, setCount] = useState(10);
  const [seconds, setSeconds] = useState(20);
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const selected = playable.find((c) => c._id === categoryId);
  const maxCount = selected?.questionCount ?? Infinity;

  const run = async (kind, action) => {
    setBusy(kind);
    setMessage('');
    const res = await action();
    setBusy('');
    if (!res?.ok) setMessage(res?.message || 'Something went wrong.');
  };

  const host = (e) => {
    e.preventDefault();
    run('host', () => onCreate(source === 'mine'
      ? { quizId, seconds }
      : { categoryId, count: Math.min(count, maxCount), seconds }));
  };
  const chosenQuiz = hostable.find((q) => q._id === quizId);
  const ready = source === 'mine' ? !!chosenQuiz : !!categoryId;
  const join = (e) => {
    e.preventDefault();
    run('join', () => onJoin(code.trim().toUpperCase()));
  };

  return (
    <>
      {message && <div className="db-error-msg lv-msg" role="alert">{message}</div>}
      <div className="lv-setup">
        <form className="db-panel lv-card" onSubmit={host}>
          <div className="lv-card-head">
            <span className="lv-card-icon"><Icon name="play" size={18} /></span>
            <div>
              <h2 className="db-section-title">Host a game</h2>
              <p className="db-section-sub">Pick a quiz, share the code, play together in real time.</p>
            </div>
          </div>

          <p className="lv-label">Questions from</p>
          <div className="pg-chips" role="group" aria-label="Where the questions come from">
            {[['category', 'A category'], ['mine', 'My quizzes']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`pg-chip ${source === value ? 'is-active' : ''}`}
                aria-pressed={source === value}
                onClick={() => setSource(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {source === 'mine' ? (
            <>
              <label className="lv-label" htmlFor="lv-quiz">Your quiz</label>
              {!quizzesPending && hostable.length === 0 ? (
                <p className="db-section-sub lv-hint">
                  You haven&apos;t written a quiz with {MIN_QUESTIONS}+ questions yet. <Link to="/builder/edit">Create one</Link>
                </p>
              ) : (
                <select
                  id="lv-quiz"
                  className="pg-select lv-select"
                  value={quizId}
                  onChange={(e) => setQuizId(e.target.value)}
                  disabled={quizzesPending}
                  required
                >
                  <option value="">{quizzesPending ? 'Loading…' : 'Choose one of your quizzes'}</option>
                  {hostable.map((q) => (
                    <option key={q._id} value={q._id}>{q.title} ({q.questionCount} questions)</option>
                  ))}
                </select>
              )}
              <p className="db-section-sub lv-hint">
                Every question is played, in your order. Scores from your own quizzes aren&apos;t added to the leaderboard.
              </p>
            </>
          ) : (
            <>
              <label className="lv-label" htmlFor="lv-category">Category</label>
              <select
                id="lv-category"
                className="pg-select lv-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={isPending}
                required
              >
                <option value="">{isPending ? 'Loading…' : 'Choose a category'}</option>
                {playable.map((c) => (
                  <option key={c._id} value={c._id}>{c.name} ({c.questionCount} questions)</option>
                ))}
              </select>

              <p className="lv-label">Questions</p>
              <div className="pg-chips" role="group" aria-label="Number of questions">
                {COUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`pg-chip ${count === n ? 'is-active' : ''}`}
                    aria-pressed={count === n}
                    disabled={n > maxCount && n !== COUNTS[0]}
                    onClick={() => setCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {selected && count > maxCount && (
                <p className="db-section-sub lv-hint">This category has {maxCount}, so the game will use all of them.</p>
              )}
            </>
          )}

          <p className="lv-label">Time per question</p>
          <div className="pg-chips" role="group" aria-label="Seconds per question">
            {TIMES.map((s) => (
              <button
                key={s}
                type="button"
                className={`pg-chip ${seconds === s ? 'is-active' : ''}`}
                aria-pressed={seconds === s}
                onClick={() => setSeconds(s)}
              >
                {s}s
              </button>
            ))}
          </div>

          <button className="db-btn-light lv-submit" type="submit" disabled={disabled || !ready || !!busy}>
            {busy === 'host' ? 'Creating…' : 'Create room'} <Icon name="arrow" size={15} />
          </button>
        </form>

        <form className="db-panel lv-card" onSubmit={join}>
          <div className="lv-card-head">
            <span className="lv-card-icon"><Icon name="users" size={18} /></span>
            <div>
              <h2 className="db-section-title">Join a game</h2>
              <p className="db-section-sub">Enter the code on the host&apos;s screen.</p>
            </div>
          </div>

          <label className="lv-label" htmlFor="lv-code">Game code</label>
          <input
            id="lv-code"
            className="lv-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
            placeholder="ABCDE"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            aria-describedby="lv-code-hint"
          />
          <p id="lv-code-hint" className="db-section-sub lv-hint">5 letters and numbers</p>

          <button className="db-btn-light lv-submit" type="submit" disabled={disabled || code.trim().length !== 5 || !!busy}>
            {busy === 'join' ? 'Joining…' : 'Join game'} <Icon name="arrow" size={15} />
          </button>
        </form>
      </div>
    </>
  );
}
