import { useQuiz } from '../context/QuizContext';
import AppShell from '../components/layout/AppShell';
import { initialsOf } from '../utils/format';
import { ChangePasswordForm } from '../components/settings/ChangePasswordForm';
import { SignOutEverywhere } from '../components/settings/SignOutEverywhere';
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';
import '../styles/Settings.css';
import '../styles/Sessions.css';

export default function Settings() {
  const { user } = useQuiz();

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

        <ChangePasswordForm />

        <Link to="/settings/sessions" className="db-panel st-card ss-link">
          <div className="st-card-head">
            <div className="st-card-icon"><Icon name="monitor" size={18} /></div>
            <div>
              <h3 className="st-card-title">Active sessions</h3>
              <p className="db-section-sub">See the devices signed in to your account and sign out the ones you don't use.</p>
            </div>
          </div>
          <span className="ss-link-arrow"><Icon name="arrow" size={18} /></span>
        </Link>

        <SignOutEverywhere />
      </div>
    </AppShell>
  );
}
