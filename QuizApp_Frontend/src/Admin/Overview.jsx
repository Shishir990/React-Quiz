import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStatsApi, getAdminCategoriesApi } from '../api/admin';
import { useQuiz } from '../Context/Context';
import { Icon } from '../Components/AppShell';
import { timeAgo } from '../utils/format';
import { EmptyState, SkeletonRows } from './ui';
import { categoryTints } from './tints';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function ActivityChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const label = (d, opts) => new Date(`${d.day}T00:00:00Z`).toLocaleDateString([], { timeZone: 'UTC', ...opts });

  return (
    <>
      <div className="ad-chart" role="img" aria-label={`Quiz attempts per day over the last ${days.length} days`}>
        {/* Light guide lines at 0, 50% and 100% of the busiest day */}
        <div className="ad-chart-grid" aria-hidden="true">
          <span data-v={max} />
          <span data-v={Math.round(max / 2)} />
          <span data-v={0} />
        </div>
        <div className="ad-chart-cols">
          {days.map((d, i) => (
            <div key={d.day} className="ad-chart-col" tabIndex={0}>
              <div className="ad-chart-track">
                <div className={`ad-chart-bar ${d.count ? '' : 'is-empty'}`} style={{ height: d.count ? `${(d.count / max) * 100}%` : undefined }} />
              </div>
              <span className="ad-chart-x">{(days.length - 1 - i) % 2 === 0 ? label(d, { day: 'numeric', month: 'short' }) : ''}</span>
              <span className="ad-chart-tip" role="tooltip">
                <strong>{label(d, { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                {d.count} {d.count === 1 ? 'attempt' : 'attempts'}
              </span>
            </div>
          ))}
        </div>
      </div>
      <table className="ad-sr-only">
        <caption>Quiz attempts per day</caption>
        <tbody>{days.map((d) => <tr key={d.day}><td>{d.day}</td><td>{d.count}</td></tr>)}</tbody>
      </table>
    </>
  );
}

export default function Overview() {
  const { user } = useQuiz();
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminStatsApi().then(setStats).catch((err) => setError(err.message));
    getAdminCategoriesApi().then(setCategories).catch(() => {});
  }, []);

  const tintOf = categoryTints(categories);
  const s = stats;
  const weekTotal = s ? s.activity.slice(-7).reduce((sum, d) => sum + d.count, 0) : 0;
  const prevWeekTotal = s ? s.activity.slice(0, 7).reduce((sum, d) => sum + d.count, 0) : 0;
  const busiest = s ? s.activity.reduce((best, d) => (d.count > best.count ? d : best), s.activity[0]) : null;

  const kpis = [
    { label: 'Total Users', value: s?.users.total, icon: 'users', tone: 'blue',
      sub: s && `${s.users.newThisWeek} new this week` },
    { label: 'Questions', value: s?.content.questions, icon: 'help', tone: 'teal',
      sub: s && `in ${s.content.categories} categories` },
    { label: 'Quiz Attempts', value: s?.attempts.total, icon: 'check', tone: 'green',
      sub: s && `${s.attempts.thisWeek} this week` },
    { label: 'Average Score', value: s ? (s.attempts.total ? `${s.attempts.avgScore}%` : '—') : undefined, icon: 'target', tone: 'orange',
      sub: s && (s.attempts.total ? `${s.attempts.passRate}% pass rate` : 'No attempts yet') },
  ];

  const health = s ? [
    {
      ok: s.content.emptyCategories.length === 0,
      title: s.content.emptyCategories.length
        ? `${s.content.emptyCategories.length} ${s.content.emptyCategories.length === 1 ? 'category has' : 'categories have'} no questions`
        : 'Every category has questions',
      text: s.content.emptyCategories.length
        ? s.content.emptyCategories.map((c) => c.name).join(', ')
        : 'Players can start any topic.',
      to: s.content.emptyCategories[0] && `/admin/questions/category?id=${s.content.emptyCategories[0]._id}&new=1`,
      action: 'Add questions',
    },
    {
      ok: s.content.missingExplanations === 0,
      title: s.content.missingExplanations
        ? `${s.content.missingExplanations} ${s.content.missingExplanations === 1 ? 'question is' : 'questions are'} missing an explanation`
        : 'All questions have explanations',
      text: s.content.missingExplanations
        ? 'Players see explanations when they review their answers.'
        : 'Players get feedback on every answer.',
      to: s.content.missingExplanations ? '/admin/questions' : null,
      action: 'Review questions',
    },
    {
      ok: s.users.admins > 1,
      title: `${s.users.admins} ${s.users.admins === 1 ? 'admin' : 'admins'}`,
      text: s.users.admins > 1 ? 'More than one person can manage the app.' : 'Consider adding a second admin as a backup.',
      to: s.users.admins > 1 ? null : '/admin/users',
      action: 'Manage users',
    },
  ] : [];

  return (
    <>
      <div className="ad-hero">
        <div className="ad-hero-title">
          <span className="ad-hero-icon"><Icon name="dashboard" size={22} /></span>
          <div>
            <h1 className="ad-title">{greeting()}, {user?.name?.split(' ')[0] || 'admin'}</h1>
            <p className="ad-subtitle">Here's how QuizApp is doing today.</p>
          </div>
        </div>
        <div className="ad-head-actions">
          <Link className="ad-btn ad-btn-glass" to="/admin/questions?newCategory=1"><Icon name="folder" size={15} /> New category</Link>
          <Link className="ad-btn ad-btn-primary ad-btn-glow" to="/admin/questions"><Icon name="plus" size={15} /> Add questions</Link>
        </div>
      </div>

      {error && <div className="ad-alert">{error}</div>}

      <div className="ad-kpis ad-kpis-wide">
        {kpis.map((k) => (
          <div key={k.label} className={`ad-kpi tone-${k.tone}`}>
            <span className="ad-kpi-icon"><Icon name={k.icon} size={18} /></span>
            <div>
              <p className="ad-kpi-label">{k.label}</p>
              <p className="ad-kpi-value">{s ? k.value : '…'}</p>
              {k.sub && <p className="ad-kpi-sub">{k.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="ad-ov-grid">
        {/* Activity */}
        <section className="ad-panel ad-ov-activity">
          <div className="ad-panel-head">
            <div>
              <h2>Quiz activity</h2>
              <p className="ad-muted">Attempts per day, last 14 days</p>
            </div>
            {s && (
              <div className="ad-ov-figures">
                <div><strong>{weekTotal}</strong><span>last 7 days</span></div>
                <div><strong>{prevWeekTotal}</strong><span>week before</span></div>
                <div><strong>{busiest?.count ? busiest.count : 0}</strong><span>busiest day</span></div>
              </div>
            )}
          </div>
          {s ? <ActivityChart days={s.activity} /> : <div className="ad-skeleton ad-skeleton-chart" />}
        </section>

        {/* Popular categories */}
        <section className="ad-panel">
          <div className="ad-panel-head">
            <div>
              <h2>Popular categories</h2>
              <p className="ad-muted">By number of attempts</p>
            </div>
            <Link className="ad-link" to="/admin/questions">All <Icon name="arrow" size={13} /></Link>
          </div>
          {!s ? (
            <SkeletonRows rows={4} />
          ) : s.popular.length === 0 ? (
            <EmptyState icon="📊" title="No attempts yet" text="Categories will rank here once players finish quizzes." />
          ) : (
            <ul className="ad-rank">
              {s.popular.map((c) => (
                <li key={c._id}>
                  <span className="ad-rank-icon" style={{ background: tintOf.get(c._id) || '#EFF6FF' }} aria-hidden="true">{c.icon || '📁'}</span>
                  <div className="ad-rank-body">
                    <div className="ad-rank-top">
                      <span className="ad-rank-name">{c.name}</span>
                      <span className="ad-rank-value">{c.attempts} {c.attempts === 1 ? 'attempt' : 'attempts'}</span>
                    </div>
                    <div className="ad-rank-bar" aria-hidden="true">
                      <span style={{ width: `${(c.attempts / s.popular[0].attempts) * 100}%` }} />
                    </div>
                    <span className="ad-muted ad-rank-sub">Average score {c.avgScore}%</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Latest attempts */}
        <section className="ad-panel">
          <div className="ad-panel-head">
            <div>
              <h2>Latest attempts</h2>
              <p className="ad-muted">Most recent quizzes finished</p>
            </div>
            <Link className="ad-link" to="/admin/users">Users <Icon name="arrow" size={13} /></Link>
          </div>
          {!s ? (
            <SkeletonRows rows={5} />
          ) : s.recent.length === 0 ? (
            <EmptyState icon="🕒" title="No attempts yet" text="Results appear here as players finish quizzes." />
          ) : (
            <ul className="ad-feed">
              {s.recent.map((r) => (
                <li key={r._id}>
                  <span className="ad-feed-icon" style={{ background: tintOf.get(r.category?._id) || '#F1F5F9' }} aria-hidden="true">{r.category?.icon || '📝'}</span>
                  <div className="ad-feed-body">
                    <p><strong>{r.user}</strong> <span className="ad-muted">finished</span> {r.category?.name || 'a deleted category'}</p>
                    <p className="ad-muted">{timeAgo(r.createdAt)}</p>
                  </div>
                  <span className={`ad-score ${r.passed ? 'is-pass' : 'is-fail'}`}>{r.percentage}%</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Content health */}
        <section className="ad-panel">
          <div className="ad-panel-head">
            <div>
              <h2>Content health</h2>
              <p className="ad-muted">Things worth a look</p>
            </div>
          </div>
          {!s ? (
            <SkeletonRows rows={3} />
          ) : (
            <ul className="ad-health">
              {health.map((h) => (
                <li key={h.title} className={h.ok ? 'is-ok' : 'is-warn'}>
                  <span className="ad-health-icon"><Icon name={h.ok ? 'check' : 'flame'} size={15} /></span>
                  <div className="ad-health-body">
                    <p className="ad-health-title">{h.title}</p>
                    <p className="ad-muted">{h.text}</p>
                  </div>
                  {!h.ok && h.to && <Link className="ad-btn ad-btn-xs" to={h.to}>{h.action}</Link>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
