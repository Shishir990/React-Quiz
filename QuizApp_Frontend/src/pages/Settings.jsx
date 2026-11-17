import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import AppShell from '../components/layout/AppShell';
import { initialsOf } from '../utils/format';
import { ChangePasswordForm } from '../components/settings/ChangePasswordForm';
import { ActiveSessions } from '../components/settings/ActiveSessions';
import { ProfileCard } from '../components/settings/ProfileForms';
import { SignOutEverywhere } from '../components/settings/SignOutEverywhere';
import { Icon } from '../components/ui';
import '../styles/Settings.css';

const TABS = [
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'password', label: 'Change password', icon: 'shield' },
  { id: 'sessions', label: 'Active sessions', icon: 'monitor' },
];

export default function Settings() {
  const { user } = useQuiz();
  // The open tab lives in the URL (?tab=sessions), so it survives a refresh and can be linked to
  const [params, setParams] = useSearchParams();
  const active = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : TABS[0].id;
  const tabRefs = useRef({});

  const select = (id) => setParams(id === TABS[0].id ? {} : { tab: id }, { replace: true });

  // Arrow keys move between tabs, as in any tab list
  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === active);
    const next = TABS[(i + step + TABS.length) % TABS.length].id;
    select(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <AppShell title="Settings">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">Settings</h1>
          <p className="db-section-sub">Manage your account and security</p>
        </div>
      </div>

      <div className="st-grid">
        <section className="db-panel st-card">
          <div className="st-profile">
            <div className="db-avatar db-avatar-brand st-avatar">{initialsOf(user?.name)}</div>
            <div>
              <p className="st-profile-name">{user?.name || 'User'}</p>
              {user?.email && <p className="db-section-sub">{user.email}</p>}
              <span className="st-role">{user?.role || 'player'}</span>
            </div>
          </div>
        </section>

        <div className="pg-chips st-tabs" role="tablist" aria-label="Settings sections" onKeyDown={onKeyDown}>
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => { tabRefs.current[t.id] = el; }}
              id={`st-tab-${t.id}`}
              role="tab"
              aria-selected={active === t.id}
              aria-controls={`st-panel-${t.id}`}
              tabIndex={active === t.id ? 0 : -1}
              className={`pg-chip st-tab ${active === t.id ? 'is-active' : ''}`}
              onClick={() => select(t.id)}
            >
              <Icon name={t.icon} size={15} /> {t.label}
            </button>
          ))}
        </div>

        <div
          className="st-panel"
          role="tabpanel"
          id={`st-panel-${active}`}
          aria-labelledby={`st-tab-${active}`}
        >
          {active === 'profile' ? (
            <ProfileCard />
          ) : active === 'password' ? (
            <ChangePasswordForm />
          ) : (
            <>
              <ActiveSessions />
              <SignOutEverywhere />
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
