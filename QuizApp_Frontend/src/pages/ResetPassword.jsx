import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { checkResetTokenApi, resetPasswordApi } from '../api/auth';
import AuthLayout from '../components/layout/AuthLayout';
import { AuthAlert, AuthField, AuthIcon, AuthSubmit } from '../components/auth';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');

  // Which account is this link for? Also catches expired links up front
  const check = useQuery({
    queryKey: ['reset-token', token],
    queryFn: () => checkResetTokenApi(token).then((data) => {
      if (data?.valid) return data;
      throw new Error(data?.message || 'This reset link is invalid or has expired.');
    }),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
  };

  const validate = () => {
    const errors = {};
    if (form.password.length < 6) errors.password = 'Password must be at least 6 characters.';
    if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setError('');
    setLoading(true);

    try {
      const data = await resetPasswordApi(token, form.password);
      if (data.success) {
        navigate('/login', { replace: true, state: { notice: data.message } });
      } else {
        setError(data.message || 'Could not reset your password. Try again.');
      }
    } catch (err) {
      setError(err.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token || check.isError) {
    return (
      <AuthLayout
        title="Link expired or invalid"
        subtitle={token
          ? 'This reset link has expired or was already used. Reset links work once and last 15 minutes.'
          : 'This link is missing its reset code.'}
      >
        <Link to="/forgot-password" className="au-btn">Request a new link</Link>
        <p className="au-switch">
          <Link to="/login">Back to sign in</Link>
        </p>
      </AuthLayout>
    );
  }

  if (check.isPending) {
    return (
      <AuthLayout title="Set a new password" subtitle="Checking your reset link…">
        <div className="au-account is-loading" aria-hidden="true" />
      </AuthLayout>
    );
  }

  const { name, email } = check.data;

  return (
    <AuthLayout title="Set a new password" subtitle={`Hi ${name}, choose a new password for this account.`}>
      <div className="au-account">
        <span className="au-account-icon"><AuthIcon name="user" size={16} /></span>
        <div>
          <p className="au-account-label">Resetting password for</p>
          <p className="au-account-email">{email}</p>
        </div>
      </div>

      <AuthAlert>{error}</AuthAlert>
      {error && /expired|invalid/i.test(error) && (
        <p className="au-subtitle"><Link to="/forgot-password" className="au-label-link">Request a new reset link</Link></p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <AuthField
          id="password"
          label="New password"
          icon="lock"
          type="password"
          name="password"
          placeholder="At least 6 characters"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
          autoFocus
          error={fieldErrors.password}
        />

        <AuthField
          id="confirmPassword"
          label="Confirm new password"
          icon="lock"
          type="password"
          name="confirmPassword"
          placeholder="Re-enter your password"
          value={form.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
        />

        <AuthSubmit loading={loading} loadingText="Saving…">Reset password</AuthSubmit>
      </form>

      <p className="au-switch">
        Not your account? <Link to="/login">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
