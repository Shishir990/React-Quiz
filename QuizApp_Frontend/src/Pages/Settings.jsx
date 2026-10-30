import { useState } from 'react';
import { useQuiz } from '../Context/Context';
import { changePasswordApi } from '../api/auth';
import AppShell, { Icon } from '../Components/AppShell';
import { initialsOf } from '../utils/format';
import '../Styles/Settings.css';

const getStrength = (password) => {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
};

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor = ['', '#E24B4A', '#EF9F27', '#1D9E75', '#0F6E56'];

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

function ChangePasswordForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getStrength(form.newPassword);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSuccess('');
  };

  const validate = () => {
    if (!form.currentPassword) return 'Enter your current password.';
    if (form.newPassword.length < 6) return 'New password must be at least 6 characters.';
    if (form.newPassword === form.currentPassword) return 'New password must be different from the current one.';
    if (form.newPassword !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await changePasswordApi(form.currentPassword, form.newPassword);
      if (data.success) {
        setSuccess(data.message);
        setForm(EMPTY_FORM);
      } else {
        setError(data.message || 'Could not change password. Try again.');
      }
    } catch (err) {
      setError(err.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputType = showPasswords ? 'text' : 'password';

  return (
    <section className="db-panel st-card">
      <div className="st-card-head">
        <div className="st-card-icon"><Icon name="shield" size={18} /></div>
        <div>
          <h3 className="st-card-title">Change password</h3>
          <p className="db-section-sub">Use at least 6 characters. A mix of letters, numbers and symbols is stronger.</p>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {success && <div className="st-success"><Icon name="check" size={16} />{success}</div>}

      <form onSubmit={handleSubmit} noValidate className="st-form">
        <div className="field">
          <label htmlFor="currentPassword">Current password</label>
          <input
            id="currentPassword"
            type={inputType}
            name="currentPassword"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.currentPassword}
            onChange={handleChange}
          />
        </div>

        <div className="field">
          <label htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            type={inputType}
            name="newPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.newPassword}
            onChange={handleChange}
          />
          {form.newPassword && (
            <div className="strength-row">
              <div className="strength-bar">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="strength-seg"
                    style={{ background: i <= strength ? strengthColor[strength] : undefined }}
                  />
                ))}
              </div>
              <span className="strength-label" style={{ color: strengthColor[strength] }}>
                {strengthLabel[strength]}
              </span>
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="confirmPassword">Confirm new password</label>
          <input
            id="confirmPassword"
            type={inputType}
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.confirmPassword}
            onChange={handleChange}
          />
        </div>

        <label className="st-toggle">
          <input
            type="checkbox"
            checked={showPasswords}
            onChange={(e) => setShowPasswords(e.target.checked)}
          />
          Show passwords
        </label>

        <div className="st-actions">
          <button type="submit" className="db-btn-light" disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </form>
    </section>
  );
}

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
