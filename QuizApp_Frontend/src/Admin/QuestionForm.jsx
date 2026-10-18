import { useState } from 'react';
import { Icon } from '../Components/AppShell';
import { Modal } from './ui';

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

function Form({ initial, categories, isEdit, onSave, onClose }) {
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

// Add or edit a question. Pass `question` to edit it; otherwise a new one
// starts in `defaultCategory`.
export default function QuestionForm({ question, defaultCategory = '', categories, onSave, onClose }) {
  return (
    <Form
      key={question?._id || 'new'}
      initial={question ? formFrom(question) : blankForm(defaultCategory)}
      categories={categories}
      isEdit={!!question}
      onSave={onSave}
      onClose={onClose}
    />
  );
}
