import '../../styles/MyQuizzes.css';
import { Icon } from '../ui';
import { quizStatus, progressInfo, ACTION_TEXT } from '../../utils/quiz';
import { plural, shortTimeAgo } from '../../utils/format';

// When the player last touched this quiz: the latest result or save
function lastPlayed(cat, { progress, saved }) {
  const times = [progress[cat._id]?.last, saved[cat._id]?.updatedAt].filter(Boolean).map((t) => new Date(t).getTime());
  return times.length ? Math.max(...times) : null;
}

function QuizCard({ cat, index, data, onStart }) {
  const status = quizStatus(cat, data);
  const info = progressInfo(cat, status, data);
  const last = lastPlayed(cat, data);
  const playable = status !== 'empty';

  return (
    <article className={`mq-card is-${status}`} style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}>
      <div className="mq-card-head">
        <span className="mq-icon" aria-hidden="true">{cat.icon || cat.name.charAt(0).toUpperCase()}</span>
        <h3 className="mq-name">{cat.name}</h3>
        <span className="mq-meta">
          {playable ? plural(cat.questionCount, 'question') : 'No questions yet'}
        </span>
      </div>

      {/* Only once there is something to show */}
      {(status === 'progress' || status === 'done') && (
        <div className="mq-progress">
          <div className="mq-progress-row">
            <span>{info.label}</span>
            <strong>{info.value}</strong>
          </div>
          <div className="mq-track"><span style={{ width: `${info.pct}%` }} /></div>
        </div>
      )}

      <div className="mq-foot">
        <span className="mq-last">{last ? `Played ${shortTimeAgo(last)}` : playable ? 'New for you' : ''}</span>
        <button
          className={`mq-btn mq-start ${status === 'progress' ? 'is-primary' : ''}`}
          disabled={!playable}
          onClick={() => onStart(cat._id)}
          aria-label={playable ? `${ACTION_TEXT[status]}: ${cat.name}` : `${cat.name} has no questions yet`}
        >
          {ACTION_TEXT[status]}
          {playable && <Icon name="arrow" size={14} />}
        </button>
      </div>
    </article>
  );
}

// Category cards with the player's own progress on each.
// data: { progress: best score etc. per category, saved: unfinished quiz per category }
export default function CategoryGrid({ categories, data, loading, error, onStart, emptyText }) {
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
        <QuizCard key={cat._id} cat={cat} index={i} data={data} onStart={onStart} />
      ))}
    </div>
  );
}
