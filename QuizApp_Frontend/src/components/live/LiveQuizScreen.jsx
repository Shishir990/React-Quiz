import { useEffect, useState } from 'react';
import Countdown, { HeaderClock } from './Countdown';
import Scoreboard from './Scoreboard';
import '../../styles/Pages.css';
import '../../styles/Quiz.css';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const pad = (n) => String(n).padStart(2, '0');

// Letter or number keys pick an option; ignored while typing in a field
function useOptionKeys(options, onPick, enabled) {
  useEffect(() => {
    if (!enabled || !options?.length) return undefined;
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      let i = LETTERS.indexOf(key);
      if (i === -1 && /^[1-9]$/.test(key)) i = Number(key) - 1;
      if (i >= 0 && i < options.length) onPick(options[i]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [options, onPick, enabled]);
}

// The live game while it's being played, in the same full-screen layout as a solo quiz.
// `notices` (connection lost, leave confirmation) show under the header.
export default function LiveQuizScreen({
  room, myId, myName, offline, clockOffset, notices,
  onAnswer, onNext, onExamAnswer, onExamSubmit, onLeave,
}) {
  const exam = room.status === 'exam';
  // Exam answers as this player clicked them, shown at once before the server's next update
  const [local, setLocal] = useState({});
  const answerOf = (i) => (i in local ? local[i] : room.me?.answers?.[i] ?? null);
  const answeredCount = exam ? room.questions.filter((_q, i) => answerOf(i) != null).length : 0;

  const done = exam ? answeredCount : room.index + (room.status === 'reveal' ? 1 : 0);
  const progress = room.total ? Math.round((done / room.total) * 100) : 0;
  // While a question is open each player has an 'answered' flag; at the reveal, count the picks
  const playersAnswered = room.status === 'reveal'
    ? room.reveal.counts.reduce((a, b) => a + b, 0)
    : room.players.filter((p) => p.answered).length;

  return (
    <div className="qz-page lv-qz">
      <header className="qz-header">
        <div className="qz-header-row">
          <div className="qz-brand">
            <div className="qz-brand-icon lv-qz-live" aria-hidden="true">LIVE</div>
            <div>
              <p className="qz-brand-name">{room.category.name}</p>
              <p className="qz-brand-sub">Game {room.code} · {room.mode === 'exam' ? 'all at once' : 'one at a time'}</p>
            </div>
          </div>

          <div className="qz-header-actions">
            {myName && (
              <span className="qz-player" title={`Playing as ${myName}`}>
                <span className="qz-player-dot" aria-hidden="true" />
                <span className="qz-player-name">{myName}</span>
              </span>
            )}
            {room.endsAt && <HeaderClock endsAt={room.endsAt} clockOffset={clockOffset} lowMs={exam ? 60000 : 5000} />}
            <button className="qz-close" onClick={onLeave} aria-label={room.isHost ? 'End game' : 'Leave game'} title={room.isHost ? 'End game' : 'Leave game'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="qz-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Game progress">
          <div className="qz-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="qz-progress-meta">
          {exam
            ? <><span>{answeredCount} of {room.total} answered</span><span className="qz-progress-pct">{room.players.filter((p) => p.submitted).length} of {room.players.length} players submitted</span></>
            : <><span>Question {room.index + 1} of {room.total}</span><span className="qz-progress-pct">{playersAnswered} of {room.players.length} players answered</span></>}
        </div>
      </header>

      {notices}

      {exam ? (
        <ExamView
          room={room}
          myId={myId}
          offline={offline}
          answerOf={answerOf}
          answeredCount={answeredCount}
          setLocal={setLocal}
          onExamAnswer={onExamAnswer}
          onExamSubmit={onExamSubmit}
          onNext={onNext}
        />
      ) : (
        <SyncView key={room.index} room={room} myId={myId} offline={offline} clockOffset={clockOffset} answeredCount={playersAnswered} onAnswer={onAnswer} onNext={onNext} />
      )}
    </div>
  );
}

// ── One question at a time ──
function SyncView({ room, myId, offline, clockOffset, answeredCount, onAnswer, onNext }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  // What this player tapped, shown at once before the server confirms it
  const [picked, setPicked] = useState(null);

  const revealed = room.status === 'reveal';
  const { question, reveal, me } = room;
  const myAnswer = me?.answer ?? picked;
  const isLast = room.index === room.total - 1;
  const canAnswer = !revealed && !myAnswer && !busy && !offline;

  const choose = async (option) => {
    if (!canAnswer) return;
    setPicked(option);
    setBusy(true);
    setMessage('');
    const res = await onAnswer(room.index, option);
    setBusy(false);
    if (!res?.ok) {
      setPicked(null);
      setMessage(res?.message || 'Your answer was not received.');
    }
  };
  useOptionKeys(question.options, choose, canAnswer);

  const next = async () => {
    setBusy(true);
    const res = await onNext();
    setBusy(false);
    if (!res?.ok) setMessage(res?.message || 'Could not move on.');
  };

  const optionClass = (option) => {
    if (!revealed) return option === myAnswer ? 'is-selected' : '';
    if (option === reveal.correctAnswer) return 'lv-is-correct';
    if (option === myAnswer) return 'lv-is-wrong';
    return 'lv-is-dim';
  };

  const hint = revealed
    ? (me?.isCorrect ? `Correct! +${me.points.toLocaleString()} points` : myAnswer ? 'Not quite.' : "Time's up, no answer.")
    : myAnswer ? 'Answer locked in. Waiting for the others…' : 'Select one answer. Faster correct answers score more.';

  return (
    <div className="qz-layout">
      <main className="qz-body">
        <section className="qz-question" aria-labelledby="lv-question-text">
          <div className="qz-question-box">
            <p className="qz-eyebrow">Question {pad(room.index + 1)}{question.difficulty ? ` · ${question.difficulty}` : ''}</p>
            {!revealed && <Countdown endsAt={room.endsAt} seconds={room.seconds} clockOffset={clockOffset} />}
            <h1 id="lv-question-text" className="qz-question-text">{question.text}</h1>
            <p className={`qz-hint ${revealed ? (me?.isCorrect ? 'lv-hint-good' : 'lv-hint-bad') : ''}`} role={revealed ? 'status' : undefined}>{hint}</p>
          </div>

          <div className="qz-options" role="radiogroup" aria-label="Answer options">
            {question.options.map((option, i) => (
              <button
                key={option}
                role="radio"
                aria-checked={option === myAnswer}
                className={`qz-option ${optionClass(option)}`}
                onClick={() => choose(option)}
                disabled={!canAnswer && option !== myAnswer}
              >
                <span className="qz-option-letter">{LETTERS[i]}</span>
                <span className="qz-option-text">{option}</span>
                {revealed && <span className="lv-option-count" aria-label={`${reveal.counts[i]} picked this`}>{reveal.counts[i]}</span>}
              </button>
            ))}
          </div>

          {message && <p className="lv-inline-error" role="alert">{message}</p>}
          {revealed && reveal.explanation && <div className="lv-explain"><strong>Why:</strong> {reveal.explanation}</div>}
        </section>

        <div className="qz-footer">
          {room.isHost ? (
            revealed ? (
              <button className="qz-next" onClick={next} disabled={busy || offline}>
                {isLast ? 'See final results' : 'Next question'}
              </button>
            ) : (
              <button className="qz-prev" onClick={next} disabled={busy || offline}>End question now</button>
            )
          ) : (
            <p className="qz-footer-hint">
              {revealed ? `Waiting for ${room.host.name} to continue…` : 'The answer is shown when time is up or everyone has answered.'}
            </p>
          )}
        </div>
      </main>

      <aside className="qz-palette lv-qz-side is-top" aria-label={revealed ? 'Standings' : 'Players'}>
        <div className="qz-palette-head">
          <div>
            <p className="qz-palette-title">{revealed ? 'Standings' : 'Players'}</p>
            <p className="qz-palette-sub">{revealed ? `After question ${room.index + 1} of ${room.total}` : `${answeredCount} of ${room.players.length} answered`}</p>
          </div>
        </div>
        <Scoreboard players={room.players} myId={myId} mode={revealed ? 'reveal' : 'question'} limit={revealed ? 10 : undefined} />
      </aside>
    </div>
  );
}

// ── All questions at once ──
function ExamView({ room, myId, offline, answerOf, answeredCount, setLocal, onExamAnswer, onExamSubmit, onNext }) {
  const [current, setCurrent] = useState(0);
  const [visited, setVisited] = useState({ 0: true });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const total = room.questions.length;
  const question = room.questions[current];
  const myAnswer = answerOf(current);
  const submitted = !!room.me?.submitted;
  const canAnswer = !submitted && !offline;

  const go = (i) => {
    if (i < 0 || i >= total) return;
    setCurrent(i);
    setVisited((v) => ({ ...v, [i]: true }));
  };

  // Picking the chosen option again clears it
  const pick = async (option) => {
    if (!canAnswer) return;
    const index = current;
    const before = answerOf(index);
    const next = before === option ? null : option;
    setLocal((l) => ({ ...l, [index]: next }));
    setMessage('');
    const res = await onExamAnswer(index, next);
    if (!res?.ok) {
      setLocal((l) => ({ ...l, [index]: before }));
      setMessage(res?.message || 'Your answer was not saved.');
    }
  };
  useOptionKeys(question?.options, pick, canAnswer);

  // ← / → move between questions
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') go(current + 1);
      if (e.key === 'ArrowLeft') go(current - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const submit = async () => {
    const left = total - answeredCount;
    if (left > 0 && !window.confirm(`You have ${left} unanswered ${left === 1 ? 'question' : 'questions'}. Submit anyway?`)) return;
    setBusy(true);
    const res = await onExamSubmit();
    setBusy(false);
    if (!res?.ok) setMessage(res?.message || 'Could not submit. Try again.');
  };

  const endForEveryone = async () => {
    if (!window.confirm('End the game for everyone now? Answers so far are scored.')) return;
    setBusy(true);
    const res = await onNext();
    setBusy(false);
    if (!res?.ok) setMessage(res?.message || 'Could not end the game.');
  };

  const statusOf = (i) => {
    if (i === current && !submitted) return 'current';
    if (answerOf(i) != null) return 'answered';
    if (visited[i]) return 'skipped';
    return 'unvisited';
  };
  const waitingFor = room.players.filter((p) => !p.submitted && p.connected).length;

  return (
    <div className="qz-layout">
      <main className="qz-body">
        {submitted ? (
          <section className="qz-question-box lv-submitted" role="status">
            <p className="qz-eyebrow">Answers submitted</p>
            <h1 className="qz-question-text">You answered {answeredCount} of {total}.</h1>
            <p className="qz-hint">
              {waitingFor
                ? `Waiting for ${waitingFor} more ${waitingFor === 1 ? 'player' : 'players'}. Results appear when everyone has submitted or time runs out.`
                : 'Everyone is done. Results are on their way…'}
            </p>
          </section>
        ) : (
          <>
            <section className="qz-question" aria-labelledby="lv-question-text">
              <div className="qz-question-box">
                <p className="qz-eyebrow">Question {pad(current + 1)} of {total}{question.difficulty ? ` · ${question.difficulty}` : ''}</p>
                <h1 id="lv-question-text" className="qz-question-text">{question.text}</h1>
                <p className="qz-hint">Select one answer. You can change it until you submit.</p>
              </div>
              <div className="qz-options" role="radiogroup" aria-label="Answer options">
                {question.options.map((option, i) => {
                  const selected = option === myAnswer;
                  return (
                    <button
                      key={option}
                      role="radio"
                      aria-checked={selected}
                      className={`qz-option ${selected ? 'is-selected' : ''}`}
                      onClick={() => pick(option)}
                      disabled={!canAnswer}
                    >
                      <span className="qz-option-letter">{LETTERS[i]}</span>
                      <span className="qz-option-text">{option}</span>
                      {selected && (
                        <svg className="qz-option-check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              {message && <p className="lv-inline-error" role="alert">{message}</p>}
            </section>

            <div className="qz-footer">
              <button className="qz-prev" onClick={() => go(current - 1)} disabled={current === 0}>Previous</button>
              {myAnswer != null && (
                <button className="qz-mark" onClick={() => pick(myAnswer)} disabled={!canAnswer}>Clear answer</button>
              )}
              {current === total - 1 ? (
                <button className="qz-next" onClick={submit} disabled={busy || offline}>Submit answers</button>
              ) : (
                <button className={`qz-next ${myAnswer == null ? 'is-skip' : ''}`} onClick={() => go(current + 1)}>
                  {myAnswer == null ? 'Skip' : 'Next'}
                </button>
              )}
            </div>
          </>
        )}
      </main>

      <aside className="qz-palette lv-qz-side" aria-label="Questions and players">
        <div className="qz-palette-head">
          <div>
            <p className="qz-palette-title">Questions</p>
            <p className="qz-palette-sub">{answeredCount} answered · {total - answeredCount} left</p>
          </div>
          <span className="qz-palette-count">{answeredCount}/{total}</span>
        </div>

        <div className="qz-palette-grid">
          {room.questions.map((_q, i) => {
            const status = statusOf(i);
            return (
              <button
                key={i}
                className={`qz-palette-btn is-${status}`}
                onClick={() => go(i)}
                disabled={submitted}
                aria-label={`Question ${i + 1}, ${status === 'answered' ? 'answered' : status === 'current' ? 'current' : 'not answered'}`}
                aria-current={status === 'current' ? 'step' : undefined}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {!submitted && (
          <button className="qz-palette-submit" onClick={submit} disabled={busy || offline}>Submit answers</button>
        )}
        {room.isHost && (
          <button className="qz-palette-submit lv-end-btn" onClick={endForEveryone} disabled={busy || offline}>End for everyone</button>
        )}

        <p className="qz-palette-title lv-side-title">Players</p>
        <Scoreboard players={room.players} myId={myId} mode="exam" total={total} />
      </aside>
    </div>
  );
}
