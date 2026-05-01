import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerApi } from '../api/auth';
import { useQuiz } from '../Context/Context';

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

export default function Register() {
  const navigate = useNavigate();
  const { login } = useQuiz();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'player',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getStrength(form.password);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.firstName || !form.lastName) return 'Please enter your full name.';
    if (!form.email) return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
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
      const data = await registerApi({
        name: `${form.firstName} ${form.lastName}`,
        email: form.email,
        password: form.password,
        role: form.role,
      });

      if (data.token) {
        login(data.token, data.user);
        navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
      } else {
        setError(data.message || 'Registration failed. Try again.');
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

        <h1 className="auth-heading">Create account</h1>
        <p className="auth-sub">Join thousands of learners today</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>

          <div className="field">
            <label>I am a</label>
            <div className="role-toggle">
              <button
                type="button"
                className={`role-btn ${form.role === 'player' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: 'player' })}
              >
                Player
              </button>
              <button
                type="button"
                className={`role-btn ${form.role === 'admin' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: 'admin' })}
              >
                Admin
              </button>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>First name</label>
              <input
                type="text"
                name="firstName"
                placeholder="Arjun"
                value={form.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>Last name</label>
              <input
                type="text"
                name="lastName"
                placeholder="Sharma"
                value={form.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
            />
            {form.password && (
              <div className="strength-row">
                <div className="strength-bar">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="strength-seg"
                      style={{
                        background: i <= strength ? strengthColor[strength] : undefined,
                      }}
                    />
                  ))}
                </div>
                <span
                  className="strength-label"
                  style={{ color: strengthColor[strength] }}
                >
                  {strengthLabel[strength]}
                </span>
              </div>
            )}
          </div>

          <div className="field">
            <label>Confirm password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="switch-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

      </div>
    </div>
  );
}