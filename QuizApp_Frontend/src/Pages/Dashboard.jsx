import { useState, useEffect, useRef } from 'react';
import { useQuiz } from '../Context/Context';
import { useNavigate } from 'react-router-dom';
import { getCategoriesApi } from '../api/categories';
import { getMyResultsApi } from '../api/results';
import '../Styles/Dashboard.css';

// Color palette to assign to categories dynamically
const COLOR_PALETTE = [
  { color: '#10B981', bg: '#D1FAE5', text: '#047857' },
  { color: '#3B82F6', bg: '#DBEAFE', text: '#1D4ED8' },
  { color: '#F97316', bg: '#FFEDD5', text: '#C2410C' },
  { color: '#84CC16', bg: '#ECFCCB', text: '#4D7C0F' },
  { color: '#8B5CF6', bg: '#EDE9FE', text: '#6D28D9' },
  { color: '#EC4899', bg: '#FCE7F3', text: '#BE185D' },
  { color: '#F59E0B', bg: '#FEF3C7', text: '#B45309' },
  { color: '#EF4444', bg: '#FEE2E2', text: '#B91C1C' },
  { color: '#06B6D4', bg: '#CFFAFE', text: '#0E7490' },
  { color: '#14B8A6', bg: '#CCFBF1', text: '#0F766E' },
];

const LEADERBOARD = [
  { rank: 1, name: 'Priya Sharma', points: 4820, avatar: 'PS' },
  { rank: 2, name: 'Arjun Mehta', points: 4310, avatar: 'AM' },
  { rank: 3, name: 'Riya Patel', points: 3990, avatar: 'RP' },
  { rank: 4, name: 'Karan Singh', points: 3750, avatar: 'KS' },
  { rank: 5, name: 'Neha Gupta', points: 3200, avatar: 'NG' },
];

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #F59E0B, #F97316)',
  'linear-gradient(135deg, #94A3B8, #64748B)',
  'linear-gradient(135deg, #D97706, #92400E)',
  'linear-gradient(135deg, #8B5CF6, #6366F1)',
  'linear-gradient(135deg, #EC4899, #F43F5E)',
];

// Minimal inline icon set (stroke icons, inherit currentColor)
const Icon = ({ name, size = 18 }) => {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></>,
    quizzes: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
    results: <><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></>,
    trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    flame: <path d="M12 2c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 1-3s-3 1-3 5a6 6 0 0 0 12 0c0-6-6-8-6-11z" />,
    star: <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    play: <path d="M7 4l13 8-13 8z" />,
    chevron: <path d="M6 9l6 6 6-6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="M18 6L6 18M6 6l12 12" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'dashboard', active: true },
  { label: 'My Quizzes', icon: 'quizzes' },
  { label: 'Results', icon: 'results' },
  { label: 'Leaderboard', icon: 'trophy' },
  { label: 'Settings', icon: 'settings', separate: true },
];

function ScoreRing({ score }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const clr = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';
  return (
    <div className="db-ring">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} className="db-ring-track" />
        <circle
          cx="26" cy="26" r={r}
          className="db-ring-bar"
          style={{ stroke: clr, strokeDasharray: c, strokeDashoffset: c * (1 - score / 100) }}
        />
      </svg>
      <span className="db-ring-num">{score}%</span>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="db-clock">
      <Icon name="clock" size={16} />
      <div>
        <p className="db-clock-time">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <p className="db-clock-date">
          {now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}

function UserMenu({ user, initials, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="db-user-menu" ref={ref}>
      <button
        className={`db-navbar-user ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="db-avatar db-avatar-brand">{initials}</div>
        <div className="db-navbar-user-info">
          <p className="db-navbar-name">{user?.name || 'User'}</p>
          <p className="db-navbar-role">{user?.role || 'player'}</p>
        </div>
        <Icon name="chevron" size={14} />
      </button>

      {open && (
        <div className="db-dropdown" role="menu">
          <div className="db-dropdown-head">
            <p className="db-dropdown-name">{user?.name || 'User'}</p>
            {user?.email && <p className="db-dropdown-email">{user.email}</p>}
          </div>
          <button className="db-dropdown-item db-dropdown-danger" role="menuitem" onClick={onLogout}>
            <Icon name="logout" size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const DAILY_GOAL = 3;

// Local-date key, e.g. "2026-10-11"
function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function timeAgo(date) {
  const mins = Math.round((Date.now() - new Date(date)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(date).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

// Streaks are counted in consecutive calendar days with at least one quiz
function computeStreaks(results) {
  const days = new Set(results.map((r) => dayKey(r.createdAt)));
  let current = 0;
  // A streak is still alive if today has no quiz yet but yesterday did
  let cursor = days.has(dayKey(new Date())) ? new Date() : addDays(new Date(), -1);
  while (days.has(dayKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let prev = null;
  [...days].sort().forEach((k) => {
    run = prev && dayKey(addDays(new Date(`${prev}T00:00`), 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  });
  return { current, best };
}

// The same category for everyone on a given day, rotating daily
function pickDailyChallenge(categories) {
  const playable = categories.filter((c) => c.questionCount > 0).sort((a, b) => a._id.localeCompare(b._id));
  if (!playable.length) return null;
  const key = dayKey(new Date());
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return playable[hash % playable.length];
}

// "Easy" / "Medium" / "Hard" when one level clearly dominates, else "Mixed"
function difficultyLabel(difficulty) {
  if (!difficulty) return null;
  const entries = Object.entries(difficulty).filter(([, n]) => n > 0);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (!total) return null;
  const [level, count] = entries.sort((a, b) => b[1] - a[1])[0];
  if (count / total < 0.6) return 'mixed';
  return level;
}

const DIFFICULTY_TEXT = { easy: 'Easy', medium: 'Medium', hard: 'Hard', mixed: 'Mixed' };

function ActivityChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const peak = days.reduce((best, d) => (d.count > best.count ? d : best), days[0]);

  return (
    <div className="db-chart">
      <div className="db-chart-plot" role="img" aria-label={`Quizzes completed over the last 7 days: ${total} in total`}>
        {days.map((d) => {
          const showLabel = d.count > 0 && (d.isToday || d === peak);
          return (
            <div key={d.key} className={`db-chart-col ${d.isToday ? 'is-today' : ''}`} tabIndex={0}>
              <div className="db-chart-track">
                {showLabel && (
                  <span className="db-chart-value" style={{ bottom: `calc(${(d.count / max) * 100}% + 6px)` }}>
                    {d.count}
                  </span>
                )}
                <div
                  className={`db-chart-bar ${d.count === 0 ? 'is-empty' : ''}`}
                  style={{ height: d.count ? `${(d.count / max) * 100}%` : undefined }}
                />
              </div>
              <span className="db-chart-label">{d.label}</span>
              <div className="db-chart-tip" role="tooltip">
                <strong>{d.fullLabel}</strong>
                <span>{d.count} {d.count === 1 ? 'quiz' : 'quizzes'}</span>
                {d.count > 0 && <span>Avg. score {d.avg}%</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Same data for screen readers */}
      <table className="db-sr-only">
        <caption>Quizzes completed per day</caption>
        <thead><tr><th>Day</th><th>Quizzes</th><th>Average score</th></tr></thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.key}><td>{d.fullLabel}</td><td>{d.count}</td><td>{d.count ? `${d.avg}%` : '—'}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GoalRing({ done, goal }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.min(done / goal, 1);
  return (
    <div className="db-goal-ring">
      <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
        <circle cx="42" cy="42" r={r} className="db-goal-track" />
        <circle
          cx="42" cy="42" r={r}
          className="db-goal-bar"
          style={{ strokeDasharray: c, strokeDashoffset: c * (1 - pct) }}
        />
      </svg>
      <span className="db-goal-num">{Math.min(done, goal)}<small>/{goal}</small></span>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout, highestScore } = useQuiz();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [playerQuery, setPlayerQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(true);

  useEffect(() => {
    getMyResultsApi()
      .then((data) => setResults(Array.isArray(data) ? data : []))
      .catch(() => setResults([]))
      .finally(() => setResultsLoading(false));
  }, []);

  // Close the mobile drawer with Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const filteredPlayers = LEADERBOARD.filter((p) =>
    p.name.toLowerCase().includes(playerQuery.trim().toLowerCase())
  );

  useEffect(() => {
    const fetchCategories = async () => {
      setCatLoading(true);
      setCatError('');
      try {
        const data = await getCategoriesApi();
        if (Array.isArray(data)) {
          // Attach a color from the palette by index
          const colored = data.map((cat, i) => ({
            ...cat,
            ...COLOR_PALETTE[i % COLOR_PALETTE.length],
          }));
          setCategories(colored);
        } else {
          setCatError('Failed to load categories.');
        }
      } catch (err) {
        setCatError(err.message || 'Something went wrong.');
      } finally {
        setCatLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

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

  const startQuiz = (id) => navigate(`/quiz/${id}`);
  const randomCategory = () => {
    if (!categories.length) return;
    startQuiz(categories[Math.floor(Math.random() * categories.length)]._id);
  };

  return (
    <div className="db-wrapper">

      {/* Sidebar */}
      {/* Backdrop behind the mobile drawer */}
      <div
        className={`db-backdrop ${drawerOpen ? 'is-open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="db-sidebar"
        className={`db-sidebar ${drawerOpen ? 'is-open' : ''}`}
        onClick={(e) => e.target.closest('.db-nav-item') && setDrawerOpen(false)}
      >
        <div className="db-logo">
          <div className="db-logo-icon">Q/</div>
          <span className="db-logo-name">QuizApp</span>
          <button
            className="db-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <nav className="db-nav">
          {NAV_ITEMS.filter((item) => !item.separate).map((item) => (
            <a key={item.label} className={`db-nav-item ${item.active ? 'active' : ''}`} href="#">
              <Icon name={item.icon} size={17} />
              {item.label}
            </a>
          ))}
        </nav>

        <nav className="db-nav db-nav-secondary">
          {NAV_ITEMS.filter((item) => item.separate).map((item) => (
            <a key={item.label} className="db-nav-item" href="#">
              <Icon name={item.icon} size={17} />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="db-sidebar-user">
          <div className="db-avatar db-avatar-brand">{initials}</div>
          <div className="db-sidebar-user-info">
            <p className="db-sidebar-name">{user?.name || 'User'}</p>
            <p className="db-sidebar-role">{user?.role || 'player'}</p>
          </div>
          <button className="db-logout-btn" onClick={handleLogout} title="Logout" aria-label="Logout">
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="db-main">

        {/* Navbar */}
        <header className="db-navbar">
          <button
            className="db-icon-btn db-menu-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-controls="db-sidebar"
            aria-expanded={drawerOpen}
          >
            <Icon name="menu" size={18} />
          </button>
          <div className="db-navbar-title">
            <p className="db-crumb">QuizApp / <span>Dashboard</span></p>
            <h2 className="db-navbar-heading">Dashboard</h2>
          </div>

          <div className="db-search">
            <Icon name="search" size={16} />
            <input type="text" placeholder="Search quizzes, topics..." className="db-search-input" />
          </div>

          <div className="db-navbar-right">
            <LiveClock />
            <button className="db-icon-btn" title="Notifications">
              <Icon name="bell" size={18} />
              <span className="db-dot" />
            </button>
            <UserMenu user={user} initials={initials} onLogout={handleLogout} />
          </div>
        </header>

        <div className="db-content">

        {/* Hero */}
        <section className="db-hero">
          <div className="db-hero-content">
            <span className="db-hero-badge">✨ Level up today</span>
            <h1 className="db-hero-title">{greeting()}, {firstName}!</h1>
            <p className="db-hero-sub">
              Pick a category below or jump into a random quiz to sharpen your mind.
            </p>
            <div className="db-hero-actions">
              <button className="db-btn-light" onClick={randomCategory} disabled={!categories.length}>
                <Icon name="play" size={14} /> Quick play
              </button>
              <a className="db-btn-ghost" href="#categories">Browse categories</a>
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

        {/* Categories */}
        <section className="db-section" id="categories">
          <div className="db-section-header">
            <div>
              <h2 className="db-section-title">Explore categories</h2>
              <p className="db-section-sub">Hover a card and press Start, or tap to select</p>
            </div>
            <span className="db-pill">{categories.length} {categories.length === 1 ? 'category' : 'categories'}</span>
          </div>

          {catLoading && (
            <div className="db-categories">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="db-cat-skeleton" />
              ))}
            </div>
          )}

          {catError && (
            <div className="db-error-msg">{catError}</div>
          )}

          {!catLoading && !catError && categories.length === 0 && (
            <div className="db-panel db-empty">
              <span className="db-empty-icon" aria-hidden="true">📚</span>
              <p className="db-empty-title">No categories yet</p>
              <p className="db-empty-text">Once an admin adds categories and questions, they'll appear here.</p>
            </div>
          )}

          {!catLoading && !catError && categories.length > 0 && (
            <div className="db-categories">
              {categories.map((cat, i) => {
                const isActive = activeCategory === cat._id;
                const playable = cat.questionCount > 0;
                const level = difficultyLabel(cat.difficulty);
                return (
                  <div
                    key={cat._id}
                    className={`db-cat-card ${isActive ? 'db-cat-active' : ''} ${playable ? '' : 'is-empty'}`}
                    style={{ animationDelay: `${i * 40}ms`, '--cat': cat.color, '--cat-bg': cat.bg }}
                    onClick={() => playable && setActiveCategory(isActive ? null : cat._id)}
                  >
                    {challenge?._id === cat._id && <span className="db-cat-flag">Today</span>}
                    <span className="db-cat-blob" aria-hidden="true" />
                    <span className="db-cat-bar" aria-hidden="true" />

                    <div className="db-cat-icon-wrap">
                      <span className="db-cat-icon">{cat.icon}</span>
                    </div>
                    <p className="db-cat-name">{cat.name}</p>
                    <div className="db-cat-meta">
                      {playable ? (
                        <>
                          <span className="db-cat-count" style={{ color: cat.text }}>
                            {cat.questionCount} {cat.questionCount === 1 ? 'question' : 'questions'}
                          </span>
                          {level && <span className={`db-diff db-diff-${level}`}>{DIFFICULTY_TEXT[level]}</span>}
                        </>
                      ) : (
                        <span className="db-cat-count db-cat-soon">Coming soon</span>
                      )}
                    </div>
                    <button
                      className="db-cat-start"
                      disabled={!playable}
                      onClick={(e) => {
                        e.stopPropagation();
                        startQuiz(cat._id);
                      }}
                    >
                      {playable ? <>Start quiz <Icon name="arrow" size={15} /></> : 'No questions yet'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

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
              {hasHistory && <span className="db-pill">{results.length} total</span>}
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
              {filteredPlayers.length === 0 && (
                <p className="db-lb-empty">No players match "{playerQuery}"</p>
              )}
              {filteredPlayers.map((p) => (
                <div key={p.rank} className={`db-lb-item ${p.rank <= 3 ? `db-lb-top db-lb-${p.rank}` : ''}`}>
                  <span className="db-lb-rank">{p.rank}</span>
                  <div className="db-avatar db-avatar-sm" style={{ background: AVATAR_GRADIENTS[(p.rank - 1) % AVATAR_GRADIENTS.length] }}>
                    {p.avatar}
                  </div>
                  <p className="db-lb-name">{p.name}</p>
                  <p className="db-lb-pts">{p.points.toLocaleString()} <span>pts</span></p>
                </div>
              ))}
            </div>
          </section>

        </div>
        </div>
      </main>
    </div>
  );
}
