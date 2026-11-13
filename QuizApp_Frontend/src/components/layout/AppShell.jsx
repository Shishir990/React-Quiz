import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuiz } from '../../context/QuizContext';
import { initialsOf } from '../../utils/format';
import { Icon } from '../ui';
import '../../styles/Dashboard.css';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'dashboard', to: '/dashboard' },
  { label: 'My Quizzes', icon: 'quizzes', to: '/quizzes' },
  { label: 'Results', icon: 'results', to: '/results' },
  { label: 'Analytics', icon: 'pie', to: '/analytics' },
  { label: 'Leaderboard', icon: 'trophy', to: '/leaderboard' },
  { label: 'Admin console', icon: 'shield', to: '/admin', separate: true, adminOnly: true },
  { label: 'Settings', icon: 'settings', to: '/settings', separate: true },
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
  const { user, logout, isAdmin } = useQuiz();
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
          {NAV_ITEMS.filter((item) => item.separate && (!item.adminOnly || isAdmin)).map((item) => <NavItem key={item.label} item={item} />)}
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
