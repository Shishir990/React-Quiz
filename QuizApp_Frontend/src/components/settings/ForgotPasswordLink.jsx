import { useState } from 'react';
import { forgotPasswordApi } from '../../api/auth';
import { useQuiz } from '../../context/QuizContext';

// "Forgot password?" beside a Current password label: emails a reset link to this
// account's address. The parent form shows the outcome in its own success/error area.
export function ForgotPasswordLink({ onSent, onError }) {
  const { user } = useQuiz();
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!user?.email) return;
    onError('');
    onSent('');
    setSending(true);
    try {
      const data = await forgotPasswordApi(user.email);
      if (!data?.success) throw new Error(data?.message || 'Could not send the reset link. Try again.');
      onSent(`We've sent a password reset link to ${user.email}. It expires in 15 minutes.`);
    } catch (err) {
      onError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <button type="button" className="st-link-btn" onClick={send} disabled={sending || !user?.email}>
      {sending ? 'Sending link…' : 'Forgot password?'}
    </button>
  );
}
