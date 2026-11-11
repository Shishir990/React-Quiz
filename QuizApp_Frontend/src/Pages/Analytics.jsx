import { useState, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyAnalytics } from '../api/queries';
import AppShell, { Icon } from '../Components/AppShell';
import { formatDuration } from '../utils/format';
import '../Styles/Results.css';
import '../Styles/Analytics.css';

const PASS_MARK = 50;

const PERIODS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: 'all', label: 'All time' },
];

// Chart colors. The categorical order is checked for color-blind separation;
// "Other" and "Skipped" are a deliberately neutral light gray.
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
const NEUTRAL = '#cbd5e1';
const PRIMARY = SERIES[0];
const ANSWER_COLORS = { correct: SERIES[0], wrong: SERIES[1], skipped: NEUTRAL };

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

const sum = (list, fn) => list.reduce((s, x) => s + fn(x), 0);
const avg = (list, fn) => (list.length ? Math.round(sum(list, fn) / list.length) : 0);
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const categoryKey = (r) => r.category?._id || 'deleted';
const shortDate = (d) => new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short' });

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Midnight at the start of the period ("7" includes today and the 6 days before), or null for all time
function periodStart(period) {
  if (period === 'all') return null;
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - (Number(period) - 1));
  return d;
}

// One entry per category: attempts, average and best score
function groupByCategory(results) {
  const groups = new Map();
  results.forEach((r) => {
    const key = categoryKey(r);
    if (!groups.has(key)) groups.set(key, { id: key, name: r.category?.name || 'Deleted category', icon: r.category?.icon || '📝', items: [] });
    groups.get(key).items.push(r);
  });
  return [...groups.values()].map((g) => ({
    ...g,
    attempts: g.items.length,
    avg: avg(g.items, (r) => r.percentage),
    best: Math.max(...g.items.map((r) => r.percentage)),
  }));
}

// Quizzes per day for 7 / 30 days, or per week (last 12) for all time
function activityBuckets(results, period) {
  const today = startOfDay(new Date());
  const buckets = [];
  if (period === 'all') {
    // Weeks start on Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    for (let i = 11; i >= 0; i--) {
      const start = new Date(monday);
      start.setDate(monday.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      buckets.push({ start, end, label: shortDate(start), title: `Week of ${shortDate(start)}` });
    }
  } else {
    for (let i = Number(period) - 1; i >= 0; i--) {
      const start = new Date(today);
      start.setDate(today.getDate() - i);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      buckets.push({ start, end, label: shortDate(start), title: start.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) });
    }
  }
  return buckets.map((b) => {
    const items = results.filter((r) => new Date(r.createdAt) >= b.start && new Date(r.createdAt) < b.end);
    return { ...b, value: items.length, avg: avg(items, (r) => r.percentage) };
  });
}

// Measures an element so SVG charts can draw at real pixel size (text never stretches)
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

// Screen-reader copy of a chart's numbers
function DataTable({ caption, head, rows }) {
  return (
    <table className="an-sr-only">
      <caption>{caption}</caption>
      <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
    </table>
  );
}

function Panel({ title, sub, className = '', children }) {
  return (
    <section className={`db-panel an-panel ${className}`}>
      <div className="an-panel-head">
        <h2 className="db-section-title">{title}</h2>
        {sub && <p className="db-section-sub">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

// ── Score over time: line with a pass-mark reference and a hover crosshair ──
function TrendChart({ points }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const H = 230;
  const pad = { t: 14, r: 14, b: 28, l: 40 };
  const w = Math.max(width - pad.l - pad.r, 0);
  const h = H - pad.t - pad.b;
  const x = (i) => pad.l + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v) => pad.t + h - (v / 100) * h;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.percentage)}`).join('');
  const showDots = points.length <= 20;

  const nearest = (clientX, rect) => {
    const mx = clientX - rect.left;
    let best = 0;
    points.forEach((_, i) => { if (Math.abs(x(i) - mx) < Math.abs(x(best) - mx)) best = i; });
    return best;
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') setHover((i) => Math.min((i ?? -1) + 1, points.length - 1));
    if (e.key === 'ArrowLeft') setHover((i) => Math.max((i ?? points.length) - 1, 0));
  };

  const p = hover != null ? points[hover] : null;
  const tipX = p ? x(hover) : 0;
  const align = tipX < 90 ? 'is-start' : tipX > width - 90 ? 'is-end' : '';

  return (
    <div className="an-chart" ref={ref}>
      {width > 0 && (
        <svg
          width={width} height={H}
          className="an-svg"
          tabIndex={0}
          role="img"
          aria-label={`Score in each of your last ${points.length} quizzes. Use the arrow keys to step through them.`}
          onMouseMove={(e) => setHover(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
          onMouseLeave={() => setHover(null)}
          onBlur={() => setHover(null)}
          onKeyDown={onKey}
        >
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={pad.l + w} y1={y(v)} y2={y(v)} className={v === PASS_MARK ? 'an-grid is-pass' : 'an-grid'} />
              <text x={pad.l - 8} y={y(v)} dy="0.32em" textAnchor="end" className="an-axis">{v}%</text>
            </g>
          ))}
          <text x={pad.l + w} y={y(PASS_MARK) - 6} textAnchor="end" className="an-axis an-axis-strong">Pass mark</text>

          {p && <line x1={tipX} x2={tipX} y1={pad.t} y2={pad.t + h} className="an-crosshair" />}

          <path d={line} className="an-line" style={{ stroke: PRIMARY }} />
          {points.map((pt, i) => (showDots || hover === i) && (
            <circle key={pt._id} cx={x(i)} cy={y(pt.percentage)} r={hover === i ? 5.5 : 4} className="an-dot" style={{ fill: PRIMARY }} />
          ))}

          <text x={x(0)} y={H - 8} textAnchor={points.length === 1 ? 'middle' : 'start'} className="an-axis">{shortDate(points[0].createdAt)}</text>
          {points.length > 1 && (
            <text x={x(points.length - 1)} y={H - 8} textAnchor="end" className="an-axis">{shortDate(points[points.length - 1].createdAt)}</text>
          )}
        </svg>
      )}
      {p && (
        <div className={`an-tip ${align}`} style={{ left: tipX, top: y(p.percentage) }} role="status">
          <strong>{p.percentage}%</strong> · {p.passed ? 'Passed' : 'Not passed'}
          <span>{p.category?.name || 'Deleted category'}</span>
          <span>{new Date(p.createdAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}
      <DataTable
        caption="Score per quiz"
        head={['Date', 'Category', 'Score']}
        rows={points.map((pt) => [shortDate(pt.createdAt), pt.category?.name || 'Deleted category', `${pt.percentage}%`])}
      />
    </div>
  );
}

// ── Donut with a legend; hovering a slice or legend row shows its share in the middle ──
function Donut({ segments, centerValue, centerLabel, label }) {
  const [active, setActive] = useState(null);
  const shown = segments.filter((s) => s.value > 0);
  const total = sum(shown, (s) => s.value);
  const size = 180;
  const stroke = 26;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = shown.length > 1 ? 2 : 0; // surface-colored gap between slices

  // Each slice starts where the ones before it end
  const arcs = shown.map((s, i) => {
    const before = sum(shown.slice(0, i), (prev) => prev.value);
    const length = (s.value / total) * circumference;
    return { ...s, dash: Math.max(length - gap, 0.5), offset: (before / total) * circumference };
  });
  const current = shown.find((s) => s.key === active);

  return (
    <div className="an-donut-wrap">
      <div className="an-donut" role="img" aria-label={label}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {arcs.map((a) => (
              <circle
                key={a.key}
                cx={size / 2} cy={size / 2} r={radius}
                fill="none"
                stroke={a.color}
                strokeWidth={active === a.key ? stroke + 6 : stroke}
                strokeDasharray={`${a.dash} ${circumference}`}
                strokeDashoffset={-a.offset}
                className={`an-slice ${active && active !== a.key ? 'is-dim' : ''}`}
                onMouseEnter={() => setActive(a.key)}
                onMouseLeave={() => setActive(null)}
              />
            ))}
          </g>
        </svg>
        <div className="an-donut-center" aria-hidden="true">
          <strong>{current ? `${pct(current.value, total)}%` : centerValue}</strong>
          <span>{current ? current.label : centerLabel}</span>
        </div>
      </div>
      <ul className="an-legend">
        {segments.map((s) => (
          <li
            key={s.key}
            className={active && active !== s.key ? 'is-dim' : ''}
            onMouseEnter={() => s.value && setActive(s.key)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="an-swatch" style={{ background: s.color }} aria-hidden="true" />
            <span className="an-legend-label">{s.icon && <span aria-hidden="true">{s.icon} </span>}{s.label}</span>
            <span className="an-legend-value">{s.value}</span>
            <span className="an-legend-pct">{pct(s.value, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Vertical columns (activity, score spread) with per-column hover tips ──
function Columns({ bars, label, labelEvery = 1, unit }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="an-cols-wrap">
      <div className="an-cols-grid" aria-hidden="true">
        <span data-v={max} />
        <span data-v={Math.round(max / 2) === max ? '' : Math.round(max / 2)} />
        <span data-v={0} />
      </div>
      <div className="an-cols" role="img" aria-label={label}>
        {bars.map((b, i) => (
          <div key={b.label + i} className="an-col" tabIndex={0}>
            <div className="an-col-track">
              <div className={`an-col-bar ${b.value ? '' : 'is-empty'}`} style={{ height: b.value ? `${(b.value / max) * 100}%` : undefined, background: PRIMARY }} />
            </div>
            <span className="an-col-x">{(bars.length - 1 - i) % labelEvery === 0 ? b.label : ''}</span>
            <span className="an-tip an-col-tip" role="tooltip">
              <strong>{b.title || b.label}</strong>
              {plural(b.value, unit)}
              {b.extra && <span>{b.extra}</span>}
            </span>
          </div>
        ))}
      </div>
      <DataTable caption={label} head={['Period', unit]} rows={bars.map((b) => [b.title || b.label, b.value])} />
    </div>
  );
}

// ── Horizontal bars: every value is labelled, so the color only ties rows to the donut ──
function BarRows({ rows, empty }) {
  if (!rows.length) return <p className="an-empty-note">{empty}</p>;
  return (
    <ul className="an-bars">
      {rows.map((r) => (
        <li key={r.key} className={r.muted ? 'is-muted' : ''}>
          <div className="an-bar-top">
            <span className="an-bar-name">{r.icon && <span aria-hidden="true">{r.icon}</span>}{r.label}</span>
            <span className="an-bar-value">{r.valueLabel}</span>
          </div>
          <div className="an-bar-track" aria-hidden="true">
            <span style={{ width: `${r.value}%`, background: r.color }} />
          </div>
          <span className="an-bar-sub">{r.sub}</span>
        </li>
      ))}
    </ul>
  );
}

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
