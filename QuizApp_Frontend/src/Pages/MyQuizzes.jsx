import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories, useMyResults, useSavedProgress } from '../api/queries';
import AppShell from '../components/layout/AppShell';
import CategoryGrid from '../components/quiz/CategoryGrid';
import { pickDailyChallenge } from '../utils/daily';
import { progressByCategory } from '../utils/results';
import { savedCategoryIds } from '../utils/quizProgress';
import { pendingSaves, pendingDeletes } from '../api/progress';
import { useQuiz } from '../context/QuizContext';
import '../styles/Dashboard.css';
import { Icon } from '../components/ui';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'Not started' },
  { value: 'played', label: 'Played' },
];

const SORTS = {
  recommended: { label: 'Recommended' },
  name: { label: 'Name (A–Z)', fn: (a, b) => a.name.localeCompare(b.name) },
  questions: { label: 'Most questions', fn: (a, b) => b.questionCount - a.questionCount },
  recent: { label: 'Recently played' },
};

// Every quiz category, ready to start
export default function MyQuizzes() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recommended');

  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? [];
  const progress = progressByCategory(useMyResults().data ?? []);
  const { user } = useQuiz();
  // Saved on the server (any device); this browser's copy if the server can't be reached
  const savedQuery = useSavedProgress();
  // plus copies whose server save failed (opening the quiz resumes those from this
  // browser), plus saves/deletes still in flight, so "Save & exit" shows "Resume" immediately
  const resumable = savedQuery.isSuccess
    ? new Set([...savedQuery.data.map((p) => String(p.category)), ...savedCategoryIds(user?._id, { unsyncedOnly: true })])
    : savedCategoryIds(user?._id);
  for (const id of pendingSaves.keys()) resumable.add(String(id));
  for (const id of pendingDeletes.keys()) resumable.delete(String(id));
  const playable = categories.filter((c) => c.questionCount > 0);
  const challenge = pickDailyChallenge(categories);
  const playedCount = categories.filter((c) => progress[c._id]).length;

  // Recommended: today's challenge, then unplayed topics, then the rest; empty ones last
  const rank = (c) => (c.questionCount === 0 ? 3 : c._id === challenge?._id ? 0 : progress[c._id] ? 2 : 1);
  const sorters = {
    ...SORTS,
    recommended: { fn: (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name) },
    recent: { fn: (a, b) => new Date(progress[b._id]?.last || 0) - new Date(progress[a._id]?.last || 0) },
  };

  const q = query.trim().toLowerCase();
  const shown = categories
    .filter((c) => filter === 'all' || (filter === 'played' ? progress[c._id] : !progress[c._id]))
    .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q))
    .sort(sorters[sort].fn);

  const startQuiz = (id) => navigate(`/quiz?category=${id}`);
  const randomQuiz = () => {
    if (!playable.length) return;
    startQuiz(playable[Math.floor(Math.random() * playable.length)]._id);
  };

  return (
    <AppShell title="My Quizzes">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">My Quizzes</h1>
          <p className="db-section-sub">
            {categoriesQuery.isPending
              ? 'Loading quizzes…'
              : `${categories.length} ${categories.length === 1 ? 'category' : 'categories'} · you've played ${playedCount}`}
          </p>
        </div>
        <button className="db-btn-light" onClick={randomQuiz} disabled={!playable.length}>
          <Icon name="play" size={14} /> Quick play
        </button>
      </div>

      <div className="mq-toolbar">
        <label className="mq-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            placeholder="Search quizzes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search quizzes"
          />
        </label>
        <div className="pg-chips" role="group" aria-label="Filter quizzes">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`pg-chip ${filter === f.value ? 'is-active' : ''}`}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select className="pg-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort quizzes">
          {Object.entries(SORTS).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
        </select>
      </div>

      <CategoryGrid
        categories={shown}
        progress={progress}
        loading={categoriesQuery.isPending}
        error={categoriesQuery.isError ? categoriesQuery.error.message : ''}
        todayId={challenge?._id}
        resumable={resumable}
        onStart={startQuiz}
        emptyText={categories.length ? 'Try a different search or filter.' : undefined}
      />
    </AppShell>
  );
}
