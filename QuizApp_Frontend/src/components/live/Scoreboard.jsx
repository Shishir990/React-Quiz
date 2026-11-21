import { PlayerAvatar } from '../leaderboard/PlayerAvatar';
import { formatDuration } from '../../utils/format';

// Players in rank order. `mode`: 'lobby' (who is here), 'question' (who has answered),
// 'reveal' (points just earned), 'exam' (progress, scores hidden) or 'final'.
export default function Scoreboard({ players, myId, mode, total, limit }) {
  const rows = limit ? players.slice(0, limit) : players;
  const showScore = mode !== 'lobby' && mode !== 'exam';
  return (
    <ol className={`lv-board is-${mode}`}>
      {rows.map((p) => (
        <li key={p.id} className={`lv-board-row ${p.id === myId ? 'is-me' : ''} ${p.connected === false ? 'is-away' : ''}`}>
          {showScore && <span className="lv-board-rank">{p.rank}</span>}
          <PlayerAvatar name={p.name} size="lv-avatar-sm" />
          <span className="lv-board-name">
            {p.name}
            {p.id === myId && <span className="lv-tag">You</span>}
            {p.isHost && <span className="lv-tag">Host</span>}
            {p.connected === false && <span className="lv-tag is-muted">Away</span>}
          </span>
          {mode === 'question' && (
            <span className={`lv-board-status ${p.answered ? 'is-done' : ''}`}>{p.answered ? 'Answered' : 'Thinking…'}</span>
          )}
          {mode === 'exam' && (
            <span className={`lv-board-status ${p.submitted ? 'is-done' : ''}`}>
              {p.submitted ? 'Submitted' : `${p.answeredCount ?? 0}/${total}`}
            </span>
          )}
          {mode === 'reveal' && p.lastPoints > 0 && <span className="lv-board-gain">+{p.lastPoints}</span>}
          {mode === 'final' && (
            <span className="lv-board-meta">
              {p.correct}/{total} correct{p.timeMs != null ? ` · ${formatDuration(p.timeMs / 1000)}` : ''}
            </span>
          )}
          {showScore && <span className="lv-board-score">{p.score.toLocaleString()}</span>}
        </li>
      ))}
    </ol>
  );
}
