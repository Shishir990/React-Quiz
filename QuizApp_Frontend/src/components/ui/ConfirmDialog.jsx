import { Modal } from './Modal';

// Yes/no dialog for destructive or important actions

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
