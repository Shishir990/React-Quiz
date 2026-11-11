import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordApi } from '../api/auth';
import AuthLayout, { AuthAlert, AuthField, AuthSubmit } from '../Components/AuthLayout';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');

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

  if (!token) {
    return (
      <AuthLayout title="Invalid reset link" subtitle="This link is missing its reset code. Request a new one below.">
        <Link to="/forgot-password" className="au-btn">Request a new link</Link>
        <p className="au-switch">
          <Link to="/login">Back to sign in</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password you haven't used before.">
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
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}
