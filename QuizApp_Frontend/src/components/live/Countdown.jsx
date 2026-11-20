import { useEffect, useState } from 'react';

// Time left on the current question, from the server's deadline.
// `clockOffset` corrects for this device's clock being ahead or behind the server's.
export default function Countdown({ endsAt, seconds, clockOffset }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const ms = Math.max(0, endsAt - (now + clockOffset));
  const secs = Math.ceil(ms / 1000);
  const share = Math.min(1, ms / (seconds * 1000));
  const tone = share > 0.5 ? 'good' : share > 0.2 ? 'warn' : 'bad';

  return (
    <div className={`lv-countdown is-${tone}`} role="timer" aria-label={`${secs} seconds left`}>
      <span className="lv-countdown-num">{secs}</span>
      <div className="lv-countdown-track" aria-hidden="true">
        <div className="lv-countdown-bar" style={{ transform: `scaleX(${share})` }} />
      </div>
    </div>
  );
}
