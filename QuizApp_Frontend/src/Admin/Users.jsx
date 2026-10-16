import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuiz } from '../Context/Context';
import { getUsersApi, setUserRoleApi, setUserStatusApi } from '../api/admin';
import { Icon } from '../Components/AppShell';
import { initialsOf, timeAgo } from '../utils/format';
import { ConfirmDialog, EmptyState, SkeletonRows } from './ui';

const ROLE_FILTERS = [
  { value: '', label: 'Everyone' },
  { value: 'admin', label: 'Admins' },
  { value: 'player', label: 'Players' },
  { value: 'disabled', label: 'Disabled' },
];

// What each pending action does, for the confirmation dialog
const ACTIONS = {
  promote: {
    title: (u) => `Make ${u.name} an admin?`,
    message: (u) => `${u.name} will be able to add, edit and delete questions and categories, and manage other users, including removing your admin access. They'll see the admin console the next time they open the app.`,
    confirm: 'Make admin',
    danger: false,
    run: (u) => setUserRoleApi(u._id, 'admin'),
    done: (u) => `${u.name} is now an admin`,
  },
  demote: {
    title: (u) => `Remove admin access from ${u.name}?`,
    message: (u) => `${u.name} will become a regular player and lose access to the admin console.`,
    confirm: 'Remove admin',
    danger: true,
    run: (u) => setUserRoleApi(u._id, 'player'),
    done: (u) => `${u.name} is now a player`,
  },
  disable: {
    title: (u) => `Disable ${u.name}'s account?`,
    message: (u) => `${u.name} will be signed out and won't be able to sign in or appear on the leaderboard. Their results are kept, and you can re-enable the account at any time.`,
    confirm: 'Disable account',
    danger: true,
    run: (u) => setUserStatusApi(u._id, false),
    done: (u) => `${u.name}'s account is disabled`,
  },
  enable: {
    title: (u) => `Re-enable ${u.name}'s account?`,
    message: (u) => `${u.name} will be able to sign in and play again.`,
    confirm: 'Enable account',
    danger: false,
    run: (u) => setUserStatusApi(u._id, true),
    done: (u) => `${u.name}'s account is enabled`,
  },
};

export default function Users() {
  const { toast } = useOutletContext();
  const { user: me } = useQuiz();
  const myId = me?._id || me?.id;

  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [pending, setPending] = useState(null); // { action, user }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getUsersApi().then(setUsers).catch((err) => setError(err.message));
  }, []);

  const runPending = async () => {
    const { action, user } = pending;
    setBusy(true);
    try {
      const updated = await ACTIONS[action].run(user);
      setUsers((list) => list.map((u) => (u._id === updated._id ? { ...u, ...updated } : u)));
      toast(ACTIONS[action].done(user));
      setPending(null);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = (users || []).filter((u) =>
    (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    && (!filter
      || (filter === 'disabled' ? !u.isActive : u.role === filter))
  );
  const counts = {
    '': users?.length,
    admin: users?.filter((u) => u.role === 'admin').length,
    player: users?.filter((u) => u.role === 'player').length,
    disabled: users?.filter((u) => !u.isActive).length,
  };

  return (
    <>
      <div className="ad-page-head">
        <div>
          <h1 className="ad-title">Users</h1>
          <p className="ad-subtitle">Everyone with a QuizApp account. Promote trusted players to admin here.</p>
        </div>
      </div>

      {error && <div className="ad-alert">{error}</div>}

      <section className="ad-card ad-card-flush">
        <div className="ad-toolbar">
          <label className="ad-search">
            <Icon name="search" size={15} />
            <input type="search" placeholder="Search by name or email…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search users" />
          </label>
          <div className="ad-tabs" role="group" aria-label="Filter users">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`ad-tab ${filter === f.value ? 'is-active' : ''}`}
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
                {users && <span className="ad-tab-count">{counts[f.value]}</span>}
              </button>
            ))}
          </div>
        </div>

        {!users && !error && <div className="ad-pad"><SkeletonRows rows={6} /></div>}

        {users && filtered.length === 0 && (
          <EmptyState icon="👤" title="No users match" text={q ? `Nobody matches "${query}".` : 'No one is in this group yet.'} />
        )}

        {filtered.length > 0 && (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Role</th>
                  <th scope="col" className="ad-num ad-hide-sm">Quizzes</th>
                  <th scope="col" className="ad-num ad-hide-sm">Avg. score</th>
                  <th scope="col" className="ad-hide-md">Last active</th>
                  <th scope="col" className="ad-hide-md">Joined</th>
                  <th scope="col"><span className="ad-sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isMe = u._id === myId;
                  return (
                    <tr key={u._id} className={u.isActive ? '' : 'is-disabled'}>
                      <td>
                        <div className="ad-user">
                          <span className={`ad-avatar ${u.role === 'admin' ? 'is-admin' : ''}`}>{initialsOf(u.name)}</span>
                          <div className="ad-user-info">
                            <p className="ad-user-name">{u.name}{isMe && <span className="ad-you">You</span>}</p>
                            <p className="ad-muted ad-user-email">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="ad-nowrap">
                        <span className={`ad-pill ${u.role === 'admin' ? 'ad-pill-admin' : ''}`}>
                          {u.role === 'admin' && <Icon name="shield" size={12} />} {u.role}
                        </span>
                        {!u.isActive && <span className="ad-pill ad-pill-off">disabled</span>}
                      </td>
                      <td className="ad-num ad-hide-sm">{u.quizzes}</td>
                      <td className="ad-num ad-hide-sm">{u.avgScore == null ? '—' : `${u.avgScore}%`}</td>
                      <td className="ad-hide-md ad-nowrap">{u.lastActive ? timeAgo(u.lastActive) : <span className="ad-muted">Never played</span>}</td>
                      <td className="ad-hide-md ad-nowrap">{new Date(u.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="ad-row-actions">
                        {isMe ? (
                          <span className="ad-muted ad-self-note">Your account</span>
                        ) : (
                          <>
                            {u.role === 'admin' ? (
                              <button className="ad-btn ad-btn-sm" onClick={() => setPending({ action: 'demote', user: u })}>Remove admin</button>
                            ) : (
                              <button className="ad-btn ad-btn-sm ad-btn-primary-soft" onClick={() => setPending({ action: 'promote', user: u })} disabled={!u.isActive}>
                                <Icon name="shield" size={13} /> Make admin
                              </button>
                            )}
                            <button
                              className={`ad-icon-btn ${u.isActive ? 'ad-icon-danger' : ''}`}
                              onClick={() => setPending({ action: u.isActive ? 'disable' : 'enable', user: u })}
                              aria-label={u.isActive ? `Disable ${u.name}` : `Enable ${u.name}`}
                              title={u.isActive ? 'Disable account' : 'Enable account'}
                            >
                              <Icon name={u.isActive ? 'ban' : 'check'} size={15} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {pending && (
        <ConfirmDialog
          title={ACTIONS[pending.action].title(pending.user)}
          message={ACTIONS[pending.action].message(pending.user)}
          confirmLabel={ACTIONS[pending.action].confirm}
          danger={ACTIONS[pending.action].danger}
          busy={busy}
          onConfirm={runPending}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
