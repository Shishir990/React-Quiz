import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../Context/Context';
import { getLeaderboardApi } from '../api/results';
import { getCategoriesApi } from '../api/categories';
import AppShell, { Icon } from '../Components/AppShell';
import { initialsOf, formatDuration } from '../utils/format';
import '../Styles/Leaderboard.css';

const PERIODS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

// Podium order: 2nd, 1st, 3rd
const PODIUM_ORDER = [1, 0, 2];

function PlayerAvatar({ name, size = '' }) {
  return <div className={`db-avatar lb-avatar ${size}`}>{initialsOf(name)}</div>;
}

export default function Leaderboard() {
  const { user } = useQuiz();
  const navigate = useNavigate();
  const myId = user?._id || user?.id;

  const [period, setPeriod] = useState('week');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [board, setBoard] = useState(null);
  // Which period + category the board/error on screen belongs to
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState('');

  const key = `${period}|${category}`;
  const loading = loadedKey !== key;

  useEffect(() => {
    getCategoriesApi()
      .then((data) => Array.isArray(data) && setCategories(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    getLeaderboardApi({ period, category })
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data?.players)) {
          setBoard(data);
          setError('');
        } else {
          setError(data?.message || 'Could not load the leaderboard.');
        }
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoadedKey(`${period}|${category}`));
    return () => { cancelled = true; };
  }, [period, category]);

  const players = board?.players || [];
  const me = board?.me;
  const podium = PODIUM_ORDER.map((i) => players[i]).filter(Boolean);
  const q = query.trim().toLowerCase();
  const rows = players.filter((p) => p.name.toLowerCase().includes(q));
  const meInList = me && players.some((p) => p.userId === me.userId);
  const selectedCategory = categories.find((c) => c._id === category);
  const periodLabel = PERIODS.find((p) => p.value === period).label.toLowerCase();

  return (
    <AppShell title="Leaderboard">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">Leaderboard</h1>
          <p className="db-section-sub">
            {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name} · ` : ''}
            Top players {period === 'all' ? 'of all time' : periodLabel}
          </p>
        </div>
        <div className="lb-controls">
          <div className="pg-chips" role="group" aria-label="Time period">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                className={`pg-chip ${period === p.value ? 'is-active' : ''}`}
                aria-pressed={period === p.value}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <select className="pg-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="db-error-msg">{error}</div>}

      {/* Your standing */}
      {!error && board && (
        <section className={`lb-me ${me ? '' : 'is-empty'}`}>
          <PlayerAvatar name={user?.name} size="lb-avatar-lg" />
          {me ? (
            <>
              <div className="lb-me-body">
                <p className="db-eyebrow">Your rank</p>
                <p className="lb-me-rank">
                  #{me.rank} <small>of {board.totalPlayers}</small>
                </p>
              </div>
              <dl className="lb-me-stats">
                <div><dt>Points</dt><dd>{me.points.toLocaleString()}</dd></div>
                <div><dt>Quizzes</dt><dd>{me.quizzes}</dd></div>
                <div><dt>Avg. score</dt><dd>{me.avgScore}%</dd></div>
              </dl>
              {me.rank > 1 && players[me.rank - 2] && (
                <p className="lb-me-gap">
                  {players[me.rank - 2].points - me.points + 1} pts to pass {players[me.rank - 2].name.split(' ')[0]}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="lb-me-body">
                <p className="db-eyebrow">Your rank</p>
                <p className="lb-me-text">You're not on the board {period === 'all' ? 'yet' : periodLabel}. Finish a quiz to get ranked.</p>
              </div>
              <button className="db-btn-light" onClick={() => navigate('/dashboard')}>
                <Icon name="play" size={14} /> Play now
              </button>
            </>
          )}
        </section>
      )}

      {loading && !board && (
        <>
          <div className="lb-podium">
            {[0, 1, 2].map((i) => <div key={i} className="db-recent-skeleton lb-podium-skeleton" />)}
          </div>
          <div className="db-recent-list">
            {[...Array(5)].map((_, i) => <div key={i} className="db-recent-skeleton" />)}
          </div>
        </>
      )}

      {!error && board && players.length === 0 && (
        <section className="db-panel db-empty">
          <span className="db-empty-icon" aria-hidden="true">🏆</span>
          <p className="db-empty-title">No scores {period === 'all' ? 'yet' : periodLabel}</p>
          <p className="db-empty-text">Be the first on the board: finish a quiz and you'll appear here.</p>
        </section>
      )}

      {!error && board && players.length > 0 && (
        <div className={loading ? 'lb-stale' : ''}>
          {/* Podium */}
          <div className="lb-podium">
            {podium.map((p) => (
              <div key={p.userId} className={`lb-step lb-step-${p.rank} ${p.userId === myId ? 'is-me' : ''}`}>
                <span className="lb-medal" aria-hidden="true">{['🥇', '🥈', '🥉'][p.rank - 1]}</span>
                <PlayerAvatar name={p.name} size="lb-avatar-xl" />
                <p className="lb-step-name">{p.name}{p.userId === myId && <span className="lb-you">You</span>}</p>
                <p className="lb-step-pts">{p.points.toLocaleString()} <span>pts</span></p>
                <p className="lb-step-meta">{p.quizzes} {p.quizzes === 1 ? 'quiz' : 'quizzes'} · avg {p.avgScore}%</p>
                <div className="lb-step-block"><span>{p.rank}</span></div>
              </div>
            ))}
          </div>

          {/* Full table */}
          <section className="db-panel">
            <div className="db-section-header">
              <div>
                <h2 className="db-section-title">Rankings</h2>
                <p className="db-section-sub">
                  {board.totalPlayers} {board.totalPlayers === 1 ? 'player' : 'players'}
                  {board.totalPlayers > players.length && `, top ${players.length} shown`}
                </p>
              </div>
              <div className="db-search db-lb-search lb-search">
                <Icon name="search" size={15} />
                <input
                  type="text"
                  placeholder="Search players..."
                  className="db-search-input"
                  aria-label="Search players"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="lb-table-wrap">
              <table className="lb-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Player</th>
                    <th scope="col" className="lb-num">Points</th>
                    <th scope="col" className="lb-num lb-hide-sm">Quizzes</th>
                    <th scope="col" className="lb-num lb-hide-sm">Avg. score</th>
                    <th scope="col" className="lb-num lb-hide-md">{category ? 'Best time' : 'Topics'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.userId} className={`${p.userId === myId ? 'is-me' : ''} ${p.rank <= 3 ? `db-lb-${p.rank}` : ''}`}>
                      <td><span className="db-lb-rank">{p.rank}</span></td>
                      <td>
                        <div className="lb-player">
                          <PlayerAvatar name={p.name} size="db-avatar-sm" />
                          <span className="lb-player-name">{p.name}</span>
                          {p.userId === myId && <span className="lb-you">You</span>}
                        </div>
                      </td>
                      <td className="lb-num lb-pts">{p.points.toLocaleString()}</td>
                      <td className="lb-num lb-hide-sm">{p.quizzes}</td>
                      <td className="lb-num lb-hide-sm">{p.avgScore}%</td>
                      <td className="lb-num lb-hide-md">{category ? formatDuration(p.time) : p.categories}</td>
                    </tr>
                  ))}
                  {/* Keep the user's own row visible when they're outside the top list */}
                  {me && !meInList && !q && (
                    <>
                      <tr className="lb-gap" aria-hidden="true"><td colSpan={6}>⋯</td></tr>
                      <tr className="is-me">
                        <td><span className="db-lb-rank">{me.rank}</span></td>
                        <td>
                          <div className="lb-player">
                            <PlayerAvatar name={me.name} size="db-avatar-sm" />
                            <span className="lb-player-name">{me.name}</span>
                            <span className="lb-you">You</span>
                          </div>
                        </td>
                        <td className="lb-num lb-pts">{me.points.toLocaleString()}</td>
                        <td className="lb-num lb-hide-sm">{me.quizzes}</td>
                        <td className="lb-num lb-hide-sm">{me.avgScore}%</td>
                        <td className="lb-num lb-hide-md">{category ? formatDuration(me.time) : me.categories}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
              {rows.length === 0 && <p className="db-lb-empty">No players match "{query}"</p>}
            </div>
          </section>
        </div>
      )}

      <p className="lb-rules">
        <Icon name="star" size={14} />
        {category
          ? 'Points are your best score (%) in this category. Ties go to the faster attempt.'
          : 'Points are the sum of your best score (%) in each category, so trying new topics helps more than replaying one. Ties go to the faster player.'}
      </p>
    </AppShell>
  );
}
