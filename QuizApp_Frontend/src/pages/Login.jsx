import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { loginApi } from '../api/auth';
import { useQuiz } from '../context/QuizContext';
import AuthLayout from '../components/layout/AuthLayout';
import { AuthAlert, AuthField, AuthSubmit } from '../components/auth';

export default function Login() {
  const navigate = useNavigate();
  const notice = useLocation().state?.notice;
  const { login } = useQuiz()

  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
  };

  const validate = () => {
    const errors = {};
    if (!form.email) errors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Enter a valid email address.';
    if (!form.password) errors.password = 'Password is required.';
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
      const data = await loginApi(form.email, form.password);

      if (data.token) {
        login(data.token, data.user);
        navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
      } else {
        setError(data.message || 'Invalid email or password.');
      }
    } catch (err) {
      setError(err.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue your learning streak.">
      {!error && <AuthAlert tone="success">{notice}</AuthAlert>}
      <AuthAlert>{error}</AuthAlert>

      <form onSubmit={handleSubmit} noValidate>
        <AuthField
          id="email"
          label="Email address"
          icon="mail"
          type="email"
          name="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          autoFocus
          error={fieldErrors.email}
        />

        <AuthField
          id="password"
          label="Password"
          labelAside={<Link to="/forgot-password" className="au-label-link">Forgot password?</Link>}
          icon="lock"
          type="password"
          name="password"
          placeholder="Enter your password"
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
          error={fieldErrors.password}
        />

        <AuthSubmit loading={loading} loadingText="Signing in…">Sign in</AuthSubmit>
      </form>

      <p className="au-switch">
        Don't have an account? <Link to="/register">Create one</Link>
      </p>
    </AuthLayout>
  );
}
