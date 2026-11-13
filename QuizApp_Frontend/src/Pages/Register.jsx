import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerApi } from '../api/auth';
import { useQuiz } from '../context/QuizContext';
import AuthLayout from '../components/layout/AuthLayout';
import { AuthAlert, AuthField, AuthSubmit } from '../components/auth';
import { getStrength } from '../utils/password';

const strengthLabel = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor = ['#DC2626', '#DC2626', '#F59E0B', '#10B981', '#047857'];

export default function Register() {
  const navigate = useNavigate();
  const { login } = useQuiz();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getStrength(form.password);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
  };

  const validate = () => {
    const errors = {};
    if (!form.firstName.trim()) errors.firstName = 'Required.';
    if (!form.lastName.trim()) errors.lastName = 'Required.';
    if (!form.email) errors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Enter a valid email address.';
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
      const data = await registerApi({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email,
        password: form.password,
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
    <AuthLayout title="Create your account" subtitle="Start practicing and track your progress.">
      <AuthAlert>{error}</AuthAlert>

      <form onSubmit={handleSubmit} noValidate>
        <div className="au-row">
          <AuthField
            id="firstName"
            label="First name"
            name="firstName"
            placeholder="Arjun"
            value={form.firstName}
            onChange={handleChange}
            autoComplete="given-name"
            autoFocus
            error={fieldErrors.firstName}
          />
          <AuthField
            id="lastName"
            label="Last name"
            name="lastName"
            placeholder="Sharma"
            value={form.lastName}
            onChange={handleChange}
            autoComplete="family-name"
            error={fieldErrors.lastName}
          />
        </div>

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
          error={fieldErrors.email}
        />

        <div>
          <AuthField
            id="password"
            label="Password"
            icon="lock"
            type="password"
            name="password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            error={fieldErrors.password}
          />
          {form.password && !fieldErrors.password && (
            <div className="au-strength">
              <div className="au-strength-bar">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="au-strength-seg"
                    style={{ background: i <= strength ? strengthColor[strength] : undefined }}
                  />
                ))}
              </div>
              <span className="au-strength-label" style={{ color: strengthColor[strength] }}>
                {strengthLabel[strength]}
              </span>
            </div>
          )}
        </div>

        <AuthField
          id="confirmPassword"
          label="Confirm password"
          icon="lock"
          type="password"
          name="confirmPassword"
          placeholder="Re-enter your password"
          value={form.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
        />

        <AuthSubmit loading={loading} loadingText="Creating account…">Create account</AuthSubmit>
      </form>

      <p className="au-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
