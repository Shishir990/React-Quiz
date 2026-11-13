import { plural } from '../../utils/format';
import { PRIMARY } from './colors';
import { DataTable } from './DataTable';

// ── Vertical columns (activity, score spread) with per-column hover tips ──
export function Columns({ bars, label, labelEvery = 1, unit }) {
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
