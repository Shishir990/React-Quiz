import { useState } from 'react';
import { Icon } from '../ui';
import Scoreboard from './Scoreboard';

// Waiting room: the code to share, who has joined, and the host's Start button
export default function Lobby({ room, myId, onStart }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const link = `${window.location.origin}/live?code=${room.code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage('Copy failed. Share the code instead.');
    }
  };

  const start = async () => {
    setBusy(true);
    setMessage('');
    const res = await onStart();
    setBusy(false);
    if (!res?.ok) setMessage(res?.message || 'Could not start the game.');
  };

  const others = room.players.length - 1;

  return (
    <div className="lv-lobby">
      <section className="db-panel lv-card lv-code-card">
        <p className="lv-eyebrow">Game code</p>
        <p className="lv-code" aria-label={`Game code ${room.code.split('').join(' ')}`}>{room.code}</p>
        <p className="db-section-sub">
          {room.category.name} · {room.total} questions · {room.seconds}s each
        </p>
        <button className="db-btn-ghost lv-copy" onClick={copy}>
          <Icon name={copied ? 'check' : 'users'} size={15} /> {copied ? 'Link copied' : 'Copy invite link'}
        </button>

        {message && <p className="lv-inline-error" role="alert">{message}</p>}

        {room.isHost ? (
          <>
            <button className="db-btn-light lv-submit" onClick={start} disabled={busy}>
              <Icon name="play" size={15} /> {busy ? 'Starting…' : 'Start game'}
            </button>
            <p className="db-section-sub lv-hint">
              {others === 0 ? 'Nobody else yet. You can still start and play solo.' : `${others} ${others === 1 ? 'player' : 'players'} ready.`}
            </p>
          </>
        ) : (
          <p className="lv-waiting"><span className="lv-pulse" aria-hidden="true" /> Waiting for {room.host.name} to start…</p>
        )}
      </section>

      <section className="db-panel lv-card">
        <div className="lv-card-head">
          <h2 className="db-section-title">Players</h2>
          <span className="db-pill">{room.players.length}</span>
        </div>
        <Scoreboard players={room.players} myId={myId} mode="lobby" />
      </section>
    </div>
  );
}
