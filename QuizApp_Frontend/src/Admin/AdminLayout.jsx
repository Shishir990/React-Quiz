import { useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuiz } from '../Context/Context';
import { Icon } from '../Components/AppShell';
import { initialsOf } from '../utils/format';
import { Toasts } from './ui';
import '../Styles/Admin.css';

const NAV = [
  { to: '/admin', label: 'Overview', icon: 'dashboard', end: true },
  { to: '/admin/questions', label: 'Questions', icon: 'quizzes' },
  { to: '/admin/categories', label: 'Categories', icon: 'folder' },
  { to: '/admin/users', label: 'Users', icon: 'users' },
];

function UserMenu({ user, onLogout }) {
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
    <div className="ad-user-menu" ref={ref}>
      <button
        className={`ad-user-btn ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="ad-avatar is-admin">{initialsOf(user?.name)}</span>
        <span className="ad-user-btn-name">{user?.name}</span>
        <Icon name="chevron" size={14} />
      </button>

      {open && (
        <div className="ad-dropdown" role="menu">
          <div className="ad-dropdown-head">
            <p className="ad-dropdown-name">{user?.name}</p>
            {user?.email && <p className="ad-muted ad-dropdown-email">{user.email}</p>}
          </div>
          <Link to="/dashboard" className="ad-dropdown-item" role="menuitem">
            <Icon name="back" size={15} /> Back to player app
          </Link>
          <button className="ad-dropdown-item is-danger" role="menuitem" onClick={onLogout}>
            <Icon name="logout" size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useQuiz();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const current = [...NAV].reverse().find((n) => pathname.startsWith(n.to)) || NAV[0];

  useEffect(() => {
    document.title = `${current.label} · QuizApp Admin`;
  }, [current.label]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  // toast('Saved') or toast('Something broke', 'error'); passed to pages via the outlet
  const toast = useCallback((message, type = 'success') => {
    const id = ++nextId.current;
    setToasts((list) => [...list.slice(-3), { id, message, type }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
  }, [dismiss]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="ad-wrapper">
      <header className="ad-navbar">
        <div className="ad-navbar-inner">
          <Link to="/admin" className="ad-brand">
            <span className="ad-brand-mark">Q</span>
            <span className="ad-brand-name">QuizApp</span>
            <span className="ad-brand-tag">Admin</span>
          </Link>

          <nav className="ad-nav" aria-label="Admin sections">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `ad-nav-item ${isActive ? 'active' : ''}`}>
                <Icon name={n.icon} size={16} />
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ad-navbar-right">
            <Link to="/dashboard" className="ad-btn ad-btn-glass ad-player-link">
              <Icon name="back" size={15} /> Player app
            </Link>
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <main className="ad-content">
        <Outlet context={{ toast }} />
      </main>

      <Toasts items={toasts} onDismiss={dismiss} />
    </div>
  );
}
