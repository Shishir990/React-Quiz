import { AuthIcon } from './AuthIcon';

// Error or success message above a sign-in form

export function AuthAlert({ children, tone = 'error' }) {
  if (!children) return null;
  return (
    <div className={`au-alert ${tone === 'success' ? 'is-success' : ''}`} role={tone === 'success' ? 'status' : 'alert'}>
      <AuthIcon name={tone === 'success' ? 'check' : 'alert'} size={16} />
      <span>{children}</span>
    </div>
  );
}
