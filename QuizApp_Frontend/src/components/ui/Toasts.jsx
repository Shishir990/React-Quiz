import { Icon } from './Icon';

// Stack of short success/error messages

export function Toasts({ items, onDismiss }) {
  return (
    <div className="ad-toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`ad-toast ${t.type === 'error' ? 'is-error' : ''}`}>
          <Icon name={t.type === 'error' ? 'x' : 'check'} size={16} />
          <span>{t.message}</span>
          <button className="ad-toast-x" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
