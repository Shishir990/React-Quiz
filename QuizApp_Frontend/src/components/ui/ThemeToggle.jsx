import { useState } from 'react';
import { Icon } from './Icon';
import { getTheme, setTheme } from '../../theme';

// Light/dark switch for the top bars (see src/theme.js)
export function ThemeToggle({ className = '' }) {
  const [theme, setLocal] = useState(getTheme);
  const next = theme === 'dark' ? 'light' : 'dark';

  const toggle = () => {
    setTheme(next);
    setLocal(next);
  };

  const label = `Switch to ${next} mode`;
  return (
    <button type="button" className={`theme-toggle ${className}`} onClick={toggle} title={label} aria-label={label}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
    </button>
  );
}
