import { PlayerAvatar } from '../leaderboard/PlayerAvatar';

// Players in rank order. `mode`: 'lobby' (who is here), 'question' (who has answered),
// 'reveal' (points just earned) or 'final'.
export default function Scoreboard({ players, myId, mode, total, limit }) {
  const rows = limit ? players.slice(0, limit) : players;
  return (
    <ol className={`lv-board is-${mode}`}>
      {rows.map((p) => (
        <li key={p.id} className={`lv-board-row ${p.id === myId ? 'is-me' : ''} ${p.connected ? '' : 'is-away'}`}>
          {mode !== 'lobby' && <span className="lv-board-rank">{p.rank}</span>}
          <PlayerAvatar name={p.name} size="lv-avatar-sm" />
          <span className="lv-board-name">
            {p.name}
            {p.id === myId && <span className="lv-tag">You</span>}
            {p.isHost && <span className="lv-tag">Host</span>}
            {!p.connected && <span className="lv-tag is-muted">Away</span>}
          </span>
          {mode === 'question' && (
            <span className={`lv-board-status ${p.answered ? 'is-done' : ''}`}>{p.answered ? 'Answered' : 'Thinking…'}</span>
          )}
          {mode === 'reveal' && p.lastPoints > 0 && <span className="lv-board-gain">+{p.lastPoints}</span>}
          {mode === 'final' && <span className="lv-board-meta">{p.correct}/{total} correct</span>}
          {mode !== 'lobby' && <span className="lv-board-score">{p.score.toLocaleString()}</span>}
        </li>
      ))}
    </ol>
  );
}
