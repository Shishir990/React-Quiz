import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../../context/QuizContext';
import { readJson } from '../../api/readJson';
import { apiFetch } from '../../api/client';

// Google Identity Services, loaded once and only when Google sign-in is configured
let gisPromise = null;
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => { gisPromise = null; reject(new Error('Could not load Google sign-in')); };
      document.head.appendChild(script);
    });
  }
  return gisPromise;
}

// "Continue with Google" for the sign-in and register pages.
// Shows nothing until the server reports a Google client id, so the page works
// unchanged where Google sign-in isn't set up. onError(message) shows failures.
export function GoogleButton({ text = 'continue_with', onError }) {
  const [clientId, setClientId] = useState(null);
  const [busy, setBusy] = useState(false);
  const holder = useRef(null);
  const { login } = useQuiz();
  const navigate = useNavigate();
  // Latest callbacks, read when Google calls back, so the button is set up only once
  const handlers = useRef({});
  useEffect(() => { handlers.current = { login, navigate, onError }; });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch('/auth/google/config');
        const data = res.ok ? await res.json() : null;
        if (alive) setClientId(data?.clientId || null);
      } catch {
        // Can't reach the server: Google sign-in simply stays hidden
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let alive = true;

    // Google hands us a signed ID token; the server verifies it and returns our own token
    const onCredential = async ({ credential }) => {
      setBusy(true);
      try {
        const res = await apiFetch('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
        const data = await readJson(res);
        if (!res.ok || !data.user) throw new Error(data.message || 'Google sign-in failed. Please try again.');
        handlers.current.login(data.user);
        handlers.current.navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
      } catch (err) {
        handlers.current.onError?.(err.message);
      } finally {
        if (alive) setBusy(false);
      }
    };

    (async () => {
      try {
        await loadGoogleScript();
        if (!alive || !holder.current) return;
        window.google.accounts.id.initialize({ client_id: clientId, callback: onCredential });
        // Google's button takes a pixel width (200-400)
        const width = Math.max(200, Math.min(400, Math.round(holder.current.offsetWidth)));
        window.google.accounts.id.renderButton(holder.current, {
          theme: 'filled_black', size: 'large', shape: 'rectangular', text, width, logo_alignment: 'center',
        });
      } catch (err) {
        handlers.current.onError?.(err.message);
      }
    })();

    return () => { alive = false; };
  }, [clientId, text]);

  if (!clientId) return null;

  return (
    <div className={`au-google ${busy ? 'is-busy' : ''}`}>
      <div className="au-or" role="separator"><span>or</span></div>
      <div ref={holder} className="au-google-btn" aria-busy={busy} />
    </div>
  );
}
