import { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import {
  getQuestionsApi, getAdminCategoriesApi,
  createQuestionApi, updateQuestionApi, deleteQuestionApi,
} from '../api/admin';
import { Icon } from '../Components/AppShell';
import { Modal, ConfirmDialog, EmptyState } from './ui';
import { categoryTints } from './tints';

const PAGE_SIZE = 15;
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const blankForm = (category = '') => ({
  category,
  difficulty: 'medium',
  text: '',
  options: ['', '', '', ''],
  correct: 0, // index into options
  explanation: '',
});

const formFrom = (q) => ({
  category: q.category?._id || q.category || '',
  difficulty: q.difficulty || 'medium',
  text: q.text,
  options: [...q.options],
  correct: Math.max(0, q.options.indexOf(q.correctAnswer)),
  explanation: q.explanation || '',
});

// Same checks as the server, so most mistakes show up before saving
function validate(form) {
  const options = form.options.map((o) => o.trim());
  if (!form.category) return 'Choose a category.';
  if (!form.text.trim()) return 'Write the question.';
  if (options.some((o) => !o)) return 'Fill in every option, or remove the empty ones.';
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return 'Two options are the same.';
  return null;
}

function QuestionForm({ initial, categories, isEdit, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setOption = (i, value) => setForm((f) => ({ ...f, options: f.options.map((o, j) => (j === i ? value : o)) }));
  const addOption = () => setForm((f) => ({ ...f, options: [...f.options, ''] }));
  const removeOption = (i) => setForm((f) => ({
    ...f,
    options: f.options.filter((_, j) => j !== i),
    // Keep the same option marked correct after the list shifts
    correct: f.correct === i ? 0 : f.correct > i ? f.correct - 1 : f.correct,
  }));

  const submit = async (addAnother) => {
    const problem = validate(form);
    if (problem) return setError(problem);
    setError('');
    setBusy(true);
    const options = form.options.map((o) => o.trim());
    try {
      await onSave({
        category: form.category,
        difficulty: form.difficulty,
        text: form.text.trim(),
        options,
        correctAnswer: options[form.correct],
        explanation: form.explanation.trim(),
      }, addAnother);
      // Keep category and difficulty so a batch of questions is quick to enter
      if (addAnother) setForm({ ...blankForm(form.category), difficulty: form.difficulty });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit question' : 'Add question'}
      onClose={onClose}
      busy={busy}
      wide
      footer={
        <>
          <button className="ad-btn" onClick={onClose} disabled={busy}>Cancel</button>
          {!isEdit && (
            <button className="ad-btn" onClick={() => submit(true)} disabled={busy}>Save &amp; add another</button>
          )}
          <button className="ad-btn ad-btn-primary" onClick={() => submit(false)} disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add question'}
          </button>
        </>
      }
    >
      <form className="ad-form" onSubmit={(e) => { e.preventDefault(); submit(false); }}>
        {error && <div className="ad-alert">{error}</div>}

        <div className="ad-form-row">
          <label className="ad-field">
            <span>Category</span>
            <select className="ad-input" value={form.category} onChange={set('category')}>
              <option value="" disabled>Choose a category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
            </select>
          </label>
          <div className="ad-field">
            <span id="q-difficulty">Difficulty</span>
            <div className="ad-segmented" role="radiogroup" aria-labelledby="q-difficulty">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={form.difficulty === d}
                  className={`ad-seg ad-seg-${d} ${form.difficulty === d ? 'is-active' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, difficulty: d }))}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="ad-field">
          <span>Question</span>
          <textarea className="ad-input" rows={3} value={form.text} onChange={set('text')} placeholder="e.g. What is the capital of Australia?" />
        </label>

        <fieldset className="ad-field ad-options">
          <legend>Options <small>Select the correct answer</small></legend>
          {form.options.map((opt, i) => (
            <div key={i} className={`ad-option ${form.correct === i ? 'is-correct' : ''}`}>
              <input
                type="radio"
                name="correct"
                checked={form.correct === i}
                onChange={() => setForm((f) => ({ ...f, correct: i }))}
                aria-label={`Option ${i + 1} is the correct answer`}
              />
              <input
                className="ad-input"
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                aria-label={`Option ${i + 1}`}
              />
              {form.correct === i && <span className="ad-option-tag">Correct</span>}
              <button
                type="button"
                className="ad-icon-btn"
                onClick={() => removeOption(i)}
                disabled={form.options.length <= MIN_OPTIONS}
                aria-label={`Remove option ${i + 1}`}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
          {form.options.length < MAX_OPTIONS && (
            <button type="button" className="ad-btn ad-btn-ghost ad-add-option" onClick={addOption}>
              <Icon name="plus" size={14} /> Add option
            </button>
          )}
        </fieldset>

        <label className="ad-field">
          <span>Explanation <small>Optional, shown to players when they review their answers</small></span>
          <textarea className="ad-input" rows={2} value={form.explanation} onChange={set('explanation')} />
        </label>
        {/* Lets Enter in a text input submit the form */}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

const SORTS = {
  newest: { label: 'Newest first', fn: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0) },
  oldest: { label: 'Oldest first', fn: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0) },
  az: { label: 'Question (A → Z)', fn: (a, b) => a.text.localeCompare(b.text) },
};

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default function Questions() {
  const { toast } = useOutletContext();
  const [params, setParams] = useSearchParams();

  const [questions, setQuestions] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(params.get('category') || '');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  // { question } to edit, {} to create, null when closed
  const [editing, setEditing] = useState(() => (params.get('new') ? {} : null));
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  // Start of the "added this week" window, fixed when the page opens
  const [weekAgo] = useState(() => Date.now() - WEEK);

  useEffect(() => {
    Promise.all([getQuestionsApi(), getAdminCategoriesApi()])
      .then(([qs, cats]) => {
        setQuestions(qs);
        setCategories(cats);
      })
      .catch((err) => setError(err.message));
  }, []);

  const closeForm = () => {
    setEditing(null);
    if (params.has('new')) {
      params.delete('new');
      setParams(params, { replace: true });
    }
  };

  // Any filter change goes back to the first page
  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const changeQuery = changeFilter(setQuery);
  const changeCategory = changeFilter(setCategory);
  const changeSort = changeFilter(setSort);

  const save = async (data, addAnother) => {
    if (editing?.question) {
      const updated = await updateQuestionApi(editing.question._id, data);
      setQuestions((list) => list.map((q) => (q._id === updated._id ? updated : q)));
      toast('Question updated');
      closeForm();
    } else {
      const created = await createQuestionApi(data);
      setQuestions((list) => [created, ...list]);
      toast(addAnother ? 'Question added. Ready for the next one.' : 'Question added');
      if (!addAnother) closeForm();
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await deleteQuestionApi(deleting._id);
      setQuestions((list) => list.filter((q) => q._id !== deleting._id));
      toast('Question deleted');
      setDeleting(null);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  const all = questions || [];
  const catId = (item) => item.category?._id || item.category;
  const tintOf = categoryTints(categories);
  const perCategory = all.reduce((m, item) => m.set(catId(item), (m.get(catId(item)) || 0) + 1), new Map());

  const q = query.trim().toLowerCase();
  const filtered = all
    .filter((item) => !category || catId(item) === category)
    .filter((item) => !q || item.text.toLowerCase().includes(q))
    .sort(SORTS[sort].fn);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PAGE_SIZE;
  const shown = filtered.slice(start, start + PAGE_SIZE);
  const hasFilters = q || category;

  const stats = [
    { label: 'Total Questions', value: all.length, icon: 'help', tone: 'blue' },
    { label: 'Categories Covered', value: `${perCategory.size} / ${categories.length}`, icon: 'folder', tone: 'teal' },
    { label: 'Added This Week', value: all.filter((item) => new Date(item.createdAt) >= weekAgo).length, icon: 'plus', tone: 'green' },
    { label: 'Missing Explanation', value: all.filter((item) => !item.explanation).length, icon: 'edit', tone: 'orange' },
  ];

  return (
    <>
      <div className="ad-hero">
        <div className="ad-hero-title">
          <span className="ad-hero-icon"><Icon name="help" size={22} /></span>
          <div>
            <h1 className="ad-title">Questions</h1>
            <p className="ad-subtitle">Build and maintain the quiz question bank.</p>
          </div>
        </div>
      </div>

      <div className="ad-kpis ad-kpis-wide">
        {stats.map((s) => (
          <div key={s.label} className={`ad-kpi tone-${s.tone}`}>
            <span className="ad-kpi-icon"><Icon name={s.icon} size={18} /></span>
            <div>
              <p className="ad-kpi-label">{s.label}</p>
              <p className="ad-kpi-value">{questions ? s.value : '…'}</p>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="ad-alert">{error}</div>}

      <div className="ad-filterbar">
        <label className="ad-search">
          <Icon name="search" size={15} />
          <input type="search" placeholder="Search questions..." value={query} onChange={(e) => changeQuery(e.target.value)} aria-label="Search questions" />
        </label>
        <label className="ad-labeled-select">
          <span>Category</span>
          <select className="ad-input ad-input-sm" value={category} onChange={(e) => changeCategory(e.target.value)}>
            <option value="">All categories ({questions ? all.length : '…'})</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.icon} {c.name} ({perCategory.get(c._id) || 0})</option>
            ))}
          </select>
        </label>
        <label className="ad-labeled-select">
          <span>Sort by</span>
          <select className="ad-input ad-input-sm" value={sort} onChange={(e) => changeSort(e.target.value)}>
            {Object.entries(SORTS).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
          </select>
        </label>
        <button className="ad-btn ad-btn-primary ad-filterbar-cta" onClick={() => setEditing({})} disabled={!categories.length}>
          <Icon name="plus" size={15} /> Add question
        </button>
      </div>

      {!questions && !error && (
        <div className="ad-qlist">
          {[...Array(6)].map((_, i) => <div key={i} className="ad-skeleton ad-q-skeleton" />)}
        </div>
      )}

      {questions && filtered.length === 0 && (
        <section className="ad-card">
          {hasFilters ? (
            <EmptyState icon="🔍" title="No questions match" text="Try a different search or category."
              action={<button className="ad-btn" onClick={() => { changeQuery(''); changeCategory(''); }}>Clear filters</button>} />
          ) : (
            <EmptyState icon="❓" title="No questions yet" text="Add the first question to get the quiz bank started."
              action={<button className="ad-btn ad-btn-primary" onClick={() => setEditing({})}><Icon name="plus" size={15} /> Add question</button>} />
          )}
        </section>
      )}

      {shown.length > 0 && (
        <ol className="ad-qlist" start={start + 1}>
          {shown.map((item, i) => {
            const cat = item.category;
            return (
              <li key={item._id} className="ad-qrow">
                <span className="ad-qrow-num">{start + i + 1}</span>
                <button className="ad-qrow-main" onClick={() => setEditing({ question: item })} aria-label={`Edit: ${item.text}`}>
                  <span className="ad-qrow-text">{item.text}</span>
                  <span className="ad-qrow-meta">
                    {cat?.name ? (
                      <span className="ad-qrow-cat">
                        <span className="ad-qrow-dot" style={{ background: tintOf.get(catId(item)) }} aria-hidden="true" />
                        {cat.name}
                      </span>
                    ) : (
                      <span className="ad-qrow-cat is-missing">No category</span>
                    )}
                    <span className="ad-qrow-sep" aria-hidden="true">·</span>
                    <span>{item.options.length} options</span>
                  </span>
                </button>
                <div className="ad-qrow-actions">
                  <button className="ad-icon-btn" onClick={() => setEditing({ question: item })} aria-label="Edit question" title="Edit">
                    <Icon name="edit" size={15} />
                  </button>
                  <button className="ad-icon-btn ad-icon-danger" onClick={() => setDeleting(item)} aria-label="Delete question" title="Delete">
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="ad-pager ad-pager-glass">
          <span className="ad-muted">
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div>
            <button className="ad-btn ad-btn-sm" onClick={() => setPage(current - 1)} disabled={current === 1}>Previous</button>
            <span className="ad-pager-page">Page {current} of {pages}</span>
            <button className="ad-btn ad-btn-sm" onClick={() => setPage(current + 1)} disabled={current === pages}>Next</button>
          </div>
        </div>
      )}

      {editing && categories.length > 0 && (
        <QuestionForm
          key={editing.question?._id || 'new'}
          initial={editing.question ? formFrom(editing.question) : blankForm(category || params.get('category') || '')}
          categories={categories}
          isEdit={!!editing.question}
          onSave={save}
          onClose={closeForm}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete this question?"
          message={`"${deleting.text}" will be removed from the bank. Past results keep their scores.`}
          busy={deleteBusy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
