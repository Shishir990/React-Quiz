import { useState } from 'react';
import { AuthIcon } from './AuthIcon';

// Labelled input with an optional icon, error text and show/hide for passwords

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
