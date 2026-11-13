// Ring that fills as the day's quiz goal is met

export function GoalRing({ done, goal }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.min(done / goal, 1);
  return (
    <div className="db-goal-ring">
      <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
        <circle cx="42" cy="42" r={r} className="db-goal-track" />
        <circle
          cx="42" cy="42" r={r}
          className="db-goal-bar"
          style={{ strokeDasharray: c, strokeDashoffset: c * (1 - pct) }}
        />
      </svg>
      <span className="db-goal-num">{Math.min(done, goal)}<small>/{goal}</small></span>
    </div>
  );
}
