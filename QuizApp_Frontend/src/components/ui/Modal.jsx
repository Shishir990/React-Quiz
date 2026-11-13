import { useEffect, useRef } from 'react';
import { Icon } from './Icon';

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
