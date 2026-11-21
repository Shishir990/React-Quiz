import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmEmailChangeApi } from '../api/auth';
import { useQuiz } from '../context/QuizContext';
import AuthLayout from '../components/layout/AuthLayout';
import { AuthAlert, AuthSubmit } from '../components/auth';

// Opened from the link emailed to a new address. Confirming takes a click (not page
// load), so mail scanners that open links can't confirm on the user's behalf.
export default function ConfirmEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { user, updateUser } = useQuiz();
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [loading, setLoading] = useState(false);

  const confirm = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await confirmEmailChangeApi(token);
      if (!data?.success) throw new Error(data?.message || 'Could not confirm your new email.');
      // Signed in to that same account in this browser: show the new address right away
      if (user && String(user._id) === String(data.user?._id)) {
        updateUser({ email: data.user.email, pendingEmail: undefined });
      }
      setDone(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const nextLink = user
    ? <Link to="/settings" className="au-btn">Back to settings</Link>
    : <Link to="/login" className="au-btn">Sign in</Link>;

  if (!token) {
    return (
      <AuthLayout title="Link invalid" subtitle="This link is missing its confirmation code.">
        {nextLink}
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Email updated" subtitle="Use your new address the next time you sign in.">
        <AuthAlert tone="success">{done}</AuthAlert>
        {nextLink}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Confirm your new email" subtitle="Click below to make this address the email for your Quizora account.">
      <AuthAlert>{error}</AuthAlert>
      <form onSubmit={confirm} noValidate>
        <AuthSubmit loading={loading} loadingText="Confirming…">Confirm new email</AuthSubmit>
      </form>
      {error && <p className="au-switch">{user ? <Link to="/settings">Back to settings</Link> : <Link to="/login">Back to sign in</Link>}</p>}
    </AuthLayout>
  );
}
