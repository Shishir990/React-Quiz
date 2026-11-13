import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyAnalytics } from '../api/queries';
import AppShell from '../components/layout/AppShell';
import { formatDuration, plural } from '../utils/format';
import { avg, pct, sum } from '../utils/stats';
import { PASS_MARK, activityBuckets, categoryKey, groupByCategory, periodStart } from '../utils/results';
import { Panel, TrendChart, Donut, Columns, BarRows, SERIES, NEUTRAL, PRIMARY, ANSWER_COLORS } from '../components/charts';
import { Icon } from '../components/ui';
import '../styles/Results.css';
import '../styles/Analytics.css';

const PERIODS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: 'all', label: 'All time' },
];

const DIFFICULTIES = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

const SCORE_BUCKETS = [
  { label: '0–19%', min: 0, max: 19 },
  { label: '20–39%', min: 20, max: 39 },
  { label: '40–59%', min: 40, max: 59 },
  { label: '60–79%', min: 60, max: 79 },
  { label: '80–100%', min: 80, max: 100 },
];

const TREND_LIMIT = 30;

export default function Analytics() {
  const navigate = useNavigate();
  const analyticsQuery = useMyAnalytics();
  const results = analyticsQuery.data ?? [];
  const loading = analyticsQuery.isPending;
  const error = analyticsQuery.isError ? analyticsQuery.error.message : '';
  const [period, setPeriod] = useState('30');
  const [category, setCategory] = useState('all');

  // Colors follow the category, ranked over all time, so filtering never repaints them
  const allCategories = groupByCategory(results).sort((a, b) => b.attempts - a.attempts || a.name.localeCompare(b.name));
  const colorOf = new Map(allCategories.slice(0, SERIES.length).map((c, i) => [c.id, SERIES[i]]));
  const slotOf = (id) => (colorOf.has(id) ? [...colorOf.keys()].indexOf(id) : SERIES.length);

  const since = periodStart(period);
  const filtered = results
    .filter((r) => !since || new Date(r.createdAt) >= since)
    .filter((r) => category === 'all' || categoryKey(r) === category);

  // Summary
  const passed = filtered.filter((r) => r.passed).length;
  const correct = sum(filtered, (r) => r.correct);
  const wrong = sum(filtered, (r) => r.wrong);
  const skipped = sum(filtered, (r) => r.skipped);
  const answered = correct + wrong;
  const totalTime = sum(filtered, (r) => r.timeTaken || 0);
  const best = filtered.length ? Math.max(...filtered.map((r) => r.percentage)) : 0;

  const stats = [
    { label: 'Quizzes taken', value: filtered.length, icon: 'check', tone: 'emerald',
      trend: filtered.length ? `${passed} passed (${pct(passed, filtered.length)}%)` : null },
    { label: 'Average score', value: filtered.length ? `${avg(filtered, (r) => r.percentage)}%` : '—', icon: 'target', tone: 'blue',
      trend: filtered.length ? `Best ${best}%` : null },
    { label: 'Answer accuracy', value: answered ? `${pct(correct, answered)}%` : '—', icon: 'star', tone: 'violet',
      trend: answered ? `${correct} of ${answered} answered correctly` : null },
    { label: 'Time spent', value: formatDuration(totalTime), icon: 'clock', tone: 'orange',
      trend: filtered.length ? `${formatDuration(totalTime / filtered.length)} per quiz` : null },
  ];

  // Charts
  const trend = filtered.slice(-TREND_LIMIT);

  const answerSegments = [
    { key: 'correct', label: 'Correct', value: correct, color: ANSWER_COLORS.correct },
    { key: 'wrong', label: 'Wrong', value: wrong, color: ANSWER_COLORS.wrong },
    { key: 'skipped', label: 'Skipped', value: skipped, color: ANSWER_COLORS.skipped },
  ];

  const cats = groupByCategory(filtered).sort((a, b) => slotOf(a.id) - slotOf(b.id) || b.attempts - a.attempts);
  const named = cats.filter((c) => colorOf.has(c.id));
  const others = cats.filter((c) => !colorOf.has(c.id));
  const categorySegments = [
    ...named.map((c) => ({ key: c.id, label: c.name, icon: c.icon, value: c.attempts, color: colorOf.get(c.id) })),
    ...(others.length ? [{ key: 'other', label: `Other (${others.length})`, value: sum(others, (c) => c.attempts), color: NEUTRAL }] : []),
  ];

  const categoryRows = [...cats]
    .sort((a, b) => b.avg - a.avg)
    .map((c) => ({
      key: c.id, label: c.name, icon: c.icon, value: c.avg, valueLabel: `${c.avg}%`,
      color: colorOf.get(c.id) || NEUTRAL,
      sub: `${plural(c.attempts, 'attempt')} · best ${c.best}%`,
    }));
  const strongest = categoryRows[0];
  const weakest = categoryRows.length > 1 ? categoryRows[categoryRows.length - 1] : null;

  const difficultyRows = DIFFICULTIES.map((d) => {
    const c = sum(filtered, (r) => r.difficulty?.[d.key]?.correct || 0);
    const n = sum(filtered, (r) => r.difficulty?.[d.key]?.answered || 0);
    return {
      key: d.key, label: d.label, value: pct(c, n), valueLabel: n ? `${pct(c, n)}%` : '—',
      color: PRIMARY, muted: !n,
      sub: n ? `${c} of ${plural(n, 'question')} correct` : 'No questions answered yet',
    };
  });

  const activity = activityBuckets(filtered, period).map((b) => ({
    ...b, extra: b.value ? `Average ${b.avg}%` : null,
  }));

  const spread = SCORE_BUCKETS.map((b) => ({
    label: b.label,
    value: filtered.filter((r) => r.percentage >= b.min && r.percentage <= b.max).length,
  }));

  const periodLabel = PERIODS.find((p) => p.value === period).label.toLowerCase();

  return (
    <AppShell title="Analytics">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">Your analytics</h1>
          <p className="db-section-sub">How your quizzes are going, at a glance.</p>
        </div>
        {results.length > 0 && (
          <div className="an-filters">
            <div className="pg-chips" role="group" aria-label="Time period">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  className={`pg-chip ${period === p.value ? 'is-active' : ''}`}
                  aria-pressed={period === p.value}
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <select className="pg-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
              <option value="all">All categories</option>
              {allCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {error && <div className="db-error-msg">{error}</div>}

      {loading ? (
        <div className="an-grid">
          {[...Array(4)].map((_, i) => <div key={i} className="db-panel an-skeleton" />)}
        </div>
      ) : !error && results.length === 0 ? (
        <section className="db-panel db-empty">
          <span className="db-empty-icon" aria-hidden="true">📊</span>
          <p className="db-empty-title">No quizzes yet</p>
          <p className="db-empty-text">Finish a quiz and your charts will show up here.</p>
          <button className="db-btn-light" onClick={() => navigate('/dashboard')}>
            Browse categories <Icon name="arrow" size={15} />
          </button>
        </section>
      ) : !error && (
        <>
          <div className="db-stats">
            {stats.map((s, i) => (
              <div key={s.label} className={`db-stat-card tone-${s.tone}`} style={{ animationDelay: `${i * 60}ms` }}>
                <div className="db-stat-icon"><Icon name={s.icon} size={20} /></div>
                <div>
                  <p className="db-stat-label">{s.label}</p>
                  <p className="db-stat-value">{s.value}</p>
                  {s.trend && <p className="db-stat-trend">{s.trend}</p>}
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 ? (
            <section className="db-panel db-empty">
              <span className="db-empty-icon" aria-hidden="true">🔍</span>
              <p className="db-empty-title">No quizzes in this view</p>
              <p className="db-empty-text">Try a longer period or another category.</p>
              <button className="db-btn-ghost" onClick={() => { setPeriod('all'); setCategory('all'); }}>Show everything</button>
            </section>
          ) : (
            <div className="an-grid">
              <Panel
                title="Score over time"
                sub={filtered.length > TREND_LIMIT
                  ? `Your last ${TREND_LIMIT} quizzes`
                  : period === 'all' ? 'Every quiz so far' : `Every quiz in the last ${periodLabel}`}
                className="an-span-2"
              >
                <TrendChart points={trend} />
              </Panel>

              <Panel title="Your answers" sub={`${plural(correct + wrong + skipped, 'question')} in total`}>
                <Donut
                  segments={answerSegments}
                  centerValue={answered ? `${pct(correct, correct + wrong + skipped)}%` : '—'}
                  centerLabel="correct"
                  label={`Answers: ${correct} correct, ${wrong} wrong, ${skipped} skipped`}
                />
              </Panel>

              <Panel
                title="Activity"
                sub={period === 'all' ? 'Quizzes per week, last 12 weeks' : `Quizzes per day, last ${periodLabel}`}
                className="an-span-2"
              >
                <Columns
                  bars={activity}
                  unit="quiz"
                  labelEvery={period === '30' ? 5 : period === 'all' ? 2 : 1}
                  label={period === 'all' ? 'Quizzes per week' : 'Quizzes per day'}
                />
              </Panel>

              <Panel title="Quizzes by category" sub={plural(cats.length, 'category')}>
                <Donut
                  segments={categorySegments}
                  centerValue={filtered.length}
                  centerLabel={filtered.length === 1 ? 'quiz' : 'quizzes'}
                  label={`Quizzes by category: ${categorySegments.map((s) => `${s.label} ${s.value}`).join(', ')}`}
                />
              </Panel>

              <Panel
                title="Average score by category"
                sub={weakest ? `Strongest: ${strongest.label} · Needs work: ${weakest.label}` : 'Play more categories to compare'}
              >
                <BarRows rows={categoryRows} empty="No categories yet." />
              </Panel>

              <Panel title="Accuracy by difficulty" sub="Share of answered questions you got right">
                <BarRows rows={difficultyRows} empty="" />
              </Panel>

              <Panel title="Score spread" sub={`How your scores are distributed · pass mark ${PASS_MARK}%`}>
                <Columns bars={spread} unit="quiz" label="Number of quizzes in each score range" />
              </Panel>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
