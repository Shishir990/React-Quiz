import { useQuiz } from '../context/QuizContext';
import AppShell from '../components/layout/AppShell';
import { initialsOf } from '../utils/format';
import { ChangePasswordForm } from '../components/settings/ChangePasswordForm';
import '../styles/Settings.css';

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
      </div>
    </AppShell>
  );
}
