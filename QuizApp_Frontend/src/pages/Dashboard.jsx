import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import { useCategories, useMyResults, useLeaderboard } from '../api/queries';
import AppShell from '../components/layout/AppShell';
import { greeting, initialsOf, timeAgo } from '../utils/format';
import { addDays, dayKey } from '../utils/date';
import { pickDailyChallenge } from '../utils/daily';
import { computeStreaks } from '../utils/results';
import { ActivityChart } from '../components/dashboard/ActivityChart';
import { GoalRing } from '../components/dashboard/GoalRing';
import { Icon, ScoreRing } from '../components/ui';
import '../styles/Dashboard.css';

const DAILY_GOAL = 3;

export default function Dashboard() {
  const { user, highestScore } = useQuiz();
  const navigate = useNavigate();

  const [playerQuery, setPlayerQuery] = useState('');

  const resultsQuery = useMyResults();
  const results = resultsQuery.data ?? [];
  const resultsLoading = resultsQuery.isPending;

  const leadersQuery = useLeaderboard({ period: 'week' });
  const leaders = leadersQuery.data?.players ?? [];
  const leadersLoading = leadersQuery.isPending;

  const filteredPlayers = leaders
    .slice(0, 5)
    .filter((p) => p.name.toLowerCase().includes(playerQuery.trim().toLowerCase()));

  // The full category grid lives on My Quizzes; here they only feed Quick play and the daily challenge
  const categories = useCategories().data ?? [];

  const firstName = user?.name?.split(' ')[0] || 'there';

  // ── Derived from the user's real quiz history ──
  const todayKey = dayKey(new Date());
  const todaysResults = results.filter((r) => dayKey(r.createdAt) === todayKey);
  const streaks = computeStreaks(results);
  const avgScore = results.length
    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
    : 0;
  const bestScore = Math.max(Number(highestScore) || 0, ...results.map((r) => r.percentage));
  const weekAgo = addDays(new Date(), -7);
  const thisWeek = results.filter((r) => new Date(r.createdAt) >= weekAgo).length;

  const activity = [...Array(7)].map((_, i) => {
    const date = addDays(new Date(), i - 6);
    const key = dayKey(date);
    const dayResults = results.filter((r) => dayKey(r.createdAt) === key);
    return {
      key,
      isToday: key === todayKey,
      label: i === 6 ? 'Today' : date.toLocaleDateString([], { weekday: 'short' }),
      fullLabel: date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' }),
      count: dayResults.length,
      avg: dayResults.length
        ? Math.round(dayResults.reduce((sum, r) => sum + r.percentage, 0) / dayResults.length)
        : 0,
    };
  });

  const challenge = pickDailyChallenge(categories);
  const challengeDone = !!challenge && todaysResults.some((r) => r.category?._id === challenge._id);
  const goalDone = todaysResults.length >= DAILY_GOAL;

  const hasHistory = results.length > 0;
  const stats = [
    {
      label: 'Quizzes taken', value: results.length, icon: 'check', tone: 'emerald',
      trend: hasHistory ? `${thisWeek} this week` : 'Take your first quiz',
    },
    {
      label: 'Average score', value: hasHistory ? `${avgScore}%` : '—', icon: 'target', tone: 'blue',
      trend: hasHistory ? 'Across all quizzes' : 'Appears after a quiz',
    },
    {
      label: 'Current streak', value: `${streaks.current} ${streaks.current === 1 ? 'day' : 'days'}`, icon: 'flame', tone: 'orange',
      trend: streaks.best ? `Best: ${streaks.best} ${streaks.best === 1 ? 'day' : 'days'}` : 'Play daily to build one',
    },
    {
      label: 'Highest score', value: bestScore ? `${bestScore}%` : '—', icon: 'star', tone: 'violet',
      trend: bestScore ? 'Personal best' : 'Set your first record',
    },
  ];

  const startQuiz = (id) => navigate(`/quiz?category=${id}`);
  const randomCategory = () => {
    if (!categories.length) return;
    startQuiz(categories[Math.floor(Math.random() * categories.length)]._id);
  };

  return (
    <AppShell title="Dashboard">

        {/* Hero */}
        <section className="db-hero">
          <div className="db-hero-content">
            <span className="db-hero-badge">✨ Level up today</span>
            <h1 className="db-hero-title">{greeting()}, {firstName}!</h1>
            <p className="db-hero-sub">
              Jump into a random quiz, or browse every category in My Quizzes.
            </p>
            <div className="db-hero-actions">
              <button className="db-btn-light" onClick={randomCategory} disabled={!categories.length}>
                <Icon name="play" size={14} /> Quick play
              </button>
              <Link className="db-btn-ghost" to="/quizzes">Browse all quizzes</Link>
            </div>
          </div>
        </section>

        {/* Today: daily challenge + daily goal */}
        <div className="db-today">
          <section className="db-challenge">
            <div className="db-challenge-icon" aria-hidden="true">{challenge?.icon || '🎯'}</div>
            <div className="db-challenge-body">
              <p className="db-eyebrow">Daily challenge · {new Date().toLocaleDateString([], { day: 'numeric', month: 'short' })}</p>
              {challenge ? (
                <>
                  <h2 className="db-challenge-title">{challenge.name}</h2>
                  <p className="db-challenge-text">
                    {challengeDone
                      ? 'Challenge complete! Come back tomorrow for a new topic.'
                      : `Today's featured topic. ${challenge.questionCount} questions are waiting for you.`}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="db-challenge-title">No challenge yet</h2>
                  <p className="db-challenge-text">A daily topic appears here once categories have questions.</p>
                </>
              )}
            </div>
            {challenge && (
              challengeDone ? (
                <span className="db-done-badge"><Icon name="check" size={16} /> Completed</span>
              ) : (
                <button className="db-btn-light db-challenge-btn" onClick={() => startQuiz(challenge._id)}>
                  Start challenge <Icon name="arrow" size={15} />
                </button>
              )
            )}
          </section>

          <section className="db-goal">
            <GoalRing done={todaysResults.length} goal={DAILY_GOAL} />
            <div>
              <p className="db-eyebrow">Daily goal</p>
              <h2 className="db-goal-title">
                {goalDone ? 'Goal reached! 🎉' : `${DAILY_GOAL - todaysResults.length} more ${DAILY_GOAL - todaysResults.length === 1 ? 'quiz' : 'quizzes'} to go`}
              </h2>
              <p className="db-goal-text">
                {streaks.current > 0
                  ? `🔥 ${streaks.current}-day streak. Keep it alive!`
                  : `Complete ${DAILY_GOAL} quizzes a day to build a streak.`}
              </p>
            </div>
          </section>
        </div>

        {/* Stats */}
        <div className="db-stats">
          {stats.map((s, i) => (
            <div key={s.label} className={`db-stat-card tone-${s.tone}`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="db-stat-icon"><Icon name={s.icon} size={20} /></div>
              <div>
                <p className="db-stat-label">{s.label}</p>
                <p className="db-stat-value">{s.value}</p>
                <p className="db-stat-trend">{s.trend}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom grid */}
        <div className="db-bottom">

          {/* Learning activity chart */}
          <section className="db-panel">
            <div className="db-section-header">
              <div>
                <h2 className="db-section-title">Learning activity</h2>
                <p className="db-section-sub">Quizzes completed, last 7 days</p>
              </div>
              <span className="db-pill">{activity.reduce((s, d) => s + d.count, 0)} this week</span>
            </div>
            {resultsLoading ? (
              <div className="db-chart-skeleton" />
            ) : hasHistory ? (
              <ActivityChart days={activity} />
            ) : (
              <div className="db-empty">
                <span className="db-empty-icon" aria-hidden="true">📈</span>
                <p className="db-empty-title">Your progress will show up here</p>
                <p className="db-empty-text">Finish a quiz and we'll chart your daily activity.</p>
              </div>
            )}
          </section>

          {/* Recent quizzes */}
          <section className="db-panel">
            <div className="db-section-header">
              <h2 className="db-section-title">Recent quizzes</h2>
              {hasHistory && <Link className="db-link" to="/results">View all {results.length}</Link>}
            </div>
            {resultsLoading ? (
              <div className="db-recent-list">
                {[0, 1, 2].map((i) => <div key={i} className="db-recent-skeleton" />)}
              </div>
            ) : hasHistory ? (
              <div className="db-recent-list">
                {results.slice(0, 5).map((r) => (
                  <div key={r._id} className="db-recent-item">
                    <span className="db-recent-icon" aria-hidden="true">{r.category?.icon || '📝'}</span>
                    <div className="db-recent-info">
                      <p className="db-recent-title">{r.category?.name || 'Quiz'}</p>
                      <p className="db-recent-meta">
                        <span className={`db-tag ${r.passed ? 'db-tag-pass' : 'db-tag-fail'}`}>
                          {r.passed ? 'Passed' : 'Not passed'}
                        </span>
                        {timeAgo(r.createdAt)}
                      </p>
                    </div>
                    <ScoreRing score={r.percentage} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="db-empty">
                <span className="db-empty-icon" aria-hidden="true">🚀</span>
                <p className="db-empty-title">No quizzes yet</p>
                <p className="db-empty-text">Your results and scores will appear here after your first quiz.</p>
                {challenge && (
                  <button className="db-btn-light" onClick={() => startQuiz(challenge._id)}>
                    Try today's challenge <Icon name="arrow" size={15} />
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Leaderboard */}
          <section className="db-panel">
            <div className="db-section-header">
              <h2 className="db-section-title">Top players</h2>
              <span className="db-pill">This week</span>
            </div>
            <div className="db-search db-lb-search">
              <Icon name="search" size={15} />
              <input
                type="text"
                placeholder="Search players..."
                className="db-search-input"
                aria-label="Search players"
                value={playerQuery}
                onChange={(e) => setPlayerQuery(e.target.value)}
              />
            </div>
            <div className="db-lb-list">
              {leadersLoading && [0, 1, 2].map((i) => <div key={i} className="db-recent-skeleton" />)}
              {!leadersLoading && leaders.length === 0 && (
                <p className="db-lb-empty">No scores this week yet. Finish a quiz to claim the top spot!</p>
              )}
              {!leadersLoading && leaders.length > 0 && filteredPlayers.length === 0 && (
                <p className="db-lb-empty">No players match "{playerQuery}"</p>
              )}
              {filteredPlayers.map((p) => (
                <div key={p.userId} className={`db-lb-item ${p.rank <= 3 ? `db-lb-top db-lb-${p.rank}` : ''}`}>
                  <span className="db-lb-rank">{p.rank}</span>
                  <div className="db-avatar db-avatar-sm">
                    {initialsOf(p.name)}
                  </div>
                  <p className="db-lb-name">{p.name}{p.userId === (user?._id || user?.id) && <span className="lb-you">You</span>}</p>
                  <p className="db-lb-pts">{p.points.toLocaleString()} <span>pts</span></p>
                </div>
              ))}
            </div>
            <Link className="db-link db-panel-link" to="/leaderboard">
              View full leaderboard <Icon name="arrow" size={14} />
            </Link>
          </section>

        </div>
    </AppShell>
  );
}
