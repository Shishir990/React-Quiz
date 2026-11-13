import { useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { createCategoryApi, updateCategoryApi, deleteCategoryApi } from '../../api/admin';
import { queryClient, adminKeys, useAdminCategories } from '../../api/queries';
import { shortTimeAgo } from '../../utils/format';
import { Icon, ConfirmDialog, EmptyState } from '../../components/ui';
import { CategoryForm } from '../../components/admin/CategoryForm';
import { CardMenu } from '../../components/admin/CardMenu';
import '../../styles/QuestionBank.css';

const STATUS = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'draft', label: 'Draft' },
];

// Latest change to the category or any of its questions (older APIs only send updatedAt)
const lastChange = (c) => c.lastActivity || c.updatedAt;

const SORTS = {
  name: { label: 'Name (A→Z)', fn: (a, b) => a.name.localeCompare(b.name) },
  nameDesc: { label: 'Name (Z→A)', fn: (a, b) => b.name.localeCompare(a.name) },
  questions: { label: 'Most questions', fn: (a, b) => (b.questionCount || 0) - (a.questionCount || 0) },
  updated: { label: 'Recently updated', fn: (a, b) => new Date(lastChange(b) || 0) - new Date(lastChange(a) || 0) },
};

function CategoryCard({ category: c, onEdit, onDelete }) {
  const total = c.questionCount || 0;
  const changed = lastChange(c);
  return (
    <article className="qb-card">
      <div className="qb-card-head">
        <span className="qb-card-icon" aria-hidden="true">{c.icon || '📁'}</span>
        <h2 className="qb-card-name">
          {/* Stretched link: the whole card opens the category */}
          <Link className="qb-card-link" to={`/admin/questions/category?id=${c._id}`}>{c.name}</Link>
        </h2>
        <div className="qb-card-menu">
          <CardMenu category={c} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>

      <div className="qb-card-foot">
        <span title={changed ? `Last updated ${new Date(changed).toLocaleString()}` : undefined}>
          <Icon name="clock" size={14} /> {changed ? shortTimeAgo(changed) : '—'}
        </span>
        <span className={total ? '' : 'is-empty'}>
          <Icon name="list" size={14} /> <strong>{total}</strong> {total === 1 ? 'question' : 'questions'}
        </span>
      </div>
    </article>
  );
}

export default function Categories() {
  const { toast, search: query, setSearch } = useOutletContext();
  const categoriesQuery = useAdminCategories();
  const categories = categoriesQuery.data ?? null;
  const error = categoriesQuery.isError ? categoriesQuery.error.message : '';
  const [params, setParams] = useSearchParams();
  // { category } or {} for new; ?newCategory=1 (from Overview) opens the form right away
  const [editing, setEditing] = useState(() => (params.get('newCategory') ? {} : null));

  const closeForm = () => {
    setEditing(null);
    if (params.has('newCategory')) {
      params.delete('newCategory');
      setParams(params, { replace: true });
    }
  };

  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('name');

  // No reload needed after saving: every admin change marks the cache stale
  // (see adminFetch), so fresh question counts are refetched automatically
  const save = async (data) => {
    if (editing.category) {
      await updateCategoryApi(editing.category._id, data);
      toast('Category updated');
    } else {
      await createCategoryApi(data);
      toast(`${data.name} created. Add some questions so players can start it.`);
    }
    closeForm();
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      const res = await deleteCategoryApi(deleting._id);
      queryClient.setQueryData(adminKeys.categories, (list) => list?.filter((c) => c._id !== deleting._id));
      toast(`${deleting.name} deleted${res.questionsDeleted ? ` with ${res.questionsDeleted} questions` : ''}`);
      setDeleting(null);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  const clearFilters = () => {
    setStatus('all');
    setSearch('');
  };

  const all = categories || [];
  const isLive = (c) => c.questionCount > 0;
  const liveCount = all.filter(isLive).length;
  const counts = { all: all.length, live: liveCount, draft: all.length - liveCount };
  const totalQuestions = all.reduce((s, c) => s + (c.questionCount || 0), 0);

  const q = query.trim().toLowerCase();
  const shown = all
    .filter((c) => status === 'all' || (status === 'live' ? isLive(c) : !isLive(c)))
    .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q))
    .sort(SORTS[sort].fn);

  return (
    <div className="qb-layout">
      <div className="qb-main">
        <div className="qb-head">
          <div>
            <h1 className="qb-title">Questions</h1>
            {categories && (
              <p className="qb-stats">
                <span><strong>{all.length}</strong> {all.length === 1 ? 'category' : 'categories'}</span>
                <span className="qb-sep" aria-hidden="true">·</span>
                <span><strong>{totalQuestions}</strong> {totalQuestions === 1 ? 'question' : 'questions'}</span>
                <span className="qb-sep" aria-hidden="true">·</span>
                <span><span className="qb-dot is-live" /><strong>{counts.live}</strong> live</span>
                <span className="qb-sep" aria-hidden="true">·</span>
                <span><span className="qb-dot" /><strong>{counts.draft}</strong> {counts.draft === 1 ? 'draft' : 'drafts'}</span>
                {shown.length !== all.length && (
                  <>
                    <span className="qb-sep" aria-hidden="true">·</span>
                    <span>showing <strong>{shown.length}</strong></span>
                  </>
                )}
              </p>
            )}
          </div>
          <button className="ad-btn ad-btn-primary" onClick={() => setEditing({})}>
            <Icon name="plus" size={15} /> New category
          </button>
        </div>

        <div className="qb-toolbar">
          <div className="qb-chips" role="group" aria-label="Filter by status">
            {STATUS.map((s) => (
              <button
                key={s.value}
                className={`qb-chip ${status === s.value ? 'is-active' : ''}`}
                aria-pressed={status === s.value}
                onClick={() => setStatus(s.value)}
              >
                {s.label} <span className="qb-chip-count">{categories ? counts[s.value] : '…'}</span>
              </button>
            ))}
          </div>
          <label className="qb-sort-wrap">
            <span>Sort</span>
            <select className="ad-input qb-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
            </select>
          </label>
        </div>

        {error && <div className="ad-alert">{error}</div>}

        {!categories && !error && (
          <div className="qb-grid" aria-hidden="true">
            {[...Array(9)].map((_, i) => <div key={i} className="qb-card qb-skeleton" />)}
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
              action={<button className="ad-btn" onClick={clearFilters}>Clear filters</button>} />
          </section>
        )}

        {shown.length > 0 && (
          <div className="qb-grid">
            {shown.map((c) => (
              <CategoryCard key={c._id} category={c} onEdit={() => setEditing({ category: c })} onDelete={() => setDeleting(c)} />
            ))}
          </div>
        )}

        {shown.length > 0 && (
          <p className="qb-hint">Click a card to open its questions. Use ⋯ to edit or delete a category.</p>
        )}
      </div>

      {editing && (
        <CategoryForm
          initial={editing.category
            ? { name: editing.category.name, icon: editing.category.icon || '', description: editing.category.description || '' }
            : { name: '', icon: '', description: '' }}
          isEdit={!!editing.category}
          onSave={save}
          onClose={closeForm}
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
    </div>
  );
}
