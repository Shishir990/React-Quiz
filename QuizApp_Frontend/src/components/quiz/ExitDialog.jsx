import { useEffect } from "react";

// Leaving a quiz part-way: save it for later, or throw it away and restart

export function ExitDialog({ answered, total, onClose, onSave, onRestart }) {
  // Esc closes the dialog
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="qz-modal-backdrop" onClick={onClose}>
      <div
        className="qz-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qz-exit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="qz-exit-title" className="qz-modal-title">Leave this quiz?</h2>
        <p className="qz-modal-text">
          You've answered {answered} of {total}. Save your progress to pick up where you left off,
          or exit and start fresh next time.
        </p>

        <div className="qz-modal-actions">
          <button className="qz-modal-btn is-primary" onClick={onSave} autoFocus>
            Save &amp; exit
            <span>Answers and time are kept</span>
          </button>
          <button className="qz-modal-btn is-danger" onClick={onRestart}>
            Exit &amp; restart
            <span>Progress is cleared</span>
          </button>
        </div>

        <button className="qz-modal-cancel" onClick={onClose}>Keep playing</button>
      </div>
    </div>
  );
}
