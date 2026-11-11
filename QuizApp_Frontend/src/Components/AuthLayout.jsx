import { useState } from 'react';
import '../Styles/Auth.css';

const paths = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,
  check: <path d="m5 12 5 5 9-10" />,
};

export function AuthIcon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

const features = [
  'Timed quizzes across every category',
  'Detailed results with answer review',
  'Analytics to track your progress',
  'Compete on the global leaderboard',
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="au-wrapper">
      <aside className="au-panel">
        <div className="au-logo">
          <div className="au-logo-icon">Q/</div>
          <span className="au-logo-name">QuizApp</span>
        </div>

        <div className="au-panel-body">
          <h2 className="au-panel-title">Sharpen your knowledge, one quiz at a time.</h2>
          <ul className="au-features">
            {features.map((f) => (
              <li key={f}>
                <span className="au-feature-check"><AuthIcon name="check" size={14} /></span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="au-panel-foot">© {new Date().getFullYear()} QuizApp</p>
      </aside>

      <main className="au-main">
        <div className="au-card">
          <div className="au-logo au-logo-mobile">
            <div className="au-logo-icon">Q/</div>
            <span className="au-logo-name">QuizApp</span>
          </div>
          <h1 className="au-title">{title}</h1>
          <p className="au-subtitle">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

export function AuthAlert({ children, tone = 'error' }) {
  if (!children) return null;
  return (
    <div className={`au-alert ${tone === 'success' ? 'is-success' : ''}`} role={tone === 'success' ? 'status' : 'alert'}>
      <AuthIcon name={tone === 'success' ? 'check' : 'alert'} size={16} />
      <span>{children}</span>
    </div>
  );
}

export function AuthField({ label, labelAside, icon, error, type = 'text', id, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className={`au-field ${error ? 'has-error' : ''}`}>
      <div className="au-label-row">
        <label htmlFor={id}>{label}</label>
        {labelAside}
      </div>
      <div className="au-input">
        {icon && <span className="au-input-icon"><AuthIcon name={icon} /></span>}
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            className="au-eye"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            <AuthIcon name={visible ? 'eyeOff' : 'eye'} />
          </button>
        )}
      </div>
      {error && <p className="au-field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

export function AuthSubmit({ loading, loadingText, children }) {
  return (
    <button type="submit" className="au-btn" disabled={loading}>
      {loading && <span className="au-spinner" aria-hidden="true" />}
      {loading ? loadingText : children}
    </button>
  );
}
