import { useTimeLeft, clockText } from '../../hooks/useTimeLeft';

// The clock in the quiz header, red for the last stretch
export function HeaderClock({ endsAt, clockOffset, lowMs = 10000 }) {
  const ms = useTimeLeft(endsAt, clockOffset);
  return (
    <div className={`qz-timer ${ms <= lowMs ? 'is-low' : ''}`} role="timer" aria-label={`${Math.ceil(ms / 1000)} seconds left`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" />
      </svg>
      <span className="qz-timer-value">{clockText(ms)}</span>
    </div>
  );
}

// A bar that empties as the question's time runs out
export default function Countdown({ endsAt, seconds, clockOffset }) {
  const ms = useTimeLeft(endsAt, clockOffset);
  const share = Math.min(1, ms / (seconds * 1000));
  const tone = share > 0.5 ? 'good' : share > 0.2 ? 'warn' : 'bad';
  return (
    <div className={`lv-countdown is-${tone}`} aria-hidden="true">
      <div className="lv-countdown-track">
        <div className="lv-countdown-bar" style={{ transform: `scaleX(${share})` }} />
      </div>
    </div>
  );
}
