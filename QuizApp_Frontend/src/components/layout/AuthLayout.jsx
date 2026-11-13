import { AuthIcon } from '../auth';
import '../../styles/Auth.css';

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

