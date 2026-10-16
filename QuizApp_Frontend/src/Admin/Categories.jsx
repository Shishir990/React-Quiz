import { useState, useEffect, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { getAdminCategoriesApi, createCategoryApi, updateCategoryApi, deleteCategoryApi } from '../api/admin';
import { Icon } from '../Components/AppShell';
import { Modal, ConfirmDialog, EmptyState } from './ui';
import { categoryTints } from './tints';

const ICON_SUGGESTIONS = ['🧠', '🔬', '🌍', '📜', '⚽', '🎬', '🎵', '💻', '🧮', '📚', '🎨', '🍔', '🚀', '🐾', '💡', '🏛️'];

function CategoryForm({ initial, isEdit, onSave, onClose }) {
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

const STATUS = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'draft', label: 'Draft' },
];

const SORTS = {
  name: { label: 'Name (A → Z)', fn: (a, b) => a.name.localeCompare(b.name) },
  nameDesc: { label: 'Name (Z → A)', fn: (a, b) => b.name.localeCompare(a.name) },
  questions: { label: 'Most questions', fn: (a, b) => (b.questionCount || 0) - (a.questionCount || 0) },
  updated: { label: 'Recently updated', fn: (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0) },
};

// "⋮" menu on each card
function CardMenu({ category, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (fn) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="ad-menu" ref={ref}>
      <button
        className="ad-icon-btn ad-menu-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${category.name}`}
      >
        <Icon name="more" size={16} />
      </button>
      {open && (
        <div className="ad-dropdown ad-menu-list" role="menu">
          <button className="ad-dropdown-item" role="menuitem" onClick={pick(onEdit)}>
            <Icon name="edit" size={15} /> Edit category
          </button>
          <Link className="ad-dropdown-item" role="menuitem" to={`/admin/questions?category=${category._id}`}>
            <Icon name="quizzes" size={15} /> View questions
          </Link>
          <button className="ad-dropdown-item is-danger" role="menuitem" onClick={pick(onDelete)}>
            <Icon name="trash" size={15} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function Categories() {
  const { toast } = useOutletContext();
  const [categories, setCategories] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // { category } or {} for new
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('name');

  const load = () => getAdminCategoriesApi().then(setCategories).catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const save = async (data) => {
    if (editing.category) {
      await updateCategoryApi(editing.category._id, data);
      toast('Category updated');
    } else {
      await createCategoryApi(data);
      toast(`${data.name} created. Add some questions so players can start it.`);
    }
    setEditing(null);
    // Reload to get fresh question counts
    load();
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      const res = await deleteCategoryApi(deleting._id);
      setCategories((list) => list.filter((c) => c._id !== deleting._id));
      toast(`${deleting.name} deleted${res.questionsDeleted ? ` with ${res.questionsDeleted} questions` : ''}`);
      setDeleting(null);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  const all = categories || [];
  const isLive = (c) => c.questionCount > 0;
  const liveCount = all.filter(isLive).length;
  const counts = { all: all.length, live: liveCount, draft: all.length - liveCount };
  const totalQuestions = all.reduce((s, c) => s + (c.questionCount || 0), 0);

  const tintOf = categoryTints(all);

  const q = query.trim().toLowerCase();
  const shown = all
    .filter((c) => status === 'all' || (status === 'live' ? isLive(c) : !isLive(c)))
    .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q))
    .sort(SORTS[sort].fn);

  const stats = [
    { label: 'Total Categories', value: counts.all, icon: 'folder', tone: 'blue' },
    { label: 'Total Questions', value: totalQuestions, icon: 'help', tone: 'teal' },
    { label: 'Live Categories', value: counts.live, icon: 'check', tone: 'green' },
    { label: 'Draft / Empty', value: counts.draft, icon: 'box', tone: 'orange' },
  ];

  return (
    <>
      <div className="ad-hero">
        <div className="ad-hero-title">
          <span className="ad-hero-icon"><Icon name="quizzes" size={22} /></span>
          <div>
            <h1 className="ad-title">Categories</h1>
            <p className="ad-subtitle">Manage quiz topics and question banks.</p>
          </div>
        </div>
      </div>

      <div className="ad-kpis ad-kpis-wide">
        {stats.map((s) => (
          <div key={s.label} className={`ad-kpi tone-${s.tone}`}>
            <span className="ad-kpi-icon"><Icon name={s.icon} size={18} /></span>
            <div>
              <p className="ad-kpi-label">{s.label}</p>
              <p className="ad-kpi-value">{categories ? s.value : '…'}</p>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="ad-alert">{error}</div>}

      <div className="ad-filterbar">
        <label className="ad-search">
          <Icon name="search" size={15} />
          <input type="search" placeholder="Search categories..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search categories" />
        </label>
        <label className="ad-labeled-select">
          <span>Status</span>
          <select className="ad-input ad-input-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="ad-labeled-select">
          <span>Sort by</span>
          <select className="ad-input ad-input-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(SORTS).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
          </select>
        </label>
        <button className="ad-btn ad-btn-primary ad-filterbar-cta" onClick={() => setEditing({})}>
          <Icon name="plus" size={15} /> New category
        </button>
      </div>

      <div className="ad-chips" role="group" aria-label="Filter by status">
        {STATUS.map((s) => (
          <button
            key={s.value}
            className={`ad-chip ad-chip-${s.value} ${status === s.value ? 'is-active' : ''}`}
            aria-pressed={status === s.value}
            onClick={() => setStatus(s.value)}
          >
            {s.value !== 'all' && <span className="ad-chip-dot" />}
            {s.label} ({categories ? counts[s.value] : '…'})
          </button>
        ))}
      </div>

      {!categories && !error && (
        <div className="ad-cat-grid">
          {[...Array(8)].map((_, i) => <div key={i} className="ad-skeleton ad-cat-skeleton" />)}
        </div>
      )}

      {categories?.length === 0 && (
        <section className="ad-card">
          <EmptyState icon="📁" title="No categories yet" text="Create a category, then add questions to it."
            action={<button className="ad-btn ad-btn-primary" onClick={() => setEditing({})}><Icon name="plus" size={15} /> New category</button>} />
        </section>
      )}

      {categories?.length > 0 && shown.length === 0 && (
        <section className="ad-card">
          <EmptyState icon="🔍" title="No categories match" text="Try a different search or status."
            action={<button className="ad-btn" onClick={() => { setQuery(''); setStatus('all'); }}>Clear filters</button>} />
        </section>
      )}

      {shown.length > 0 && (
        <div className="ad-cat-grid">
          {shown.map((c) => {
            const total = c.questionCount || 0;
            return (
              <article key={c._id} className="ad-cat" style={{ '--tint': tintOf.get(c._id) }}>
                <div className="ad-cat-top">
                  <span className="ad-cat-icon" aria-hidden="true">{c.icon || '📁'}</span>
                  <CardMenu category={c} onEdit={() => setEditing({ category: c })} onDelete={() => setDeleting(c)} />
                </div>

                <h2 className="ad-cat-name">{c.name}</h2>

                <div className="ad-cat-tags">
                  {total > 0
                    ? <span className="ad-tag is-live"><span className="ad-chip-dot" /> Live</span>
                    : <span className="ad-tag is-draft"><span className="ad-chip-dot" /> Draft</span>}
                  <span className="ad-tag">{total} {total === 1 ? 'question' : 'questions'}</span>
                </div>

                <div className="ad-cat-foot">
                  <Link className="ad-btn ad-btn-xs" to={`/admin/questions?category=${c._id}`}>View questions</Link>
                  <Link
                    className="ad-btn ad-btn-primary ad-btn-square"
                    to={`/admin/questions?category=${c._id}&new=1`}
                    aria-label={`Add a question to ${c.name}`}
                    title="Add question"
                  >
                    <Icon name="plus" size={14} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <CategoryForm
          initial={editing.category
            ? { name: editing.category.name, icon: editing.category.icon || '', description: editing.category.description || '' }
            : { name: '', icon: '', description: '' }}
          isEdit={!!editing.category}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          message={deleting.questionCount
            ? `This also permanently deletes its ${deleting.questionCount} ${deleting.questionCount === 1 ? 'question' : 'questions'}. Players' past results keep their scores but will show "Deleted category".`
            : "The category has no questions. Players' past results keep their scores."}
          confirmLabel={deleting.questionCount ? `Delete category and ${deleting.questionCount} questions` : 'Delete category'}
          busy={deleteBusy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
