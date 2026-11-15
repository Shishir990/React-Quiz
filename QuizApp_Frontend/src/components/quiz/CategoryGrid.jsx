import '../../styles/MyQuizzes.css';
import { Icon } from '../ui';
import { estimateTime, quizStatus, STATUS_TEXT, ACTION_TEXT } from '../../utils/quiz';
import { plural } from '../../utils/format';

// The progress line on every card: answered so far (saved quiz), best score
// (completed) or an empty track (not started)
function progressOf(cat, status, { progress, saved }) {
  if (status === 'progress') {
    const s = saved[cat._id];
    const total = s.total || cat.questionCount;
    return { pct: total ? Math.round((s.answered / total) * 100) : 0, label: 'answered' };
  }
  if (status === 'done') return { pct: progress[cat._id].best, label: 'best score' };
  return { pct: 0, label: 'not started' };
}

// The quiet line in the footer (the question count is already shown at the top)
function metaText(cat, status, { progress, saved }) {
  if (status === 'progress') {
    const s = saved[cat._id];
    return `${s.answered}/${s.total || cat.questionCount} · ${estimateTime(cat.questionCount)}`;
  }
  if (status === 'done') return `Best ${progress[cat._id].best}%`;
  if (status === 'new') return estimateTime(cat.questionCount);
  return 'No questions yet';
}

function QuizCard({ cat, index, data, isToday, onStart }) {
  const status = quizStatus(cat, data);
  const playable = status !== 'empty';
  const start = () => onStart(cat._id);
  const bar = progressOf(cat, status, data);

  return (
    <article
      className={`mq-card is-${status}`}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
      // The whole card starts the quiz; keyboard users get the same action from the footer button
      onClick={(e) => {
        if (!playable || e.target.closest('button')) return;
        start();
      }}
    >
      {/* Title on the left, question count on the right. The status is shown by colour
          (matching the filter tabs) and read out for screen readers. */}
      <div className="mq-card-top">
        <h3 className="mq-name">
          <span className="mq-icon" aria-hidden="true">{cat.icon || cat.name.charAt(0).toUpperCase()}</span>
          <span className="mq-name-text">{cat.name}</span>
        </h3>
        <span className="db-sr-only">{STATUS_TEXT[status]}</span>
        {playable && <span className="mq-total">{plural(cat.questionCount, 'question')}</span>}
      </div>
      {isToday && <span className="mq-chal">Today's challenge</span>}

      <div
        className="mq-progress"
        role="progressbar"
        aria-label={`${cat.name}, ${bar.label}`}
        aria-valuenow={bar.pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${bar.pct}%` }} />
      </div>

      <div className="mq-foot">
        <span className="mq-meta">{metaText(cat, status, data)}</span>
        {playable && (
          <button className="mq-action mq-start" onClick={start} aria-label={`${ACTION_TEXT[status]}: ${cat.name}`}>
            {ACTION_TEXT[status]} <Icon name="arrow" size={13} />
          </button>
        )}
      </div>
    </article>
  );
}

// Category cards with the player's own progress on each.
// data: { progress: best score etc. per category, saved: unfinished quiz per category }
export default function CategoryGrid({ categories, data, todayId, loading, error, onStart, emptyText }) {
  if (loading) {
    return (
      <div className="mq-grid" aria-hidden="true">
        {[...Array(6)].map((_, i) => <div key={i} className="mq-card mq-skeleton" />)}
      </div>
    );
  }

  if (error) return <div className="db-error-msg">{error}</div>;

  if (categories.length === 0) {
    return (
      <div className="db-panel db-empty">
        <span className="db-empty-icon" aria-hidden="true">📚</span>
        <p className="db-empty-title">{emptyText ? 'No quizzes match' : 'No categories yet'}</p>
        <p className="db-empty-text">{emptyText || "Once an admin adds categories and questions, they'll appear here."}</p>
      </div>
    );
  }

  return (
    <div className="mq-grid">
      {categories.map((cat, i) => (
        <QuizCard key={cat._id} cat={cat} index={i} data={data} isToday={cat._id === todayId} onStart={onStart} />
      ))}
    </div>
  );
}
