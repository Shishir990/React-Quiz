import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginApi } from '../api/auth';
import { useQuiz } from '../Context/Context';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useQuiz()

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.email || !form.password) return 'Please fill in all fields.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email.';
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
    <div className="auth-wrapper">
      <div className="auth-card">

        <div className="brand">
          <div className="brand-icon">Q/</div>
          <span className="brand-name">QuizApp</span>
        </div>

        <h1 className="auth-heading">Welcome back</h1>
        <p className="auth-sub">Sign in to continue your learning streak</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              onChange={handleChange}
              autoComplete="current-password"
            />
          </div>

          <div className="forgot">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="switch-text">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>

      </div>
    </div>
  );
}