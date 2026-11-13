import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordApi } from '../api/auth';
import AuthLayout from '../components/layout/AuthLayout';
import { AuthAlert, AuthField, AuthSubmit } from '../components/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return setFieldError('Email is required.');
    if (!/\S+@\S+\.\S+/.test(email)) return setFieldError('Enter a valid email address.');

    setError('');
    setLoading(true);

    try {
      const data = await forgotPasswordApi(email);
      if (data.success) setSent(data.message);
      else setError(data.message || 'Could not send the reset link. Try again.');
    } catch (err) {
      setError(err.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle={`We've sent instructions to ${email}.`}>
        <AuthAlert tone="success">{sent}</AuthAlert>
        <p className="au-subtitle">
          The link expires in 15 minutes. If you don't see the email, check your spam folder.
        </p>
        <button type="button" className="au-btn" onClick={() => setSent('')}>
          Use a different email
        </button>
        <p className="au-switch">
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter the email you signed up with and we'll send you a link to reset it."
    >
      <AuthAlert>{error}</AuthAlert>

      <form onSubmit={handleSubmit} noValidate>
        <AuthField
          id="email"
          label="Email address"
          icon="mail"
          type="email"
          name="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setFieldError(''); }}
          autoComplete="email"
          autoFocus
          error={fieldError}
        />

        <AuthSubmit loading={loading} loadingText="Sending link…">Send reset link</AuthSubmit>
      </form>

      <p className="au-switch">
        Remembered it? <Link to="/login">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
