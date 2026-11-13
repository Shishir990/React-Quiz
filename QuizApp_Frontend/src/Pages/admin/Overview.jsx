import { Link } from 'react-router-dom';
import { useAdminStats, useAdminCategories } from '../../api/queries';
import { useQuiz } from '../../context/QuizContext';
import { greeting, timeAgo } from '../../utils/format';
import { ActivityChart } from '../../components/admin/ActivityChart';
import { categoryTints } from '../../utils/tints';
import { Icon, EmptyState, SkeletonRows } from '../../components/ui';

export default function Overview() {
  const { user } = useQuiz();
  const statsQuery = useAdminStats();
  const stats = statsQuery.data ?? null;
  const error = statsQuery.isError ? statsQuery.error.message : '';
  const categories = useAdminCategories().data ?? [];

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
    <div className="ad-ov">
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
    </div>
  );
}
