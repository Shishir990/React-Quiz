import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import { Icon, Logo } from '../components/ui';
import '../styles/Landing.css';

const FEATURES = [
  { icon: 'clock', title: 'Timed quizzes', text: 'Every topic runs against the clock, so you practise recalling answers quickly, not just recognising them.' },
  { icon: 'play', title: 'Pick up where you left off', text: 'Unfinished quizzes are saved as you go and follow you to any device. Resume with the same questions and time left.' },
  { icon: 'check', title: 'Review every answer', text: 'After each quiz, see what you picked, the right answer and an explanation, question by question.' },
  { icon: 'pie', title: 'Analytics that explain', text: 'Scores over time, accuracy by difficulty and your strongest topics, so you know what to practise next.' },
  { icon: 'flame', title: 'Daily challenge and streaks', text: 'A new featured topic every day and a daily goal that turns short sessions into a habit.' },
  { icon: 'trophy', title: 'Leaderboard', text: 'Points come from your best score in each topic, so exploring new subjects counts more than replaying one.' },
];

// What "Play together" offers, shown next to the lobby picture
const LIVE_POINTS = [
  { icon: 'users', title: 'Host with a 5-letter code', text: 'Share the code or an invite link. Up to 50 players join from any device, no setup.' },
  { icon: 'list', title: 'One at a time, or all at once', text: 'Reveal the answer after every question, or hand out the whole quiz like an exam with one timer.' },
  { icon: 'clock', title: 'Your timer', text: 'From 5 seconds a question to 3 hours for the whole game. Faster correct answers score more.' },
  { icon: 'edit', title: 'Write your own quizzes', text: 'Build a quiz in the editor or import it from a spreadsheet (CSV), then host it for friends, a class or a team.' },
  { icon: 'results', title: 'Past games', text: 'Every game is kept: the final ranking, and a review of your answers next to what everyone else picked.' },
];

const STEPS = [
  { title: 'Pick a topic or write your own', text: 'Browse categories from history to science, or build a quiz in minutes and import questions from a spreadsheet.' },
  { title: 'Play solo or host a live game', text: 'Answer against the clock on your own, or share a code and play with friends at the same time.' },
  { title: 'Review and improve', text: 'See every answer explained, how you ranked, and how you are trending over time.' },
];

const PREVIEW_PLAYERS = [
  { name: 'Maya', initials: 'MA', score: '2,740', done: true },
  { name: 'You', initials: 'YO', score: '2,615', done: true, me: true },
  { name: 'Leo', initials: 'LE', score: '1,980', done: false },
];

// Public home page: what QuizApp is, with links to sign up or sign in
export default function Landing() {
  const { user } = useQuiz();
  const signedIn = !!user;
  const home = user?.role === 'admin' ? '/admin' : '/dashboard';

  useEffect(() => {
    document.title = 'QuizApp: quiz solo or live with friends';
  }, []);

  return (
    <div className="lp">
      <header className="lp-nav">
        <Link to="/" className="lp-brand" aria-label="QuizApp home">
          <Logo size={32} />
          <span className="lp-brand-name">QuizApp</span>
        </Link>
        <nav className="lp-nav-links" aria-label="Sections">
          <a href="#live">Play live</a>
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
            <span className="lp-eyebrow">New: live games and your own quizzes</span>
            <h1 className="lp-title">Quiz solo, or live with friends.</h1>
            <p className="lp-lead">
              Timed quizzes across many topics, progress that follows you between devices, and
              live games where everyone answers at once: share a code, pick your timer, and see
              who comes out on top.
            </p>
            <div className="lp-hero-actions">
              {signedIn ? (
                <>
                  <Link to={home} className="lp-btn is-primary is-lg">Open dashboard <Icon name="arrow" size={16} /></Link>
                  <Link to="/live" className="lp-btn is-ghost is-lg"><Icon name="users" size={16} /> Host a live game</Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="lp-btn is-primary is-lg">Get started, it's free <Icon name="arrow" size={16} /></Link>
                  <Link to="/login" className="lp-btn is-ghost is-lg">I have an account</Link>
                </>
              )}
            </div>
          </div>

          {/* A picture of a live game, drawn in HTML so it stays sharp and on-theme */}
          <div className="lp-preview" aria-hidden="true">
            <div className="lp-window">
              <div className="lp-window-bar">
                <span /><span /><span />
                <em className="lp-window-title"><b className="lp-live-dot" /> Live · K7Q2M</em>
              </div>
              <div className="lp-window-body">
                <div className="lp-q">
                  <div className="lp-q-head">
                    <span className="lp-q-eyebrow">Question 04 of 10</span>
                    <span className="lp-q-timer"><Icon name="clock" size={13} /> 00:12</span>
                  </div>
                  <div className="lp-q-time"><span style={{ width: '60%' }} /></div>
                  <p className="lp-q-text">Which ocean is the largest?</p>
                  {['Atlantic', 'Pacific', 'Indian', 'Arctic'].map((o, i) => (
                    <div key={o} className={`lp-q-opt ${i === 1 ? 'is-picked' : ''}`}>
                      <span className="lp-q-letter">{'ABCD'[i]}</span>{o}
                      {i === 1 && <span className="lp-q-tick"><Icon name="check" size={15} /></span>}
                    </div>
                  ))}
                </div>
                <div className="lp-side">
                  <div className="lp-players">
                    <div className="lp-players-head"><span>Players</span><em>2 of 3 answered</em></div>
                    {PREVIEW_PLAYERS.map((p, i) => (
                      <div key={p.name} className={`lp-player ${p.me ? 'is-me' : ''}`}>
                        <span className="lp-player-rank">{i + 1}</span>
                        <span className="lp-player-avatar">{p.initials}</span>
                        <span className="lp-player-name">{p.name}</span>
                        <span className={`lp-player-state ${p.done ? 'is-done' : ''}`}>{p.done ? 'Answered' : 'Thinking…'}</span>
                        <code>{p.score}</code>
                      </div>
                    ))}
                  </div>
                  <div className="lp-stat"><span>Streak</span><strong className="is-warn">3 days</strong></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Play together */}
        <section className="lp-section lp-live" id="live">
          <div className="lp-live-copy">
            <p className="lp-kicker">Play together</p>
            <h2 className="lp-h2">Host a live quiz in under a minute</h2>
            <ul className="lp-live-points">
              {LIVE_POINTS.map((p) => (
                <li key={p.title}>
                  <span className="lp-feature-icon"><Icon name={p.icon} size={17} /></span>
                  <div>
                    <h3>{p.title}</h3>
                    <p>{p.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link to={signedIn ? '/live' : '/register'} className="lp-btn is-primary is-lg lp-live-cta">
              {signedIn ? 'Host a live game' : 'Sign up to host a game'} <Icon name="arrow" size={16} />
            </Link>
          </div>

          {/* The lobby, as players see it before the host starts */}
          <div className="lp-lobby" aria-hidden="true">
            <div className="lp-window">
              <div className="lp-lobby-body">
                <p className="lp-lobby-label">Game code</p>
                <p className="lp-lobby-code">K7Q2M</p>
                <p className="lp-lobby-meta">Friday trivia · 15 questions</p>
                <div className="lp-lobby-modes">
                  <span>One at a time</span>
                  <span className="is-on">All at once</span>
                </div>
                <div className="lp-lobby-modes">
                  <span>5 min</span>
                  <span className="is-on">10 min</span>
                  <span>15 min</span>
                  <span>Custom</span>
                </div>
                <div className="lp-lobby-people">
                  {['MA', 'LE', 'SO', 'YO', 'RI'].map((i) => <span key={i}>{i}</span>)}
                  <em>5 players ready</em>
                </div>
                <span className="lp-lobby-start"><Icon name="play" size={14} /> Start game</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="lp-section" id="features">
          <p className="lp-kicker">Practise on your own</p>
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
            <h2>Ready to play?</h2>
            <p>Start a streak on your own, or host your first live game tonight. Sign up free with email or Google.</p>
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
