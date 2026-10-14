import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyResultsApi } from '../api/results';
import AppShell, { Icon, ScoreRing } from '../Components/AppShell';
import { timeAgo, formatDuration } from '../utils/format';
import '../Styles/Results.css';

const PAGE_SIZE = 15;

const SORTS = {
  newest: { label: 'Newest first', fn: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
  oldest: { label: 'Oldest first', fn: (a, b) => new Date(a.createdAt) - new Date(b.createdAt) },
  highest: { label: 'Highest score', fn: (a, b) => b.percentage - a.percentage },
  lowest: { label: 'Lowest score', fn: (a, b) => a.percentage - b.percentage },
};

const STATUS = [
  { value: 'all', label: 'All' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Not passed' },
];

const average = (list) => (list.length ? Math.round(list.reduce((s, r) => s + r.percentage, 0) / list.length) : 0);

// One entry per category played: attempts, best and average score
function byCategory(results) {
  const groups = new Map();
  results.forEach((r) => {
    const key = r.category?._id || 'unknown';
    if (!groups.has(key)) groups.set(key, { id: key, name: r.category?.name || 'Deleted category', icon: r.category?.icon || '📝', items: [] });
    groups.get(key).items.push(r);
  });
  return [...groups.values()]
    .map((g) => ({
      ...g,
      attempts: g.items.length,
      best: Math.max(...g.items.map((r) => r.percentage)),
      avg: average(g.items),
      last: g.items[0].createdAt, // results arrive newest first
    }))
    .sort((a, b) => b.attempts - a.attempts || b.best - a.best);
}

export default function Results() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    getMyResultsApi()
      .then((data) => {
        if (Array.isArray(data)) setResults(data);
        else setError(data?.message || 'Could not load your results.');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Changing a filter starts again from the first page
  const withReset = (setter) => (value) => {
    setter(value);
    setVisible(PAGE_SIZE);
  };
  const changeCategory = withReset(setCategory);
  const changeStatus = withReset(setStatus);
  const changeSort = withReset(setSort);

  const categories = byCategory(results);
  const filtered = results
    .filter((r) => category === 'all' || (r.category?._id || 'unknown') === category)
    .filter((r) => status === 'all' || (status === 'passed' ? r.passed : !r.passed))
    .sort(SORTS[sort].fn);

  const passed = results.filter((r) => r.passed).length;
  const totalTime = results.reduce((s, r) => s + (r.timeTaken || 0), 0);
  const stats = [
    { label: 'Quizzes taken', value: results.length, icon: 'check', tone: 'emerald' },
    { label: 'Average score', value: results.length ? `${average(results)}%` : '—', icon: 'target', tone: 'blue' },
    { label: 'Pass rate', value: results.length ? `${Math.round((passed / results.length) * 100)}%` : '—', icon: 'star', tone: 'violet', trend: results.length ? `${passed} of ${results.length} passed` : null },
    { label: 'Time spent', value: formatDuration(totalTime), icon: 'clock', tone: 'orange' },
  ];

  const resetFilters = () => {
    setCategory('all');
    setStatus('all');
    setVisible(PAGE_SIZE);
  };

  return (
    <AppShell title="Results">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">Your results</h1>
          <p className="db-section-sub">Every quiz you've finished. Open one to review your answers.</p>
        </div>
        <button className="db-btn-light" onClick={() => navigate('/dashboard')}>
          <Icon name="play" size={14} /> Take a quiz
        </button>
      </div>

      {error && <div className="db-error-msg">{error}</div>}

      {/* Summary */}
      <div className="db-stats">
        {stats.map((s, i) => (
          <div key={s.label} className={`db-stat-card tone-${s.tone}`} style={{ animationDelay: `${i * 60}ms` }}>
            <div className="db-stat-icon"><Icon name={s.icon} size={20} /></div>
            <div>
              <p className="db-stat-label">{s.label}</p>
              <p className="db-stat-value">{loading ? '…' : s.value}</p>
              {s.trend && <p className="db-stat-trend">{s.trend}</p>}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="rs-layout">
          <section className="db-panel">
            <div className="db-recent-list">
              {[...Array(5)].map((_, i) => <div key={i} className="db-recent-skeleton" />)}
            </div>
          </section>
          <section className="db-panel">
            <div className="db-recent-list">
              {[...Array(3)].map((_, i) => <div key={i} className="db-recent-skeleton" />)}
            </div>
          </section>
        </div>
      ) : !error && results.length === 0 ? (
        <section className="db-panel db-empty">
          <span className="db-empty-icon" aria-hidden="true">🚀</span>
          <p className="db-empty-title">No results yet</p>
          <p className="db-empty-text">Finish your first quiz and your scores will show up here.</p>
          <button className="db-btn-light" onClick={() => navigate('/dashboard')}>
            Browse categories <Icon name="arrow" size={15} />
          </button>
        </section>
      ) : !error && (
        <div className="rs-layout">

          {/* History */}
          <section className="db-panel">
            <div className="db-section-header">
              <div>
                <h2 className="db-section-title">Quiz history</h2>
                <p className="db-section-sub">
                  Showing {Math.min(visible, filtered.length)} of {filtered.length}
                  {filtered.length !== results.length && ` (filtered from ${results.length})`}
                </p>
              </div>
            </div>

            <div className="rs-filters">
              <div className="pg-chips" role="group" aria-label="Filter by result">
                {STATUS.map((s) => (
                  <button
                    key={s.value}
                    className={`pg-chip ${status === s.value ? 'is-active' : ''}`}
                    aria-pressed={status === s.value}
                    onClick={() => changeStatus(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="rs-selects">
                <select className="pg-select" value={category} onChange={(e) => changeCategory(e.target.value)} aria-label="Filter by category">
                  <option value="all">All categories</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="pg-select" value={sort} onChange={(e) => changeSort(e.target.value)} aria-label="Sort results">
                  {Object.entries(SORTS).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="db-empty">
                <span className="db-empty-icon" aria-hidden="true">🔍</span>
                <p className="db-empty-title">No results match these filters</p>
                <button className="db-btn-ghost" onClick={resetFilters}>Clear filters</button>
              </div>
            ) : (
              <>
                <ul className="db-recent-list rs-list">
                  {filtered.slice(0, visible).map((r) => (
                    <li key={r._id}>
                      <Link to={`/results/${r._id}`} className="db-recent-item rs-item">
                        <span className="db-recent-icon" aria-hidden="true">{r.category?.icon || '📝'}</span>
                        <div className="db-recent-info">
                          <p className="db-recent-title">{r.category?.name || 'Quiz'}</p>
                          <p className="db-recent-meta">
                            <span className={`db-tag ${r.passed ? 'db-tag-pass' : 'db-tag-fail'}`}>
                              {r.passed ? 'Passed' : 'Not passed'}
                            </span>
                            <span title={new Date(r.createdAt).toLocaleString()}>{timeAgo(r.createdAt)}</span>
                            <span className="pg-dot" aria-hidden="true">·</span>
                            <span>{r.score} correct</span>
                            {r.timeTaken != null && (
                              <>
                                <span className="pg-dot" aria-hidden="true">·</span>
                                <span>{formatDuration(r.timeTaken)}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <ScoreRing score={r.percentage} />
                        <span className="rs-chev" aria-hidden="true"><Icon name="arrow" size={16} /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {visible < filtered.length && (
                  <button className="db-btn-ghost rs-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    Show more ({filtered.length - visible} left)
                  </button>
                )}
              </>
            )}
          </section>

          {/* Per-category breakdown */}
          <section className="db-panel">
            <div className="db-section-header">
              <div>
                <h2 className="db-section-title">By category</h2>
                <p className="db-section-sub">Best score per topic. Click one to filter.</p>
              </div>
            </div>
            <ul className="rs-cats">
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    className={`rs-cat ${category === c.id ? 'is-active' : ''}`}
                    aria-pressed={category === c.id}
                    onClick={() => changeCategory(category === c.id ? 'all' : c.id)}
                  >
                    <span className="db-recent-icon" aria-hidden="true">{c.icon}</span>
                    <span className="rs-cat-body">
                      <span className="rs-cat-top">
                        <span className="rs-cat-name">{c.name}</span>
                        <span className="rs-cat-best">{c.best}%</span>
                      </span>
                      <span className="rs-bar" aria-hidden="true">
                        <span className="rs-bar-avg" style={{ width: `${c.avg}%` }} />
                        <span className="rs-bar-best" style={{ left: `${c.best}%` }} />
                      </span>
                      <span className="rs-cat-meta">
                        {c.attempts} {c.attempts === 1 ? 'attempt' : 'attempts'} · avg {c.avg}% · {timeAgo(c.last)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </AppShell>
  );
}
