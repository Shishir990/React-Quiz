import { useState } from 'react';
import { Icon } from './Icon';

// Light/dark switch. The chosen theme lives on <html data-theme> (set before
// first paint by the script in index.html) and in localStorage.
const STORAGE_KEY = 'theme';

const currentTheme = () =>
  document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

export function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(currentTheme);
  const next = theme === 'dark' ? 'light' : 'dark';

  const toggle = () => {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode: still switches for this visit */ }
    setTheme(next);
  };

  const label = `Switch to ${next} mode`;
  return (
    <button type="button" className={`theme-toggle ${className}`} onClick={toggle} title={label} aria-label={label}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  );
}
