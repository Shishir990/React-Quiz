import { useState } from 'react';
import { Icon, Modal } from '../ui';

const ICON_SUGGESTIONS = ['🧠', '🔬', '🌍', '📜', '⚽', '🎬', '🎵', '💻', '🧮', '📚', '🎨', '🍔', '🚀', '🐾', '💡', '🏛️'];

export function CategoryForm({ initial, isEdit, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name.trim()) return setError('Give the category a name.');
    setError('');
    setBusy(true);
    try {
      await onSave({ name: form.name.trim(), icon: form.icon.trim(), description: form.description.trim() });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit category' : 'New category'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button className="ad-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="ad-btn ad-btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create category'}
          </button>
        </>
      }
    >
      <form className="ad-form" onSubmit={submit}>
        {error && <div className="ad-alert">{error}</div>}

        <div className="ad-form-row ad-form-row-icon">
          <label className="ad-field ad-field-icon">
            <span>Icon</span>
            <input className="ad-input ad-icon-input" value={form.icon} onChange={set('icon')} maxLength={4} placeholder="🧠" />
          </label>
          <label className="ad-field">
            <span>Name</span>
            <input className="ad-input" value={form.name} onChange={set('name')} maxLength={60} placeholder="e.g. World History" />
          </label>
        </div>

        <div className="ad-icon-picks" role="group" aria-label="Suggested icons">
          {ICON_SUGGESTIONS.map((icon) => (
            <button
              key={icon}
              type="button"
              className={`ad-icon-pick ${form.icon === icon ? 'is-active' : ''}`}
              onClick={() => setForm((f) => ({ ...f, icon }))}
              aria-label={`Use ${icon}`}
              aria-pressed={form.icon === icon}
            >
              {icon}
            </button>
          ))}
        </div>

        <label className="ad-field">
          <span>Description <small>Optional</small></span>
          <textarea className="ad-input" rows={3} value={form.description} onChange={set('description')} />
        </label>
      </form>
    </Modal>
  );
}
