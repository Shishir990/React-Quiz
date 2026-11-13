// Quizzes completed per day over the last week
export function ActivityChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const peak = days.reduce((best, d) => (d.count > best.count ? d : best), days[0]);

  return (
    <div className="db-chart">
      <div className="db-chart-plot" role="img" aria-label={`Quizzes completed over the last 7 days: ${total} in total`}>
        {days.map((d) => {
          const showLabel = d.count > 0 && (d.isToday || d === peak);
          return (
            <div key={d.key} className={`db-chart-col ${d.isToday ? 'is-today' : ''}`} tabIndex={0}>
              <div className="db-chart-track">
                {showLabel && (
                  <span className="db-chart-value" style={{ bottom: `calc(${(d.count / max) * 100}% + 6px)` }}>
                    {d.count}
                  </span>
                )}
                <div
                  className={`db-chart-bar ${d.count === 0 ? 'is-empty' : ''}`}
                  style={{ height: d.count ? `${(d.count / max) * 100}%` : undefined }}
                />
              </div>
              <span className="db-chart-label">{d.label}</span>
              <div className="db-chart-tip" role="tooltip">
                <strong>{d.fullLabel}</strong>
                <span>{d.count} {d.count === 1 ? 'quiz' : 'quizzes'}</span>
                {d.count > 0 && <span>Avg. score {d.avg}%</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Same data for screen readers */}
      <table className="db-sr-only">
        <caption>Quizzes completed per day</caption>
        <thead><tr><th>Day</th><th>Quizzes</th><th>Average score</th></tr></thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.key}><td>{d.fullLabel}</td><td>{d.count}</td><td>{d.count ? `${d.avg}%` : '—'}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
