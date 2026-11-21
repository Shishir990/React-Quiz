import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AppShell from '../components/layout/AppShell';
import { Icon } from '../components/ui';
import { queryKeys, useUserQuiz } from '../api/queries';
import { createUserQuizApi, updateUserQuizApi } from '../api/userQuizzes';
import { QUIZ_LIMITS, blankQuestion, blankQuiz, editorQuiz, quizPayload, quizProblem } from '../utils/userQuiz';
import '../styles/Dashboard.css';
import '../styles/Builder.css';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Write a new quiz, or edit one (?id=). Saving returns to the builder list.
export default function QuizEditor() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const { data: saved, isPending, error: loadError } = useUserQuiz(id);

  if (id && isPending) {
    return <Frame title="Edit quiz"><div className="db-panel bd-card bd-skeleton bd-skeleton-tall" aria-busy="true" /></Frame>;
  }
  if (id && loadError) {
    return <Frame title="Edit quiz"><div className="db-error-msg" role="alert">{loadError.message}</div></Frame>;
  }
  // Keyed by id so opening another quiz starts from its own saved copy
  return <Editor key={id || 'new'} id={id} initial={saved ? editorQuiz(saved) : blankQuiz()} />;
}

function Frame({ title, children }) {
  return (
    <AppShell title="Quiz builder">
      <div className="pg-head"><h1 className="pg-title">{title}</h1></div>
      {children}
    </AppShell>
  );
}

function Editor({ id, initial }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);
  const [problem, setProblem] = useState(null);
  const [busy, setBusy] = useState(false);
  const dirty = useRef(false);
  const questionRefs = useRef({});
  const L = QUIZ_LIMITS;

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    const onLeave = (e) => {
      if (!dirty.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, []);

  const update = (fn) => {
    dirty.current = true;
    setProblem(null);
    setForm(fn);
  };
  const setQuestion = (i, changes) => update((f) => ({
    ...f,
    questions: f.questions.map((q, j) => (j === i ? { ...q, ...changes } : q)),
  }));
  const setOption = (i, k, value) => update((f) => ({
    ...f,
    questions: f.questions.map((q, j) => (j === i ? { ...q, options: q.options.map((o, m) => (m === k ? value : o)) } : q)),
  }));
  const addOption = (i) => update((f) => ({
    ...f,
    questions: f.questions.map((q, j) => (j === i ? { ...q, options: [...q.options, ''] } : q)),
  }));
  const removeOption = (i, k) => update((f) => ({
    ...f,
    questions: f.questions.map((q, j) => (j !== i ? q : {
      ...q,
      options: q.options.filter((_, m) => m !== k),
      // Keep the same option marked correct after the list shifts
      correct: q.correct === k ? 0 : q.correct > k ? q.correct - 1 : q.correct,
    })),
  }));
  const addQuestion = () => {
    update((f) => ({ ...f, questions: [...f.questions, blankQuestion()] }));
    // Scroll to the new question once it's on the page
    setTimeout(() => {
      const keys = Object.keys(questionRefs.current);
      questionRefs.current[keys[keys.length - 1]]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };
  const removeQuestion = (i) => update((f) => ({ ...f, questions: f.questions.filter((_, j) => j !== i) }));
  const moveQuestion = (i, by) => update((f) => {
    const questions = [...f.questions];
    const [q] = questions.splice(i, 1);
    questions.splice(i + by, 0, q);
    return { ...f, questions };
  });

  const save = async (e) => {
    e.preventDefault();
    const found = quizProblem(form);
    if (found) {
      setProblem(found);
      const q = form.questions[found.question];
      if (q) questionRefs.current[q.key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setBusy(true);
    try {
      const payload = quizPayload(form);
      const result = id ? await updateUserQuizApi(id, payload) : await createUserQuizApi(payload);
      dirty.current = false;
      queryClient.setQueryData(queryKeys.userQuiz(result._id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.userQuizzes, exact: true });
      navigate('/builder');
    } catch (err) {
      setProblem({ message: err.message, question: -1 });
      setBusy(false);
    }
  };

  const cancel = () => {
    if (dirty.current && !window.confirm('Discard your changes?')) return;
    dirty.current = false;
    navigate('/builder');
  };

  return (
    <AppShell title="Quiz builder">
      <form onSubmit={save} noValidate>
        <div className="pg-head">
          <div>
            <h1 className="pg-title">{id ? 'Edit quiz' : 'New quiz'}</h1>
            <p className="db-section-sub">Pick the correct option with the circle next to it.</p>
          </div>
          <div className="pg-head-actions">
            <button type="button" className="db-btn-ghost" onClick={cancel} disabled={busy}>Cancel</button>
            <button type="submit" className="db-btn-light" disabled={busy}>
              <Icon name="check" size={15} /> {busy ? 'Saving…' : 'Save quiz'}
            </button>
          </div>
        </div>

        {problem && <div className="db-error-msg bd-msg" role="alert">{problem.message}</div>}

        <section className="db-panel bd-card bd-details">
          <label className="bd-label" htmlFor="bd-title">Title</label>
          <input
            id="bd-title"
            className="bd-input"
            value={form.title}
            onChange={(e) => { const value = e.target.value; update((x) => ({ ...x, title: value })); }}
            maxLength={L.TITLE}
            placeholder="e.g. Friday office trivia"
            aria-invalid={problem?.question === -1 && !form.title.trim()}
          />
          <label className="bd-label" htmlFor="bd-desc">Description <span className="bd-optional">optional</span></label>
          <textarea
            id="bd-desc"
            className="bd-input"
            rows={2}
            value={form.description}
            onChange={(e) => { const value = e.target.value; update((x) => ({ ...x, description: value })); }}
            maxLength={L.DESCRIPTION}
            placeholder="What is it about?"
          />
        </section>

        <ol className="bd-questions">
          {form.questions.map((q, i) => (
            <li
              key={q.key}
              ref={(el) => { if (el) questionRefs.current[q.key] = el; else delete questionRefs.current[q.key]; }}
              className={`db-panel bd-card bd-question ${problem?.question === i ? 'has-problem' : ''}`}
            >
              <div className="bd-question-head">
                <span className="bd-question-num">Question {i + 1}</span>
                <div className="bd-question-tools">
                  <button type="button" className="bd-tool" onClick={() => moveQuestion(i, -1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`}>
                    <span className="bd-arrow is-up"><Icon name="chevron" size={15} /></span>
                  </button>
                  <button type="button" className="bd-tool" onClick={() => moveQuestion(i, 1)} disabled={i === form.questions.length - 1} aria-label={`Move question ${i + 1} down`}>
                    <span className="bd-arrow"><Icon name="chevron" size={15} /></span>
                  </button>
                  <button type="button" className="bd-tool" onClick={() => removeQuestion(i)} disabled={form.questions.length <= L.MIN_QUESTIONS} aria-label={`Remove question ${i + 1}`} title={form.questions.length <= L.MIN_QUESTIONS ? `A quiz needs at least ${L.MIN_QUESTIONS} questions` : undefined}>
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </div>

              <textarea
                className="bd-input bd-question-text"
                rows={2}
                value={q.text}
                onChange={(e) => setQuestion(i, { text: e.target.value })}
                maxLength={L.TEXT}
                placeholder="Write the question"
                aria-label={`Question ${i + 1}`}
              />

              <fieldset className="bd-options">
                <legend className="bd-label">Options</legend>
                {q.options.map((o, k) => (
                  <div key={k} className={`bd-option ${q.correct === k ? 'is-correct' : ''}`}>
                    <input
                      type="radio"
                      name={`correct-${q.key}`}
                      checked={q.correct === k}
                      onChange={() => setQuestion(i, { correct: k })}
                      aria-label={`Option ${LETTERS[k]} is correct`}
                    />
                    <span className="bd-option-letter" aria-hidden="true">{LETTERS[k]}</span>
                    <input
                      className="bd-input"
                      value={o}
                      onChange={(e) => setOption(i, k, e.target.value)}
                      maxLength={L.OPTION}
                      placeholder={`Option ${LETTERS[k]}`}
                      aria-label={`Question ${i + 1}, option ${LETTERS[k]}`}
                    />
                    {q.correct === k && <span className="bd-correct-tag">Correct</span>}
                    <button
                      type="button"
                      className="bd-tool"
                      onClick={() => removeOption(i, k)}
                      disabled={q.options.length <= L.MIN_OPTIONS}
                      aria-label={`Remove option ${LETTERS[k]}`}
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
                {q.options.length < L.MAX_OPTIONS && (
                  <button type="button" className="bd-add-option" onClick={() => addOption(i)}>
                    <Icon name="plus" size={14} /> Add option
                  </button>
                )}
              </fieldset>

              <label className="bd-label" htmlFor={`bd-exp-${q.key}`}>Explanation <span className="bd-optional">optional, shown after the answer</span></label>
              <input
                id={`bd-exp-${q.key}`}
                className="bd-input"
                value={q.explanation}
                onChange={(e) => setQuestion(i, { explanation: e.target.value })}
                maxLength={L.EXPLANATION}
                placeholder="Why is that the answer?"
              />
            </li>
          ))}
        </ol>

        <div className="bd-footer">
          <button type="button" className="db-btn-ghost" onClick={addQuestion} disabled={form.questions.length >= L.MAX_QUESTIONS}>
            <Icon name="plus" size={15} /> Add question
          </button>
          <span className="db-section-sub">{form.questions.length} of {L.MAX_QUESTIONS} questions</span>
          <button type="submit" className="db-btn-light bd-footer-save" disabled={busy}>
            <Icon name="check" size={15} /> {busy ? 'Saving…' : 'Save quiz'}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
