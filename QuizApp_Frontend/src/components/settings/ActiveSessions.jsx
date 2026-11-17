import { useState } from 'react';
import { Icon } from '../ui';
import { useSessions, queryClient, queryKeys } from '../../api/queries';
import { revokeSessionApi } from '../../api/auth';
import { describeDevice } from '../../utils/device';
import { timeAgo, plural } from '../../utils/format';
import '../../styles/Sessions.css';

const fullDate = (d) =>
  new Date(d).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function SessionRow({ session }) {
  const device = describeDevice(session.userAgent);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const signOut = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await revokeSessionApi(session.id);
      // Already gone (expired, or ended elsewhere): the refetch below drops it either way
      if (!data?.success && !/not found/i.test(data?.message || '')) {
        throw new Error(data?.message || 'Could not sign out that device.');
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <li className={`ss-row${session.current ? ' is-current' : ''}`}>
      <div className="ss-icon"><Icon name={device.kind === 'desktop' ? 'monitor' : device.kind} size={20} /></div>

      <div className="ss-info">
        <p className="ss-name">
          {device.name}
          {session.current && <span className="ss-badge">This device</span>}
        </p>
        <p className="ss-meta">
          {session.current ? 'Active now' : `Last active ${timeAgo(session.lastActiveAt)}`}
          {session.ip && <> · {session.ip}</>}
        </p>
        <p className="ss-meta" title={`Session expires ${fullDate(session.expiresAt)}`}>
          Signed in {fullDate(session.startedAt)}
        </p>
        {error && <p className="ss-error">{error}</p>}
      </div>

      {!session.current && (
        <div className="ss-actions">
          {confirming ? (
            <>
              <button className="db-btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>Cancel</button>
              <button className="db-btn-light st-danger" onClick={signOut} disabled={busy}>
                {busy ? 'Signing out…' : 'Sign out'}
              </button>
            </>
          ) : (
            <button className="db-btn-ghost" onClick={() => setConfirming(true)}>Sign out</button>
          )}
        </div>
      )}
    </li>
  );
}

// The devices signed in to this account, each with its own "Sign out"
export function ActiveSessions() {
  const { data: sessions, isPending, isError, error, refetch, isFetching } = useSessions();

  return (
    <section className="db-panel st-card">
      <div className="st-card-head">
        <div className="st-card-icon"><Icon name="monitor" size={18} /></div>
        <div>
          <h3 className="st-card-title">Where you're signed in</h3>
          <p className="db-section-sub">
            {sessions ? `Signed in on ${plural(sessions.length, 'device')}. ` : ''}
            Don't recognise a device? Sign it out, then change your password.
          </p>
        </div>
      </div>

      {isPending ? (
        <ul className="ss-list" aria-busy="true">
          {[0, 1, 2].map((i) => <li key={i} className="ss-row ss-skeleton" />)}
        </ul>
      ) : isError ? (
        <div className="ss-state">
          <p className="auth-error">{error.message}</p>
          <button className="db-btn-ghost" onClick={() => refetch()} disabled={isFetching}>Try again</button>
        </div>
      ) : sessions.length === 0 ? (
        <p className="ss-state db-section-sub">No active sessions found.</p>
      ) : (
        <ul className="ss-list">
          {sessions.map((s) => <SessionRow key={s.id} session={s} />)}
        </ul>
      )}
    </section>
  );
}
