// ── Horizontal bars: every value is labelled, so the color only ties rows to the donut ──
export function BarRows({ rows, empty }) {
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
