import { useEffect, useState } from 'react';

// Milliseconds left until the server's deadline. `clockOffset` corrects for this
// device's clock being ahead of or behind the server's.
export function useTimeLeft(endsAt, clockOffset) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);
  return endsAt ? Math.max(0, endsAt - (now + clockOffset)) : 0;
}

// 75000 -> "01:15", 3725000 -> "1:02:05"
export function clockText(ms) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
