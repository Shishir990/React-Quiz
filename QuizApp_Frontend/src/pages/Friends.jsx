import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { Icon } from '../components/ui';
import { PlayerAvatar } from '../components/leaderboard/PlayerAvatar';
import { useFriends, useUserSearch } from '../api/queries';
import { useFriendActions } from '../components/social/useFriendActions';
import { shortTimeAgo, shortDate } from '../utils/format';
import '../styles/Dashboard.css';
import '../styles/Leaderboard.css';
import '../styles/Social.css';

// Find players, answer friend requests, and start a live game with a friend
export default function Friends() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useFriends();
  const actions = useFriendActions();
  const [message, setMessage] = useState(null); // { text, type }

  // Results of an action, shown above the lists
  const report = (res, success) => setMessage(res.ok ? { text: success, type: 'ok' } : { text: res.message, type: 'error' });

  const friends = data?.friends || [];
  const incoming = data?.incoming || [];
  const outgoing = data?.outgoing || [];

  // Host a game and invite this friend once the room is open (see Live.jsx)
  const playWith = (friend) => navigate('/live', { state: { invite: { id: friend.id, name: friend.name } } });

  return (
    <AppShell title="Friends">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">Friends</h1>
          <p className="db-section-sub">Find players, add them as friends and invite them to live games.</p>
        </div>
      </div>

      {message && (
        <div className={`fr-message ${message.type === 'error' ? 'is-error' : ''}`} role={message.type === 'error' ? 'alert' : 'status'}>
          <Icon name={message.type === 'error' ? 'x' : 'check'} size={15} />
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} aria-label="Dismiss"><Icon name="close" size={13} /></button>
        </div>
      )}

      <div className="fr-grid">
        <div className="fr-col">
          <FindPlayers actions={actions} report={report} />

          {incoming.length > 0 && (
            <section className="db-panel fr-panel">
              <div className="fr-panel-head">
                <h2 className="db-section-title">Friend requests</h2>
                <span className="db-pill">{incoming.length}</span>
              </div>
              <ul className="fr-list">
                {incoming.map((r) => (
                  <li key={r.requestId} className="fr-row">
                    <PlayerAvatar name={r.user.name} />
                    <div className="fr-row-main">
                      <p className="fr-name">{r.user.name}</p>
                      <p className="fr-meta">Sent {shortTimeAgo(r.sentAt)}</p>
                    </div>
                    <div className="fr-row-actions">
                      <button className="db-btn-light fr-btn" disabled={actions.busy[r.requestId]}
                        onClick={async () => report(await actions.accept(r.requestId), `You and ${r.user.name} are now friends.`)}>
                        Accept
                      </button>
                      <button className="db-btn-ghost fr-btn" disabled={actions.busy[r.requestId]}
                        onClick={async () => report(await actions.decline(r.requestId), 'Request declined.')}>
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {outgoing.length > 0 && (
            <section className="db-panel fr-panel">
              <div className="fr-panel-head">
                <h2 className="db-section-title">Sent requests</h2>
                <span className="db-pill">{outgoing.length}</span>
              </div>
              <ul className="fr-list">
                {outgoing.map((r) => (
                  <li key={r.requestId} className="fr-row">
                    <PlayerAvatar name={r.user.name} />
                    <div className="fr-row-main">
                      <p className="fr-name">{r.user.name}</p>
                      <p className="fr-meta">Waiting · sent {shortTimeAgo(r.sentAt)}</p>
                    </div>
                    <button className="db-btn-ghost fr-btn" disabled={actions.busy[r.requestId]}
                      onClick={async () => report(await actions.cancel(r.requestId), 'Request cancelled.')}>
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section className="db-panel fr-panel">
          <div className="fr-panel-head">
            <h2 className="db-section-title">Your friends</h2>
            {friends.length > 0 && <span className="db-pill">{friends.length}</span>}
          </div>
          {isLoading && <div className="fr-skeleton" aria-hidden="true" />}
          {isError && (
            <div className="fr-empty">
              <p>{error.message}</p>
              <button className="db-btn-ghost fr-btn" onClick={() => refetch()}>Try again</button>
            </div>
          )}
          {data && !friends.length && (
            <div className="fr-empty">
              <span className="fr-empty-icon"><Icon name="users" size={22} /></span>
              <p className="fr-empty-title">No friends yet</p>
              <p>Search for players by name and send them a request. Once they accept, you can invite them to live games.</p>
            </div>
          )}
          {friends.length > 0 && (
            <ul className="fr-list">
              {friends.map((f) => (
                <FriendRow key={f.id} friend={f} busy={actions.busy[f.id]} onPlay={() => playWith(f)}
                  onRemove={async () => report(await actions.remove(f.id), `${f.name} was removed from your friends.`)} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

// Search box with live results; the button on each row depends on how we're connected
function FindPlayers({ actions, report }) {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  // Search once typing pauses
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);
  const { data: results = [], isFetching, isError, error } = useUserSearch(q);
  const searching = q.length >= 2;

  return (
    <section className="db-panel fr-panel">
      <div className="fr-panel-head">
        <h2 className="db-section-title">Find players</h2>
      </div>
      <label className="fr-search">
        <Icon name="search" size={16} />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search by name…"
          aria-label="Search players by name"
          maxLength={60}
          autoComplete="off"
        />
        {isFetching && searching && <span className="fr-spinner" aria-hidden="true" />}
      </label>

      {!searching && <p className="fr-hint">Type at least 2 letters of a name.</p>}
      {searching && isError && <p className="fr-hint is-error">{error.message}</p>}
      {searching && !isError && !isFetching && !results.length && <p className="fr-hint">No players found for “{q}”.</p>}

      {searching && results.length > 0 && (
        <ul className="fr-list">
          {results.map((u) => (
            <li key={u.id} className="fr-row">
              <PlayerAvatar name={u.name} />
              <div className="fr-row-main">
                <p className="fr-name">{u.name}</p>
                <p className="fr-meta">
                  {{ friends: 'Friend', sent: 'Request sent', received: 'Wants to be your friend', none: 'Player' }[u.relation]}
                </p>
              </div>
              <RelationButton user={u} actions={actions} report={report} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RelationButton({ user, actions, report }) {
  const busy = actions.busy[user.id] || (user.requestId && actions.busy[user.requestId]);
  if (user.relation === 'friends') {
    return <span className="fr-tag"><Icon name="userCheck" size={14} /> Friends</span>;
  }
  if (user.relation === 'sent') {
    return (
      <button className="db-btn-ghost fr-btn" disabled={busy}
        onClick={async () => report(await actions.cancel(user.requestId), 'Request cancelled.')}>
        Cancel request
      </button>
    );
  }
  if (user.relation === 'received') {
    return (
      <button className="db-btn-light fr-btn" disabled={busy}
        onClick={async () => report(await actions.accept(user.requestId), `You and ${user.name} are now friends.`)}>
        Accept
      </button>
    );
  }
  return (
    <button className="db-btn-light fr-btn" disabled={busy}
      onClick={async () => {
        const res = await actions.add(user.id);
        report(res, res.data?.status === 'accepted' ? `You and ${user.name} are now friends.` : `Friend request sent to ${user.name}.`);
      }}>
      <Icon name="userPlus" size={14} /> {busy ? 'Sending…' : 'Add friend'}
    </button>
  );
}

function FriendRow({ friend, busy, onPlay, onRemove }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="fr-row">
      <PlayerAvatar name={friend.name} />
      <div className="fr-row-main">
        <p className="fr-name">{friend.name}</p>
        <p className="fr-meta">{confirming ? `Remove ${friend.name} from your friends?` : `Friends since ${shortDate(friend.since)}`}</p>
      </div>
      {confirming ? (
        <div className="fr-row-actions">
          <button className="db-btn-ghost fr-btn is-danger" disabled={busy} onClick={onRemove}>Remove</button>
          <button className="db-btn-ghost fr-btn" onClick={() => setConfirming(false)} autoFocus>Keep</button>
        </div>
      ) : (
        <div className="fr-row-actions">
          <button className="db-btn-light fr-btn" onClick={onPlay} title={`Host a live game and invite ${friend.name}`}>
            <Icon name="play" size={13} /> Play
          </button>
          <button className="db-icon-btn fr-more" onClick={() => setConfirming(true)} aria-label={`Remove ${friend.name}`} title="Remove friend">
            <Icon name="trash" size={15} />
          </button>
        </div>
      )}
    </li>
  );
}

