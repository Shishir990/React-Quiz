import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCategories, useUserQuizzes } from '../../api/queries';
import { Icon } from '../ui';

const COUNTS = [5, 10, 15, 20];
const MIN_QUESTIONS = 3; // same as the live server

// Timing, with the live server's limits
const MODES = [
  { value: 'sync', label: 'One at a time', hint: 'Everyone sees the same question, with the answer after each one.' },
  { value: 'exam', label: 'All at once', hint: 'Every question together with one timer. Answer in any order, then submit.' },
];
const TIMING = {
  sync: { label: 'Time per question', unit: 'seconds', short: 's', presets: [10, 20, 30, 60], min: 5, max: 300, initial: 20 },
  exam: { label: 'Total time', unit: 'minutes', short: ' min', presets: [5, 10, 15, 30], min: 1, max: 180, initial: 10 },
};

// Preset chips plus "Custom", which shows a number box
function TimeChoice({ timing, value, custom, onPreset, onCustom }) {
  const invalid = custom !== null && !(Number(custom) >= timing.min && Number(custom) <= timing.max && Number.isInteger(Number(custom)));
  return (
    <>
      <p className="lv-label">{timing.label}</p>
      <div className="pg-chips lv-time-chips" role="group" aria-label={timing.label}>
        {timing.presets.map((t) => (
          <button
            key={t}
            type="button"
            className={`pg-chip ${custom === null && value === t ? 'is-active' : ''}`}
            aria-pressed={custom === null && value === t}
            onClick={() => onPreset(t)}
          >
            {t}{timing.short}
          </button>
        ))}
        <button
          type="button"
          className={`pg-chip ${custom !== null ? 'is-active' : ''}`}
          aria-pressed={custom !== null}
          onClick={() => onCustom(custom ?? String(value))}
        >
          Custom
        </button>
      </div>
      {custom !== null && (
        <div className="lv-custom-time">
          <input
            type="number"
            inputMode="numeric"
            className="lv-number"
            min={timing.min}
            max={timing.max}
            step={1}
            value={custom}
            onChange={(e) => onCustom(e.target.value)}
            aria-label={`${timing.label} in ${timing.unit}`}
            aria-invalid={invalid}
            autoFocus
          />
          <span className="db-section-sub">{timing.unit} ({timing.min}–{timing.max})</span>
        </div>
      )}
      {invalid && <p className="lv-inline-error">Enter a whole number from {timing.min} to {timing.max}.</p>}
    </>
  );
}

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
  const [mode, setMode] = useState('sync');
  // Chosen time per mode: a preset, or the text in the Custom box (null when not custom)
  const [times, setTimes] = useState({ sync: TIMING.sync.initial, exam: TIMING.exam.initial });
  const [customTimes, setCustomTimes] = useState({ sync: null, exam: null });
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

  const timing = TIMING[mode];
  const custom = customTimes[mode];
  const timeValue = custom === null ? times[mode] : Number(custom);
  const timeOk = Number.isInteger(timeValue) && timeValue >= timing.min && timeValue <= timing.max;

  const host = (e) => {
    e.preventDefault();
    const timingPayload = mode === 'exam' ? { mode, totalSeconds: timeValue * 60 } : { mode, seconds: timeValue };
    run('host', () => onCreate(source === 'mine'
      ? { quizId, ...timingPayload }
      : { categoryId, count: Math.min(count, maxCount), ...timingPayload }));
  };
  const chosenQuiz = hostable.find((q) => q._id === quizId);
  const ready = (source === 'mine' ? !!chosenQuiz : !!categoryId) && timeOk;
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

          <p className="lv-label">How questions are given</p>
          <div className="pg-chips" role="group" aria-label="How questions are given">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`pg-chip ${mode === m.value ? 'is-active' : ''}`}
                aria-pressed={mode === m.value}
                onClick={() => setMode(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="db-section-sub lv-hint">{MODES.find((m) => m.value === mode).hint}</p>

          <TimeChoice
            key={mode}
            timing={timing}
            value={times[mode]}
            custom={custom}
            onPreset={(t) => {
              setTimes((v) => ({ ...v, [mode]: t }));
              setCustomTimes((v) => ({ ...v, [mode]: null }));
            }}
            onCustom={(text) => setCustomTimes((v) => ({ ...v, [mode]: text }))}
          />

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
