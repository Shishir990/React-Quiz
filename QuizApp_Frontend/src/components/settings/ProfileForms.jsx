import { useState } from 'react';
import { updateProfileApi, requestEmailChangeApi, cancelEmailChangeApi } from '../../api/auth';
import { queryClient } from '../../api/queries';
import { useQuiz } from '../../context/QuizContext';
import { Icon } from '../ui';
import { ForgotPasswordLink } from './ForgotPasswordLink';

const NAME_MAX = 60;
const looksLikeEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Display name: saved at once
export function NameForm() {
  const { user, updateUser } = useQuiz();
  const [name, setName] = useState(user?.name || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const unchanged = trimmed === (user?.name || '');

  const save = async (e) => {
    e.preventDefault();
    if (!trimmed) return setError('Enter your name.');
    if (trimmed.length > NAME_MAX) return setError(`Keep the name under ${NAME_MAX} characters.`);

    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const data = await updateProfileApi(trimmed);
      if (!data?.success) throw new Error(data?.message || 'Could not update your name.');
      updateUser({ name: data.user.name });
      setName(data.user.name);
      setSuccess(data.message);
      // The leaderboard and similar lists show names
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="st-subsection">
      <div className="st-card-head">
        <div className="st-card-icon"><Icon name="user" size={18} /></div>
        <div>
          <h3 className="st-card-title">Name</h3>
          <p className="db-section-sub">How you appear across QuizApp, including the leaderboard.</p>
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {success && <div className="st-success"><Icon name="check" size={16} />{success}</div>}

      <form onSubmit={save} noValidate className="st-form">
        <div className="field">
          <label htmlFor="profileName">Full name</label>
          <input
            id="profileName"
            name="name"
            autoComplete="name"
            maxLength={NAME_MAX}
            value={name}
            onChange={(e) => { setName(e.target.value); setSuccess(''); }}
          />
        </div>
        <div className="st-actions">
          <button type="submit" className="db-btn-light" disabled={saving || unchanged}>
            {saving ? 'Saving…' : 'Save name'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Email address: changes only after the link sent to the new address is opened
export function EmailForm() {
  const { user, updateUser } = useQuiz();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const pending = user?.pendingEmail;
  const needsPassword = user?.hasPassword !== false; // Google-only accounts have none

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSuccess('');
  };

  const send = async (e) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!looksLikeEmail(email)) return setError('Enter a valid email address.');
    if (email === user?.email) return setError('That is already your email address.');
    if (needsPassword && !form.password) return setError('Enter your current password.');

    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const data = await requestEmailChangeApi(email, needsPassword ? form.password : undefined);
      if (!data?.success) throw new Error(data?.message || 'Could not start the email change.');
      updateUser({ pendingEmail: data.pendingEmail });
      setForm({ email: '', password: '' });
      setSuccess(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const data = await cancelEmailChangeApi();
      if (!data?.success) throw new Error(data?.message || 'Could not cancel the change.');
      updateUser({ pendingEmail: undefined });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="st-subsection">
      <div className="st-card-head">
        <div className="st-card-icon"><Icon name="mail" size={18} /></div>
        <div>
          <h3 className="st-card-title">Email address</h3>
          <p className="db-section-sub">
            Used to sign in and for password resets. We'll send a link to the new address to confirm it's yours.
          </p>
        </div>
      </div>

      <div className="st-current">
        <span className="st-current-label">Current email</span>
        <span className="st-current-value">{user?.email}</span>
      </div>

      {pending && (
        <div className="st-pending">
          <div>
            <p className="st-pending-title">Waiting for confirmation</p>
            <p className="db-section-sub">
              Open the link we sent to <b>{pending}</b> to finish. Until then, your current email stays in use.
            </p>
          </div>
          <button type="button" className="db-btn-ghost" onClick={cancel} disabled={busy}>Cancel change</button>
        </div>
      )}

      {error && <div className="auth-error">{error}</div>}
      {success && <div className="st-success"><Icon name="check" size={16} />{success}</div>}

      <form onSubmit={send} noValidate className="st-form">
        <div className="field">
          <label htmlFor="newEmail">{pending ? 'Use a different new email' : 'New email'}</label>
          <input
            id="newEmail"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
          />
        </div>

        {needsPassword && (
          <div className="field">
            <div className="st-label-row">
              <label htmlFor="emailPassword">Current password</label>
              <ForgotPasswordLink onSent={setSuccess} onError={setError} />
            </div>
            <input
              id="emailPassword"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
            />
          </div>
        )}

        <div className="st-actions">
          <button type="submit" className="db-btn-light" disabled={busy}>
            {busy ? 'Sending…' : 'Send confirmation link'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Name and email share one card, split by a divider
export function ProfileCard() {
  return (
    <section className="db-panel st-card">
      <NameForm />
      <hr className="st-divider" />
      <EmailForm />
    </section>
  );
}
