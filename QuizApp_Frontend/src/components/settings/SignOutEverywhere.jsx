import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutAllApi } from '../../api/auth';
import { useQuiz } from '../../context/QuizContext';
import { Icon } from '../ui';

// Ends every session of this account: phones, other browsers, any copied sign-in
export function SignOutEverywhere() {
  const { logout } = useQuiz();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const signOutEverywhere = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await logoutAllApi();
      if (!data?.success) throw new Error(data?.message || 'Could not sign out of other devices.');
      await logout();
      navigate('/login', { state: { notice: 'Signed out of all devices.' } });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <section className="db-panel st-card">
      <div className="st-card-head">
        <div className="st-card-icon"><Icon name="logout" size={18} /></div>
        <div>
          <h3 className="st-card-title">Sign out of all devices</h3>
          <p className="db-section-sub">Ends every session of this account, including this one. Use it if you signed in on a shared computer or think someone else has access.</p>
        </div>
      </div>
      {error && <div className="auth-error">{error}</div>}
      <div className="st-actions">
        {confirming ? (
          <>
            <button className="db-btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>Cancel</button>
            <button className="db-btn-light st-danger" onClick={signOutEverywhere} disabled={busy}>
              {busy ? 'Signing out…' : 'Yes, sign out everywhere'}
            </button>
          </>
        ) : (
          <button className="db-btn-ghost" onClick={() => setConfirming(true)}>Sign out of all devices</button>
        )}
      </div>
    </section>
  );
}
