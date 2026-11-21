import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { Icon } from '../components/ui';
import { usePastGames } from '../api/queries';
import '../styles/Dashboard.css';
import '../styles/Leaderboard.css';
import '../styles/Live.css';

const MODE_LABEL = { sync: 'One at a time', exam: 'All at once' };
const when = (d) => new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

// Every live game this player took part in, newest first
export default function LiveHistory() {
  const navigate = useNavigate();
  const { data: games = [], isPending, error } = usePastGames();

  return (
    <AppShell title="Past games">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">Past games</h1>
          <p className="db-section-sub">Live games you hosted or played. Open one to see the ranking and review your answers.</p>
        </div>
        <button className="db-btn-ghost" onClick={() => navigate('/live')}>
          <Icon name="back" size={15} /> Live game
        </button>
      </div>

      {error && <div className="db-error-msg" role="alert">{error.message}</div>}

      {isPending ? (
        <div className="lv-history" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="db-panel lv-history-row lv-history-skeleton" />)}
        </div>
      ) : !error && games.length === 0 ? (
        <section className="db-panel lv-card lv-history-empty">
          <p className="db-empty-title">No live games yet</p>
          <p className="db-empty-text">Host or join a game and it shows up here once it finishes.</p>
          <button className="db-btn-light" onClick={() => navigate('/live')}>
            <Icon name="play" size={15} /> Start a live game
          </button>
        </section>
      ) : (
        <ul className="lv-history">
          {games.map((g) => (
            <li key={g._id}>
              <button className="db-panel lv-history-row" onClick={() => navigate(`/live/history/game?id=${g._id}`)}>
                <span className={`lv-history-rank ${g.me?.rank === 1 ? 'is-first' : ''}`} aria-label={g.me ? `You finished ${ordinal(g.me.rank)}` : undefined}>
                  {g.me ? ordinal(g.me.rank) : '—'}
                </span>
                <span className="lv-history-main">
                  <span className="lv-history-title">
                    {g.source.name}
                    {g.source.kind === 'custom' && <span className="lv-tag">Custom quiz</span>}
                    {g.isHost && <span className="lv-tag">You hosted</span>}
                  </span>
                  <span className="lv-history-meta">
                    {when(g.endedAt)} · {MODE_LABEL[g.mode] || 'Live'} · {g.total} questions · {g.players} {g.players === 1 ? 'player' : 'players'}
                    {!g.isHost && ` · hosted by ${g.hostName}`}
                  </span>
                </span>
                <span className="lv-history-score">
                  {g.me && <><strong>{g.me.score.toLocaleString()}</strong><span>{g.me.correct}/{g.total} correct</span></>}
                  {g.winner && g.me?.rank !== 1 && <span className="lv-history-winner">Winner: {g.winner.name}</span>}
                </span>
                <span className="lv-history-go" aria-hidden="true"><Icon name="arrow" size={15} /></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
