import { useState, useEffect } from 'react';
import { useQuiz } from '../Context/Context';
import { useNavigate } from 'react-router-dom';
import { getCategoriesApi } from '../api/categories';
import '../Styles/Dashboard.css';

// Color palette to assign to categories dynamically
const COLOR_PALETTE = [
  { color: '#5DCAA5', bg: '#E1F5EE', text: '#0F6E56' },
  { color: '#378ADD', bg: '#E6F1FB', text: '#185FA5' },
  { color: '#D85A30', bg: '#FAECE7', text: '#993C1D' },
  { color: '#639922', bg: '#EAF3DE', text: '#3B6D11' },
  { color: '#7F77DD', bg: '#EEEDFE', text: '#534AB7' },
  { color: '#D4537E', bg: '#FBEAF0', text: '#993556' },
  { color: '#BA7517', bg: '#FAEEDA', text: '#854F0B' },
  { color: '#E24B4A', bg: '#FCEBEB', text: '#A32D2D' },
  { color: '#888780', bg: '#F1EFE8', text: '#5F5E5A' },
  { color: '#1D9E75', bg: '#E1F5EE', text: '#085041' },
];

const RECENT_QUIZZES = [
  { id: 1, title: 'Solar System Basics', category: 'Science', score: 85, total: 100, date: '2 days ago' },
  { id: 2, title: 'World War II', category: 'History', score: 70, total: 100, date: '4 days ago' },
  { id: 3, title: 'JavaScript Fundamentals', category: 'Technology', score: 90, total: 100, date: '1 week ago' },
];

const LEADERBOARD = [
  { rank: 1, name: 'Priya Sharma', points: 4820, avatar: 'PS' },
  { rank: 2, name: 'Arjun Mehta', points: 4310, avatar: 'AM' },
  { rank: 3, name: 'Riya Patel', points: 3990, avatar: 'RP' },
  { rank: 4, name: 'Karan Singh', points: 3750, avatar: 'KS' },
  { rank: 5, name: 'Neha Gupta', points: 3200, avatar: 'NG' },
];

const AVATAR_COLORS = [
  { bg: '#E1F5EE', color: '#0F6E56' },
  { bg: '#E6F1FB', color: '#185FA5' },
  { bg: '#EEEDFE', color: '#534AB7' },
  { bg: '#FBEAF0', color: '#993556' },
  { bg: '#FAEEDA', color: '#854F0B' },
];

export default function Dashboard() {
  const { user, logout ,totaltime,dispatch} = useQuiz();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);

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

  return (
    <div className="db-wrapper">

      {/* Sidebar */}
      <aside className="db-sidebar">
        <div className="db-logo">
          <div className="db-logo-icon">Q/</div>
          <span className="db-logo-name">QuizApp</span>
        </div>

        <nav className="db-nav">
          <a className="db-nav-item active" href="#">
            <span className="db-nav-icon">▣</span> Dashboard
          </a>
          <a className="db-nav-item" href="#">
            <span className="db-nav-icon">◈</span> My Quizzes
          </a>
          <a className="db-nav-item" href="#">
            <span className="db-nav-icon">◎</span> Results
          </a>
          <a className="db-nav-item" href="#">
            <span className="db-nav-icon">◉</span> Leaderboard
          </a>
          <a className="db-nav-item" href="#">
            <span className="db-nav-icon">◌</span> Settings
          </a>
        </nav>

        <div className="db-sidebar-user">
          <div className="db-avatar db-avatar-green">{initials}</div>
          <div className="db-sidebar-user-info">
            <p className="db-sidebar-name">{user?.name || 'User'}</p>
            <p className="db-sidebar-role">{user?.role || 'player'}</p>
          </div>
          <button className="db-logout-btn" onClick={handleLogout} title="Logout">⏻</button>
        </div>
      </aside>

      {/* Main */}
      <main className="db-main">

        {/* Header */}
        <header className="db-header">
          <div>
            <h1 className="db-welcome">Good morning, {user?.name?.split(' ')[0] || 'there'} 👋</h1>
            <p className="db-welcome-sub">Ready to test your knowledge today?</p>
          </div>
          <div className="db-header-right">
            <div className="db-search">
              <span className="db-search-icon">⌕</span>
              <input type="text" placeholder="Search quizzes..." className="db-search-input" />
            </div>
            <div className="db-avatar db-avatar-green db-avatar-lg">{initials}</div>
          </div>
        </header>

        {/* Stats */}
        <div className="db-stats">
          <div className="db-stat-card">
            <p className="db-stat-label">Quizzes taken</p>
            <p className="db-stat-value">24</p>
          </div>
          <div className="db-stat-card">
            <p className="db-stat-label">Avg. score</p>
            <p className="db-stat-value">78%</p>
          </div>
          <div className="db-stat-card">
            <p className="db-stat-label">Best streak</p>
            <p className="db-stat-value">7 days</p>
          </div>
          <div className="db-stat-card">
            <p className="db-stat-label">Total points</p>
            <p className="db-stat-value">3,420</p>
          </div>
        </div>

        {/* Categories */}
        <section className="db-section">
          <div className="db-section-header">
            <h2 className="db-section-title">Categories</h2>
            <span className="db-section-count">{categories.length} topics</span>
          </div>

          {catLoading && (
            <div className="db-cat-loading">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="db-cat-skeleton" />
              ))}
            </div>
          )}

          {catError && (
            <div className="db-error-msg">{catError}</div>
          )}

          {!catLoading && !catError && (
            <div className="db-categories">
              {categories.map((cat, i) => (
                <div
                  key={cat._id}
                  className={`db-cat-card ${activeCategory === cat._id ? 'db-cat-active' : ''}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => setActiveCategory(activeCategory === cat._id ? null : cat._id)}
                >
                  <div className="db-cat-icon-wrap" style={{ background: cat.bg }}>
                    <span className="db-cat-icon">{cat.icon}</span>
                  </div>
                  <p className="db-cat-name">{cat.name}</p>
                  <p className="db-cat-count" style={{ color: cat.color }}>
                    {cat.quizCount} {cat.quizCount === 1 ? 'quiz' : 'quizzes'}
                  </p>
                  {activeCategory === cat._id && (
                    <button
                      className="db-cat-start"
                      style={{ background: cat.color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/quiz/${cat._id}`);  // ← this is the key line
                      }}
                    >
                      Start →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bottom grid */}
        <div className="db-bottom">

          {/* Recent activity */}
          <section className="db-section db-recent">
            <div className="db-section-header">
              <h2 className="db-section-title">Recent activity</h2>
            </div>
            <div className="db-recent-list">
              {RECENT_QUIZZES.map((q) => (
                <div key={q.id} className="db-recent-item">
                  <div className="db-recent-info">
                    <p className="db-recent-title">{q.title}</p>
                    <p className="db-recent-meta">{q.category} · {q.date}</p>
                  </div>
                  <div
                    className="db-score-ring"
                    style={{
                      '--clr': q.score >= 80 ? '#1D9E75' : q.score >= 60 ? '#EF9F27' : '#E24B4A'
                    }}
                  >
                    <span className="db-score-num">{q.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Leaderboard */}
          <section className="db-section db-leaderboard">
            <div className="db-section-header">
              <h2 className="db-section-title">Top players</h2>
            </div>
            <div className="db-lb-list">
              {LEADERBOARD.map((p, i) => (
                <div key={p.rank} className={`db-lb-item ${p.rank === 1 ? 'db-lb-top' : ''}`}>
                  <span className="db-lb-rank">
                    {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : p.rank}
                  </span>
                  <div
                    className="db-avatar db-avatar-sm"
                    style={{ background: AVATAR_COLORS[i].bg, color: AVATAR_COLORS[i].color }}
                  >
                    {p.avatar}
                  </div>
                  <p className="db-lb-name">{p.name}</p>
                  <p className="db-lb-pts">{p.points.toLocaleString()} pts</p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}