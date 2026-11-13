import { useState } from 'react';
import { pct, sum } from '../../utils/stats';

// ── Donut with a legend; hovering a slice or legend row shows its share in the middle ──
export function Donut({ segments, centerValue, centerLabel, label }) {
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
