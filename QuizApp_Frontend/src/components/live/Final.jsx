import { PlayerAvatar } from '../leaderboard/PlayerAvatar';
import { Icon } from '../ui';
import Scoreboard from './Scoreboard';

// Podium order: 2nd, 1st, 3rd
const PODIUM_ORDER = [1, 0, 2];

// After the last question: podium, full ranking, and whether results were saved
export default function Final({ room, myId, onLeave, onResults }) {
  const podium = PODIUM_ORDER.map((i) => room.players[i]).filter(Boolean);
  const mine = room.players.find((p) => p.id === myId);

  return (
    <div className="lv-final">
      <section className="db-panel lv-card lv-podium-card">
        <p className="lv-eyebrow">{room.category.name} · final results</p>
        {mine && (
          <h2 className="lv-final-title">
            {mine.rank === 1 ? 'You won! 🏆' : `You finished #${mine.rank} of ${room.players.length}`}
          </h2>
        )}

        <div className="lv-podium">
          {podium.map((p) => (
            <div key={p.id} className={`lv-podium-step is-${p.rank}`}>
              <PlayerAvatar name={p.name} />
              <p className="lv-podium-name">{p.name}</p>
              <p className="lv-podium-score">{p.score.toLocaleString()}</p>
              <div className="lv-podium-block">{p.rank}</div>
            </div>
          ))}
        </div>

        <p className="db-section-sub lv-saved" role="status">
          {room.custom ? 'Games from your own quizzes are just for fun: they aren’t added to results or the leaderboard.' : (
            <>
              {room.saved === null && 'Saving results…'}
              {room.saved === true && <><Icon name="check" size={14} /> Saved to everyone&apos;s results and the leaderboard.</>}
              {room.saved === false && 'Results could not be saved this time.'}
            </>
          )}
        </p>

        <div className="lv-host-bar">
          <button className="db-btn-light" onClick={onLeave}>
            <Icon name="play" size={15} /> {room.isHost ? 'Host another game' : 'Play another game'}
          </button>
          <button className="db-btn-ghost" onClick={onResults}>My results</button>
        </div>
      </section>

      <section className="db-panel lv-card lv-side">
        <h2 className="db-section-title">Final ranking</h2>
        <Scoreboard players={room.players} myId={myId} mode="final" total={room.total} />
      </section>
    </div>
  );
}
