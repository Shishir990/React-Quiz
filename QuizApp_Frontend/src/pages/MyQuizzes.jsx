import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCategories, useMyResults, useSavedProgress } from '../api/queries';
import AppShell from '../components/layout/AppShell';
import CategoryGrid from '../components/quiz/CategoryGrid';
import { pickDailyChallenge } from '../utils/daily';
import { progressByCategory } from '../utils/results';
import { savedCategoryIds, loadProgress } from '../utils/quizProgress';
import { quizStatus } from '../utils/quiz';
import { pendingSaves, pendingDeletes } from '../api/progress';
import { useQuiz } from '../context/QuizContext';
import '../styles/Dashboard.css';
import { Icon } from '../components/ui';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'progress', label: 'In progress' },
  { value: 'done', label: 'Completed' },
  { value: 'new', label: 'Not started' },
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
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recommended');
  // The search box is in the top bar (AppShell) and writes ?q=
  const query = params.get('q') || '';
  // Phones hide the top bar search, so the page shows its own (kept in local state so typing never drops letters)
  const [phoneText, setPhoneText] = useState(query);
  const searchFromPhone = (value) => {
    setPhoneText(value);
    const next = new URLSearchParams(params);
    if (value.trim()) next.set('q', value); else next.delete('q');
    setParams(next, { replace: true });
  };

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

  // How far each unfinished quiz got: { answered, total, updatedAt } per category id
  const serverSaves = new Map((savedQuery.data ?? []).map((p) => [String(p.category), p]));
  const saved = {};
  for (const id of resumable) {
    const local = loadProgress(user?._id, id);
    const fromServer = serverSaves.get(id);
    // This browser's copy is newer while a save is on its way (or failed)
    saved[id] = local && (!fromServer || local.savedAt > new Date(fromServer.updatedAt).getTime())
      ? { answered: Object.keys(local.answers || {}).length, total: local.Questions.length, updatedAt: local.savedAt }
      : fromServer || { answered: 0, total: null };
  }

  const data = { progress, saved };
  const statusOf = (c) => quizStatus(c, data);
  const counts = { all: categories.length, progress: 0, done: 0, new: 0 };
  categories.forEach((c) => {
    const s = statusOf(c);
    counts[s === 'empty' ? 'new' : s] += 1;
  });

  const playable = categories.filter((c) => c.questionCount > 0);
  const challenge = pickDailyChallenge(categories);
  const playedCount = categories.filter((c) => progress[c._id]).length;

  // Recommended: unfinished quizzes, today's challenge, unplayed topics, then the rest; empty ones last
  const rank = (c) => {
    const s = statusOf(c);
    if (s === 'empty') return 4;
    if (s === 'progress') return 0;
    if (c._id === challenge?._id) return 1;
    return s === 'new' ? 2 : 3;
  };
  const sorters = {
    ...SORTS,
    recommended: { fn: (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name) },
    recent: { fn: (a, b) => new Date(progress[b._id]?.last || 0) - new Date(progress[a._id]?.last || 0) },
  };

  const inFilter = (c) => {
    if (filter === 'all') return true;
    const s = statusOf(c);
    return filter === 'new' ? s === 'new' || s === 'empty' : s === filter;
  };
  const q = query.trim().toLowerCase();
  const shown = categories
    .filter(inFilter)
    .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q))
    .sort(sorters[sort].fn);

  const startQuiz = (id) => navigate(`/quiz?category=${id}`);
  const randomQuiz = () => {
    if (!playable.length) return;
    startQuiz(playable[Math.floor(Math.random() * playable.length)]._id);
  };

  return (
    <AppShell title="My Quizzes">
      <div className="mq-head">
        <div>
          <h1 className="pg-title">My Quizzes</h1>
          <p className="mq-sub">
            {categoriesQuery.isPending
              ? 'Loading quizzes…'
              : `${categories.length} ${categories.length === 1 ? 'category' : 'categories'} · ${playedCount} played · ${counts.progress} in progress`}
          </p>
        </div>
        <button className="mq-btn is-primary mq-quick" onClick={randomQuiz} disabled={!playable.length}>
          <Icon name="play" size={13} /> Quick play
        </button>
      </div>

      <label className="mq-phone-search">
        <Icon name="search" size={16} />
        <input type="search" placeholder="Search quizzes…" aria-label="Search quizzes" value={phoneText} onChange={(e) => searchFromPhone(e.target.value)} />
      </label>

      <div className="mq-toolbar">
        <div className="mq-segments" role="group" aria-label="Filter quizzes">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`mq-segment ${filter === f.value ? 'is-active' : ''}`}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
            >
              {f.label} <span className="mq-segment-count">{counts[f.value]}</span>
            </button>
          ))}
        </div>
        <label className="mq-sort">
          <span>Sort</span>
          <select className="pg-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <CategoryGrid
        categories={shown}
        data={data}
        loading={categoriesQuery.isPending}
        error={categoriesQuery.isError ? categoriesQuery.error.message : ''}
        onStart={startQuiz}
        emptyText={categories.length ? 'Try a different search or filter.' : undefined}
      />
    </AppShell>
  );
}
