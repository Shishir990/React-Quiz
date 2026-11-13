import { useState } from 'react';
import { useWidth } from '../../hooks/useWidth';
import { shortDate } from '../../utils/format';
import { PASS_MARK } from '../../utils/results';
import { PRIMARY } from './colors';
import { DataTable } from './DataTable';

// ── Score over time: line with a pass-mark reference and a hover crosshair ──
export function TrendChart({ points }) {
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
