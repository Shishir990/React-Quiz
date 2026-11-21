import { useState } from 'react';
import { Icon } from '../ui';
import Countdown from './Countdown';
import Scoreboard from './Scoreboard';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// One question: answering while the clock runs, then the reveal with the right answer
export default function QuestionView({ room, myId, offline, clockOffset, onAnswer, onNext }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  // What this player tapped, shown at once before the server confirms it
  const [picked, setPicked] = useState({ index: -1, option: null });

  const revealed = room.status === 'reveal';
  const { question, reveal, me } = room;
  const myAnswer = me?.answer ?? (picked.index === room.index ? picked.option : null);
  const answeredCount = room.players.filter((p) => p.answered).length;
  const isLast = room.index === room.total - 1;

  const choose = async (option) => {
    if (revealed || myAnswer || busy || offline) return;
    setPicked({ index: room.index, option });
    setBusy(true);
    setMessage('');
    const res = await onAnswer(room.index, option);
    setBusy(false);
    if (!res?.ok) {
      setPicked({ index: -1, option: null });
      setMessage(res?.message || 'Your answer was not received.');
    }
  };

  const next = async () => {
    setBusy(true);
    const res = await onNext();
    setBusy(false);
    if (!res?.ok) setMessage(res?.message || 'Could not move on.');
  };

  const optionClass = (option) => {
    if (!revealed) return option === myAnswer ? 'is-picked' : '';
    if (option === reveal.correctAnswer) return 'is-correct';
    if (option === myAnswer) return 'is-wrong';
    return 'is-dim';
  };

  return (
    <div className="lv-play">
      <section className="db-panel lv-card lv-question-card">
        <div className="lv-question-top">
          <span className="lv-eyebrow">Question {room.index + 1} of {room.total}</span>
          {question.difficulty && <span className="db-pill">{question.difficulty}</span>}
        </div>

        {revealed ? (
          <div className="lv-countdown is-done" aria-hidden="true"><div className="lv-countdown-track"><div className="lv-countdown-bar" /></div></div>
        ) : (
          <Countdown endsAt={room.endsAt} seconds={room.seconds} clockOffset={clockOffset} />
        )}

        <h2 className="lv-question">{question.text}</h2>

        <div className="lv-options">
          {question.options.map((option, i) => (
            <button
              key={option}
              className={`lv-option ${optionClass(option)}`}
              onClick={() => choose(option)}
              disabled={revealed || !!myAnswer || offline}
              aria-pressed={option === myAnswer}
            >
              <span className="lv-option-letter">{LETTERS[i]}</span>
              <span className="lv-option-text">{option}</span>
              {revealed && <span className="lv-option-count" aria-label={`${reveal.counts[i]} picked this`}>{reveal.counts[i]}</span>}
            </button>
          ))}
        </div>

        {message && <p className="lv-inline-error" role="alert">{message}</p>}

        {!revealed && (
          <p className="lv-waiting">
            {myAnswer ? <><Icon name="check" size={15} /> Answer locked in.</> : 'Faster correct answers score more points.'}
            <span className="lv-muted"> {answeredCount}/{room.players.length} answered</span>
          </p>
        )}

        {revealed && (
          <div className={`lv-result ${me?.isCorrect ? 'is-good' : 'is-bad'}`} role="status">
            <strong>
              {me?.isCorrect ? `Correct! +${me.points.toLocaleString()} points` : myAnswer ? 'Not quite.' : "Time's up, no answer."}
            </strong>
            {reveal.explanation && <p>{reveal.explanation}</p>}
          </div>
        )}

        {room.isHost && (
          <div className="lv-host-bar">
            {revealed ? (
              <button className="db-btn-light" onClick={next} disabled={busy || offline}>
                {isLast ? 'See final results' : 'Next question'} <Icon name="arrow" size={15} />
              </button>
            ) : (
              <button className="db-btn-ghost" onClick={next} disabled={busy || offline}>End question now</button>
            )}
          </div>
        )}
        {!room.isHost && revealed && (
          <p className="lv-waiting"><span className="lv-pulse" aria-hidden="true" /> Waiting for {room.host.name} to continue…</p>
        )}
      </section>

      <section className="db-panel lv-card lv-side">
        <h2 className="db-section-title">{revealed ? 'Standings' : 'Players'}</h2>
        <Scoreboard players={room.players} myId={myId} mode={revealed ? 'reveal' : 'question'} limit={revealed ? 10 : undefined} />
      </section>
    </div>
  );
}
