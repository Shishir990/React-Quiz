// Quizzes taken across all players per day (admin overview)

export function ActivityChart({ days }) {
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
