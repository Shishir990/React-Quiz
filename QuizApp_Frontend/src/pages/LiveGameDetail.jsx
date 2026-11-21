import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { Icon } from '../components/ui';
import { usePastGame } from '../api/queries';
import Scoreboard from '../components/live/Scoreboard';
import ReviewList from '../components/live/ReviewList';
import { formatDuration } from '../utils/format';
import '../styles/Dashboard.css';
import '../styles/Leaderboard.css';
import '../styles/Live.css';

const when = (d) => new Date(d).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// One past live game (?id=): everyone's ranking and a review of this player's answers
export default function LiveGameDetail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id');
  const { data: game, isPending, error } = usePastGame(id);

  const back = (
    <button className="db-btn-ghost" onClick={() => navigate('/live/history')}>
      <Icon name="back" size={15} /> Past games
    </button>
  );

  if (!id || error) {
    return (
      <AppShell title="Past games">
        <div className="pg-head"><h1 className="pg-title">Game not found</h1>{back}</div>
        <div className="db-error-msg" role="alert">{error?.message || 'No game was chosen.'}</div>
      </AppShell>
    );
  }
  if (isPending) {
    return (
      <AppShell title="Past games">
        <div className="pg-head"><h1 className="pg-title">Loading…</h1>{back}</div>
        <div className="db-panel lv-card lv-history-skeleton lv-history-skeleton-tall" aria-busy="true" />
      </AppShell>
    );
  }

  const me = game.ranking.find((p) => p.isMe);
  // Scoreboard's shape (rank order is already final)
  const players = game.ranking.map((p) => ({ ...p, id: p.isMe ? 'me' : `p${p.rank}` }));
  const timing = game.mode === 'exam'
    ? `all at once, ${formatDuration(game.totalSeconds)} total`
    : `one at a time, ${formatDuration(game.seconds)} per question`;

  return (
    <AppShell title="Past games">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">{game.source.name}</h1>
          <p className="db-section-sub">
            {when(game.endedAt)} · {game.total} questions, {timing} · {game.isHost ? 'you hosted' : `hosted by ${game.hostName}`}
            {game.source.kind === 'custom' && ' · custom quiz'}
          </p>
        </div>
        {back}
      </div>

      <div className="lv-final">
        <section className="db-panel lv-card lv-podium-card">
          <p className="lv-eyebrow">Your result</p>
          <h2 className="lv-final-title">
            {me.rank === 1 ? 'You won! 🏆' : `You finished #${me.rank} of ${game.ranking.length}`}
          </h2>
          <p className="lv-detail-score">{me.score.toLocaleString()} <span>points</span></p>
          <p className="db-section-sub">
            {me.correct} of {game.total} correct{me.timeMs != null ? ` · ${formatDuration(me.timeMs / 1000)}` : ''}
          </p>
        </section>

        <section className="db-panel lv-card lv-side">
          <h2 className="db-section-title">Final ranking</h2>
          <Scoreboard players={players} myId="me" mode="final" total={game.total} />
        </section>
      </div>

      <section className="db-panel lv-card lv-review-card">
        <h2 className="db-section-title">Review answers</h2>
        <ReviewList review={game.review} />
      </section>
    </AppShell>
  );
}
