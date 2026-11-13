// Circular percentage badge, coloured by score

export function ScoreRing({ score }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const clr = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';
  return (
    <div className="db-ring">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} className="db-ring-track" />
        <circle
          cx="26" cy="26" r={r}
          className="db-ring-bar"
          style={{ stroke: clr, strokeDasharray: c, strokeDashoffset: c * (1 - score / 100) }}
        />
      </svg>
      <span className="db-ring-num">{score}%</span>
    </div>
  );
}
