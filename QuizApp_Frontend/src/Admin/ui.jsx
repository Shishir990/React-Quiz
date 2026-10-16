import { useEffect, useRef } from 'react';
import { Icon } from '../Components/AppShell';

// Centered dialog. Escape or a click on the backdrop closes it (unless busy).
export function Modal({ title, onClose, busy = false, wide = false, children, footer }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    // Focus the first field, or the dialog itself
    const first = panelRef.current?.querySelector('input, select, textarea, button:not(.ad-modal-x)');
    (first || panelRef.current)?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return (
    <div className="ad-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div
        ref={panelRef}
        className={`ad-modal ${wide ? 'is-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-modal-title"
        tabIndex={-1}
      >
        <div className="ad-modal-head">
          <h2 id="ad-modal-title">{title}</h2>
          <button className="ad-icon-btn ad-modal-x" onClick={onClose} disabled={busy} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="ad-modal-body">{children}</div>
        {footer && <div className="ad-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', danger = true, busy, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      busy={busy}
      footer={
        <>
          <button className="ad-btn" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={`ad-btn ${danger ? 'ad-btn-danger' : 'ad-btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="ad-confirm-text">{message}</p>
    </Modal>
  );
}

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

export function EmptyState({ icon, title, text, action }) {
  return (
    <div className="ad-empty">
      <span className="ad-empty-icon" aria-hidden="true">{icon}</span>
      <p className="ad-empty-title">{title}</p>
      {text && <p className="ad-empty-text">{text}</p>}
      {action}
    </div>
  );
}

export function SkeletonRows({ rows = 6 }) {
  return (
    <div className="ad-skeleton-list">
      {[...Array(rows)].map((_, i) => <div key={i} className="ad-skeleton" />)}
    </div>
  );
}
