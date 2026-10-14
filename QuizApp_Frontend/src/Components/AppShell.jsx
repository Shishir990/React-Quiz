import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuiz } from '../Context/Context';
import { initialsOf } from '../utils/format';
import '../Styles/Dashboard.css';

// Minimal inline icon set (stroke icons, inherit currentColor)
export const Icon = ({ name, size = 18 }) => {
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
    back: <path d="M19 12H5M11 6l-6 6 6 6" />,
    play: <path d="M7 4l13 8-13 8z" />,
    chevron: <path d="M6 9l6 6 6-6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="M18 6L6 18M6 6l12 12" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    x: <><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

export function ScoreRing({ score }) {
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

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'dashboard', to: '/dashboard' },
  { label: 'My Quizzes', icon: 'quizzes' },
  { label: 'Results', icon: 'results', to: '/results' },
  { label: 'Leaderboard', icon: 'trophy', to: '/leaderboard' },
  { label: 'Settings', icon: 'settings', separate: true },
];

function NavItem({ item }) {
  const content = <><Icon name={item.icon} size={17} />{item.label}</>;
  if (!item.to) return <a className="db-nav-item" href="#">{content}</a>;
  return (
    <NavLink to={item.to} className={({ isActive }) => `db-nav-item ${isActive ? 'active' : ''}`}>
      {content}
    </NavLink>
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

// Sidebar + top navbar shared by every signed-in page
export default function AppShell({ title, children }) {
  const { user, logout } = useQuiz();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer with Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  useEffect(() => {
    document.title = `${title} · QuizApp`;
  }, [title]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = initialsOf(user?.name);

  return (
    <div className="db-wrapper">

      {/* Backdrop behind the mobile drawer */}
      <div
        className={`db-backdrop ${drawerOpen ? 'is-open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
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
          {NAV_ITEMS.filter((item) => !item.separate).map((item) => <NavItem key={item.label} item={item} />)}
        </nav>

        <nav className="db-nav db-nav-secondary">
          {NAV_ITEMS.filter((item) => item.separate).map((item) => <NavItem key={item.label} item={item} />)}
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
            <p className="db-crumb">QuizApp / <span>{title}</span></p>
            <h2 className="db-navbar-heading">{title}</h2>
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

        <div className="db-content">{children}</div>
      </main>
    </div>
  );
}
