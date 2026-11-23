import { useEffect, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import '../../styles/TopProgress.css';

// Thin lime loading bar across the top of the app.
// It runs while a page loads data for the first time or something is being saved.
// Background refreshes (e.g. the notifications check) don't count, so it never
// flickers on its own; and it waits a moment before showing, so fast loads don't flash.
const SHOW_AFTER_MS = 150;
const TRICKLE_MS = 250;

export function TopProgress() {
  // First loads only: queries still 'pending' have no data yet
  const loading = useIsFetching({ predicate: (q) => q.state.status === 'pending' });
  const saving = useIsMutating();
  const busy = loading + saving > 0;

  const [progress, setProgress] = useState(0); // 0 = hidden, then 0.08 → 0.9, then 1 when done
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (busy) {
      const start = setTimeout(() => {
        setFading(false);
        setProgress((p) => (p > 0 && p < 1 ? p : 0.08));
      }, SHOW_AFTER_MS);
      // Creep towards 90% while we wait, slowing down as it goes
      const trickle = setInterval(() => {
        setProgress((p) => (p > 0 && p < 0.9 ? p + (0.9 - p) * 0.08 : p));
      }, TRICKLE_MS);
      return () => {
        clearTimeout(start);
        clearInterval(trickle);
      };
    }
    // Done: fill to 100%, fade out, then hide (does nothing if it never showed)
    const finish = setTimeout(() => {
      setProgress((p) => (p > 0 ? 1 : 0));
      setFading(true);
    }, 0);
    const hide = setTimeout(() => {
      setProgress(0);
      setFading(false);
    }, 500);
    return () => {
      clearTimeout(finish);
      clearTimeout(hide);
    };
  }, [busy]);

  if (progress === 0) return null;
  return (
    <div className="top-progress" role="progressbar" aria-label="Loading" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
      <div className={`top-progress-bar ${fading ? 'is-done' : ''}`} style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
