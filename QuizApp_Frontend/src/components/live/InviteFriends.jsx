import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../ui';
import { PlayerAvatar } from '../leaderboard/PlayerAvatar';
import { useFriends } from '../../api/queries';
import { inviteFriendsApi } from '../../api/social';
import '../../styles/Social.css';

// Lobby panel: send friends a live invite to this room. They get a notification
// (and a pop-up if they're online) with a Join button.
export default function InviteFriends({ room, invited, onInvited }) {
  const navigate = useNavigate();
  const { data, isLoading } = useFriends();
  const [busy, setBusy] = useState({});
  const [error, setError] = useState('');

  const inRoom = new Set(room.players.map((p) => String(p.id)));
  const friends = (data?.friends || []).filter((f) => !inRoom.has(f.id));
  const joined = (data?.friends || []).filter((f) => inRoom.has(f.id)).length;

  const invite = async (ids) => {
    setError('');
    setBusy((b) => ({ ...b, ...Object.fromEntries(ids.map((id) => [id, true])) }));
    try {
      const res = await inviteFriendsApi({ userIds: ids, code: room.code, quizName: room.category?.name });
      onInvited(res.invited || ids);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy((b) => Object.fromEntries(Object.entries(b).filter(([id]) => !ids.includes(id))));
    }
  };

  const notInvited = friends.filter((f) => !invited.has(f.id)).map((f) => f.id);

  return (
    <section className="db-panel lv-card nt-invite">
      <div className="lv-card-head">
        <h2 className="db-section-title">Invite friends</h2>
        {notInvited.length > 1 && (
          <button className="db-btn-ghost fr-btn" onClick={() => invite(notInvited.slice(0, 20))}>Invite all</button>
        )}
      </div>

      {error && <p className="lv-inline-error" role="alert">{error}</p>}
      {isLoading && <p className="db-section-sub">Loading friends…</p>}

      {data && !data.friends.length && (
        <div className="nt-invite-empty">
          <p className="db-section-sub">Add friends to invite them here with one click.</p>
          <button className="db-btn-ghost fr-btn" onClick={() => navigate('/friends')}>
            <Icon name="userPlus" size={14} /> Find friends
          </button>
        </div>
      )}
      {data && data.friends.length > 0 && !friends.length && (
        <p className="db-section-sub">All your friends are already in this game.</p>
      )}

      {friends.length > 0 && (
        <ul className="fr-list">
          {friends.map((f) => (
            <li key={f.id} className="fr-row">
              <PlayerAvatar name={f.name} />
              <div className="fr-row-main">
                <p className="fr-name">{f.name}</p>
              </div>
              {invited.has(f.id) ? (
                <span className="fr-tag"><Icon name="check" size={14} /> Invited</span>
              ) : (
                <button className="db-btn-light fr-btn" onClick={() => invite([f.id])} disabled={busy[f.id]}>
                  {busy[f.id] ? 'Sending…' : 'Invite'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {joined > 0 && <p className="db-section-sub nt-invite-note">{joined} {joined === 1 ? 'friend has' : 'friends have'} joined.</p>}
    </section>
  );
}
