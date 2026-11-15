import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import { Icon } from '../components/ui';
import '../styles/Landing.css';

const FEATURES = [
  { icon: 'clock', title: 'Timed quizzes', text: 'Every topic runs against the clock, so you practise recalling answers quickly, not just recognising them.' },
  { icon: 'play', title: 'Pick up where you left off', text: 'Unfinished quizzes are saved as you go and follow you to any device. Resume with the same questions and time left.' },
  { icon: 'check', title: 'Review every answer', text: 'After each quiz, see what you picked, the right answer and an explanation, question by question.' },
  { icon: 'pie', title: 'Analytics that explain', text: 'Scores over time, accuracy by difficulty and your strongest topics, so you know what to practise next.' },
  { icon: 'flame', title: 'Daily challenge and streaks', text: 'A new featured topic every day and a daily goal that turns short sessions into a habit.' },
  { icon: 'trophy', title: 'Leaderboard', text: 'Points come from your best score in each topic, so exploring new subjects counts more than replaying one.' },
];

const STEPS = [
  { title: 'Pick a topic', text: 'Browse categories from history to science, or hit Quick play for a random one.' },
  { title: 'Answer against the clock', text: 'Mark questions for review, skip and come back, or save and finish later.' },
  { title: 'Review and improve', text: 'See your score, every answer explained, and how you are trending over time.' },
];

// Public home page: what QuizApp is, with links to sign up or sign in
export default function Landing() {
  const { user } = useQuiz();
  const signedIn = !!user;
  const home = user?.role === 'admin' ? '/admin' : '/dashboard';

  useEffect(() => {
    document.title = 'QuizApp: sharpen your knowledge, one quiz at a time';
  }, []);

  return (
    <div className="lp">
      <header className="lp-nav">
        <Link to="/" className="lp-brand" aria-label="QuizApp home">
          <span className="lp-brand-mark">Q/</span>
          <span className="lp-brand-name">QuizApp</span>
        </Link>
        <nav className="lp-nav-links" aria-label="Sections">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
        </nav>
        <div className="lp-nav-actions">
          {signedIn ? (
            <Link to={home} className="lp-btn is-primary">Open dashboard <Icon name="arrow" size={15} /></Link>
          ) : (
            <>
              <Link to="/login" className="lp-btn is-ghost">Sign in</Link>
              <Link to="/register" className="lp-btn is-primary">Get started</Link>
            </>
          )}
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow">Daily challenges · streaks · leaderboards</span>
            <h1 className="lp-title">Sharpen your knowledge, one quiz at a time.</h1>
            <p className="lp-lead">
              Timed quizzes across many topics, progress that follows you between devices, and
              analytics that show exactly where you are improving.
            </p>
            <div className="lp-hero-actions">
              {signedIn ? (
                <Link to={home} className="lp-btn is-primary is-lg">Open dashboard <Icon name="arrow" size={16} /></Link>
              ) : (
                <>
                  <Link to="/register" className="lp-btn is-primary is-lg">Get started, it's free <Icon name="arrow" size={16} /></Link>
                  <Link to="/login" className="lp-btn is-ghost is-lg">I have an account</Link>
                </>
              )}
            </div>
          </div>

          {/* A picture of the app, drawn in HTML so it stays sharp and on-theme */}
          <div className="lp-preview" aria-hidden="true">
            <div className="lp-window">
              <div className="lp-window-bar"><span /><span /><span /></div>
              <div className="lp-window-body">
                <div className="lp-q">
                  <div className="lp-q-head">
                    <span className="lp-q-eyebrow">Question 04</span>
                    <span className="lp-q-timer"><Icon name="clock" size={13} /> 01:52</span>
                  </div>
                  <p className="lp-q-text">Which ocean is the largest?</p>
                  {['Atlantic', 'Pacific', 'Indian', 'Arctic'].map((o, i) => (
                    <div key={o} className={`lp-q-opt ${i === 1 ? 'is-picked' : ''}`}>
                      <span className="lp-q-letter">{'ABCD'[i]}</span>{o}
                      {i === 1 && <span className="lp-q-tick"><Icon name="check" size={15} /></span>}
                    </div>
                  ))}
                </div>
                <div className="lp-side">
                  <div className="lp-stat"><span>Streak</span><strong className="is-warn">3 days</strong></div>
                  <div className="lp-stat"><span>Best score</span><strong className="is-good">92%</strong></div>
                  <div className="lp-mini">
                    <div className="lp-mini-head"><span>🏛️ History</span><em>15 questions</em></div>
                    <div className="lp-mini-bar"><span style={{ width: '40%' }} /></div>
                    <div className="lp-mini-foot"><code>6/15 · ~3 min</code><b>Resume <Icon name="arrow" size={12} /></b></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="lp-section" id="features">
          <p className="lp-kicker">Features</p>
          <h2 className="lp-h2">Everything you need to learn by quizzing</h2>
          <div className="lp-features">
            {FEATURES.map((f) => (
              <article key={f.title} className="lp-feature">
                <span className="lp-feature-icon"><Icon name={f.icon} size={18} /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="lp-section" id="how">
          <p className="lp-kicker">How it works</p>
          <h2 className="lp-h2">From first question to steady progress</h2>
          <ol className="lp-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="lp-step">
                <span className="lp-step-num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Closing call to action */}
        <section className="lp-cta">
          <div>
            <h2>Ready to start your streak?</h2>
            <p>Create a free account in seconds, with email or your Google account.</p>
          </div>
          <Link to={signedIn ? home : '/register'} className="lp-btn is-primary is-lg">
            {signedIn ? 'Open dashboard' : 'Create your account'} <Icon name="arrow" size={16} />
          </Link>
        </section>
      </main>

      <footer className="lp-footer">
        <span>© {new Date().getFullYear()} QuizApp</span>
        <nav aria-label="Footer">
          <Link to="/login">Sign in</Link>
          <Link to="/register">Create account</Link>
          <a href="/api/docs/">API docs</a>
        </nav>
      </footer>
    </div>
  );
}
