import { useState, useEffect } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import {
  getQuestionsApi, getAdminCategoriesApi,
  createQuestionApi, updateQuestionApi, deleteQuestionApi,
} from '../api/admin';
import { Icon } from '../Components/AppShell';
import { ConfirmDialog, EmptyState } from './ui';
import { categoryTints } from './tints';
import QuestionForm from './QuestionForm';
import ImportQuestions from './ImportQuestions';
import '../Styles/Quiz.css';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const byCreated = (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0);

// One category's questions, laid out like the player's quiz screen:
// one question at a time with a numbered palette, or the whole paper at once
export default function CategoryQuestions() {
  const { categoryId } = useParams();
  const { toast } = useOutletContext();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [questions, setQuestions] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  const [index, setIndex] = useState(0);
  const [paperView, setPaperView] = useState(false);
  const [showAnswers, setShowAnswers] = useState(true);

  // { question } to edit, {} to create, null when closed
  const [editing, setEditing] = useState(() => (params.get('new') ? {} : null));
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = () => Promise.all([getQuestionsApi(categoryId), getAdminCategoriesApi()])
    .then(([qs, cats]) => {
      setQuestions([...qs].sort(byCreated));
      setCategories(cats);
    })
    .catch((err) => setError(err.message));

  // Reload only when switching category; `load` itself is recreated every render
  useEffect(() => {
    load();
  }, [categoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const all = questions || [];
  const total = all.length;
  const current = Math.min(index, Math.max(total - 1, 0));
  const question = all[current];

  // ← / → move between questions (not while a dialog is open)
  useEffect(() => {
    if (paperView || editing || importing || deleting) return;
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, total - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paperView, editing, importing, deleting, total]);

  const category = categories.find((c) => c._id === categoryId);
  const tint = categoryTints(categories).get(categoryId) || '#ECFDF5';
  const notFound = questions && categories.length > 0 && !category;

  const goTo = (i) => {
    setIndex(i);
    if (paperView) document.getElementById(`paper-q-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const closeForm = () => {
    setEditing(null);
    if (params.has('new')) {
      params.delete('new');
      setParams(params, { replace: true });
    }
  };

  const save = async (data, addAnother) => {
    const inThisCategory = String(data.category) === categoryId;
    if (editing?.question) {
      const updated = await updateQuestionApi(editing.question._id, data);
      // Moving a question to another category removes it from this page
      setQuestions((list) => (inThisCategory
        ? list.map((q) => (q._id === updated._id ? updated : q))
        : list.filter((q) => q._id !== updated._id)));
      toast(inThisCategory ? 'Question updated' : `Question moved to ${categories.find((c) => c._id === String(data.category))?.name || 'another category'}`);
      closeForm();
    } else {
      const created = await createQuestionApi(data);
      if (inThisCategory) {
        setQuestions((list) => [...list, created]);
        setIndex(total); // show the new question
      }
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

  const finishImport = (res) => {
    setImporting(false);
    toast(res.errors?.length
      ? `${res.created} questions imported, ${res.errors.length} rejected by the server`
      : `${res.created} ${res.created === 1 ? 'question' : 'questions'} imported`);
    load();
  };

  if (notFound) {
    return (
      <section className="ad-card ad-qv-missing">
        <EmptyState icon="📁" title="Category not found" text="It may have been deleted."
          action={<Link className="ad-btn" to="/admin/questions">Back to all categories</Link>} />
      </section>
    );
  }

  const progress = total ? Math.round(((current + 1) / total) * 100) : 0;
  const timeLimit = `${Math.floor((total * 10) / 60)}m ${(total * 10) % 60}s`;

  return (
    <div className="qz-page ad-qv">
      <header className="qz-header">
        <div className="qz-header-row">
          <div className="qz-brand">
            <div className="qz-brand-icon" style={{ background: tint }} aria-hidden="true">{category?.icon || '📁'}</div>
            <div>
              <p className="qz-brand-name">{category?.name || 'Loading…'}</p>
              <p className="qz-brand-sub">QuizApp Admin · {total} {total === 1 ? 'question' : 'questions'} · {timeLimit} time limit</p>
            </div>
          </div>

          <div className="qz-header-actions">
            <button className="ad-qv-btn" onClick={() => setImporting(true)} disabled={!category || !questions}>
              <Icon name="box" size={15} /> <span>Import CSV</span>
            </button>
            <button className="ad-qv-btn is-primary" onClick={() => setEditing({})} disabled={!category}>
              <Icon name="plus" size={15} /> <span>Add question</span>
            </button>
            <button className="qz-close" onClick={() => navigate('/admin/questions')} aria-label="Back to all categories" title="Back to all categories">
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>

        {!paperView && total > 0 && (
          <>
            <div className="qz-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Position in question list">
              <div className="qz-progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <div className="qz-progress-meta">
              <span>Question {current + 1} of {total}</span>
              <span className="qz-progress-pct">{progress}% through</span>
            </div>
          </>
        )}
        {paperView && (
          <div className="qz-progress-meta ad-qv-paper-meta">
            <span>Full question paper · {total} questions</span>
            <button className="ad-qv-link" onClick={() => window.print()} disabled={!total}>
              <Icon name="quizzes" size={14} /> Print
            </button>
          </div>
        )}
      </header>

      {error && <div className="ad-alert ad-qv-alert">{error}</div>}

      <div className="qz-layout">
        <main className="qz-body">
          {!questions && !error && (
            <div className="ad-qv-loading">
              <div className="ad-skeleton" style={{ height: 28, width: '70%' }} />
              {[0, 1, 2, 3].map((i) => <div key={i} className="ad-skeleton" style={{ height: 56 }} />)}
            </div>
          )}

          {questions && total === 0 && (
            <div className="ad-qv-empty">
              <EmptyState icon="❓" title="No questions yet" text="Players can't start this category until it has questions."
                action={
                  <div className="ad-head-actions">
                    <button className="ad-btn" onClick={() => setImporting(true)}><Icon name="box" size={15} /> Import CSV</button>
                    <button className="ad-btn ad-btn-primary" onClick={() => setEditing({})}><Icon name="plus" size={15} /> Add question</button>
                  </div>
                } />
            </div>
          )}

          {/* One question at a time */}
          {!paperView && question && (
            <>
              <section className="qz-question" aria-labelledby="ad-qv-text">
                <div className="ad-qv-eyebrow-row">
                  <p className="qz-eyebrow">Question {String(current + 1).padStart(2, '0')}</p>
                  <div className="ad-qv-tools">
                    <button className="ad-qv-tool" onClick={() => setEditing({ question })}>
                      <Icon name="edit" size={14} /> Edit
                    </button>
                    <button className="ad-qv-tool is-danger" onClick={() => setDeleting(question)}>
                      <Icon name="trash" size={14} /> Delete
                    </button>
                  </div>
                </div>
                <h1 id="ad-qv-text" className="qz-question-text">{question.text}</h1>
                <p className="qz-hint">
                  {showAnswers ? 'The correct answer is highlighted.' : `${question.options.length} options`}
                </p>

                <div className="qz-options" aria-label="Options">
                  {question.options.map((opt, i) => {
                    const correct = showAnswers && opt === question.correctAnswer;
                    return (
                      <div key={i} className={`qz-option ${correct ? 'is-selected' : ''}`}>
                        <span className="qz-option-letter">{LETTERS[i]}</span>
                        <span className="qz-option-text">{opt}</span>
                        {correct && (
                          <span className="ad-qv-correct"><Icon name="check" size={16} /> Correct answer</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {showAnswers && (
                  question.explanation ? (
                    <p className="ad-qv-explain"><strong>Explanation:</strong> {question.explanation}</p>
                  ) : (
                    <p className="ad-qv-explain is-missing">
                      No explanation yet.{' '}
                      <button className="ad-qv-link" onClick={() => setEditing({ question })}>Add one</button>
                    </p>
                  )
                )}
              </section>

              <div className="qz-footer">
                <button className="qz-prev" onClick={() => setIndex(current - 1)} disabled={current === 0}>
                  <Icon name="back" size={16} /> Previous
                </button>
                {current < total - 1 ? (
                  <button className="qz-next" onClick={() => setIndex(current + 1)}>
                    Next question <Icon name="arrow" size={16} />
                  </button>
                ) : (
                  <button className="qz-next" onClick={() => setEditing({})}>
                    <Icon name="plus" size={16} /> Add question
                  </button>
                )}
              </div>
            </>
          )}

          {/* Whole paper at once */}
          {paperView && total > 0 && (
            <ol className="ad-paper-list ad-qv-paper">
              {all.map((item, i) => (
                <li key={item._id} id={`paper-q-${i}`} className={`ad-paper-q ${i === current ? 'is-current' : ''}`}>
                  <div className="ad-paper-q-head">
                    <p className="ad-paper-q-text"><span className="ad-paper-q-num">{i + 1}.</span> {item.text}</p>
                    <button className="ad-icon-btn ad-paper-edit" onClick={() => setEditing({ question: item })} aria-label={`Edit question ${i + 1}`} title="Edit">
                      <Icon name="edit" size={14} />
                    </button>
                  </div>
                  <ul className="ad-paper-options">
                    {item.options.map((opt, j) => {
                      const correct = showAnswers && opt === item.correctAnswer;
                      return (
                        <li key={j} className={correct ? 'is-correct' : ''}>
                          <span className="ad-paper-letter">{LETTERS[j]}</span>
                          <span>{opt}</span>
                          {correct && <Icon name="check" size={14} />}
                        </li>
                      );
                    })}
                  </ul>
                  {showAnswers && item.explanation && (
                    <p className="ad-paper-explain"><strong>Explanation:</strong> {item.explanation}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </main>

        {/* Palette */}
        <aside className="qz-palette ad-qv-palette" aria-label="Question palette">
          <div className="qz-palette-head">
            <p className="qz-palette-title">Questions</p>
            <span className="qz-palette-count">{total} total</span>
          </div>

          <div className="qz-palette-grid">
            {all.map((item, i) => (
              <button
                key={item._id}
                className={`qz-palette-btn ${i === current ? 'is-current' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Question ${i + 1}`}
                aria-current={i === current ? 'step' : undefined}
                title={item.text}
              >
                {i + 1}
              </button>
            ))}
            <button className="qz-palette-btn ad-qv-add" onClick={() => setEditing({})} disabled={!category} aria-label="Add question" title="Add question">
              <Icon name="plus" size={16} />
            </button>
          </div>

          <div className="ad-qv-options">
            <label className="ad-switch">
              <input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} />
              <span className="ad-switch-track" aria-hidden="true" />
              Show answers
            </label>
          </div>

          <button className="qz-palette-submit" onClick={() => setPaperView((v) => !v)} disabled={!total}>
            {paperView ? 'View one by one' : 'View full question paper'}
          </button>
        </aside>
      </div>

      {editing && categories.length > 0 && (
        <QuestionForm
          question={editing.question}
          defaultCategory={categoryId}
          categories={categories}
          onSave={save}
          onClose={closeForm}
        />
      )}

      {importing && (
        <ImportQuestions
          categories={categories}
          existing={all}
          defaultCategory={categoryId}
          onImported={finishImport}
          onClose={() => setImporting(false)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete this question?"
          message={`"${deleting.text}" will be removed from ${category?.name || 'this category'}. Past results keep their scores.`}
          busy={deleteBusy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
