import { Component } from 'react';
import { useLocation } from 'react-router-dom';
import '../Styles/ErrorBoundary.css';

// Catches errors thrown while rendering anything inside it and shows a
// fallback instead of a blank page. Has to be a class: React only exposes
// getDerivedStateFromError / componentDidCatch to class components.
//
// What it does NOT catch: errors in event handlers (onClick...), async code
// (fetch, setTimeout) or the boundary itself. Those still need try/catch.
export class ErrorBoundary extends Component {
  state = { error: null };

  // Runs during render: switch to the fallback UI
  static getDerivedStateFromError(error) {
    return { error };
  }

  // Runs after: a good place to log or report (e.g. Sentry)
  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info.componentStack);
  }

  // A new resetKey (e.g. the URL) clears the error, so navigating away recovers
  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback({ error: this.state.error, reset: this.reset });
    return <ErrorFallback error={this.state.error} reset={this.reset} />;
  }
}

function ErrorFallback({ error, reset }) {
  return (
    <div className="eb-page" role="alert">
      <div className="eb-card">
        <div className="eb-icon" aria-hidden="true">!</div>
        <h1 className="eb-title">Something went wrong</h1>
        <p className="eb-text">
          This page hit an unexpected error. Your quiz progress is saved, so you can safely try again.
        </p>
        {import.meta.env.DEV && <pre className="eb-detail">{String(error?.message || error)}</pre>}
        <div className="eb-actions">
          <button className="eb-btn is-primary" onClick={reset}>Try again</button>
          <button className="eb-btn" onClick={() => window.location.assign('/dashboard')}>Go to dashboard</button>
        </div>
      </div>
    </div>
  );
}

// Route-level boundary: resets automatically when the user navigates
export function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}
