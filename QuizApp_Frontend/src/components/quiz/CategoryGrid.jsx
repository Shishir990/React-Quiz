import '../../styles/MyQuizzes.css';
import { Icon } from '../ui';
import { difficultyLabel, estimateTime } from '../../utils/quiz';

const DIFFICULTY_TEXT = { easy: 'Easy', medium: 'Medium', hard: 'Hard', mixed: 'Mixed' };

function CategoryCard({ cat, progress, isToday, inProgress, onStart, index }) {
  const playable = cat.questionCount > 0;
  const level = difficultyLabel(cat.difficulty);
  const best = progress?.best;

  return (
    <article
      className={`mq-card ${isToday ? 'is-today' : ''} ${playable ? '' : 'is-empty'}`}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      {isToday && <span className="mq-today"><Icon name="flame" size={12} /> Today's challenge</span>}

      <header className="mq-card-head">
        <span className="mq-icon" aria-hidden="true">{cat.icon || cat.name.charAt(0).toUpperCase()}</span>
        {level && <span className={`mq-diff is-${level}`}>{DIFFICULTY_TEXT[level]}</span>}
      </header>

      <div className="mq-title">
        <h3 className="mq-name">{cat.name}</h3>
        <p className="mq-meta">
          {playable
            ? <>{cat.questionCount} {cat.questionCount === 1 ? 'question' : 'questions'} · {estimateTime(cat.questionCount)}</>
            : 'No questions yet'}
        </p>
      </div>

      {progress && (
        <div className="mq-best" title={`${progress.attempts} ${progress.attempts === 1 ? 'attempt' : 'attempts'}`}>
          <span className="mq-best-label">Best</span>
          <div className="mq-track"><span style={{ width: `${best}%` }} /></div>
          <strong>{best}%</strong>
        </div>
      )}

      <button className="mq-start" disabled={!playable} onClick={() => onStart(cat._id)}>
        {!playable ? 'Unavailable' : inProgress ? 'Resume quiz' : progress ? 'Play again' : 'Start quiz'}
        {playable && <Icon name="arrow" size={15} />}
      </button>
    </article>
  );
}

// Category cards with the player's own progress on each
export default function CategoryGrid({ categories, progress = {}, resumable, loading, error, todayId, onStart, emptyText }) {
  if (loading) {
    return (
      <div className="mq-grid">
        {[...Array(8)].map((_, i) => <div key={i} className="mq-card mq-skeleton" />)}
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
        <CategoryCard
          key={cat._id}
          cat={cat}
          index={i}
          progress={progress[cat._id]}
          isToday={todayId === cat._id}
          inProgress={resumable?.has(cat._id)}
          onStart={onStart}
        />
      ))}
    </div>
  );
}
