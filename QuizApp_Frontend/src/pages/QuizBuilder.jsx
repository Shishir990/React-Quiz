import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AppShell from '../components/layout/AppShell';
import { Icon } from '../components/ui';
import { queryKeys, useUserQuizzes } from '../api/queries';
import { deleteUserQuizApi } from '../api/userQuizzes';
import { QUIZ_LIMITS } from '../utils/userQuiz';
import '../styles/Dashboard.css';
import '../styles/Builder.css';

const updatedLabel = (date) => new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

// The quizzes this player wrote: edit them, host one live, or delete
export default function QuizBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: quizzes = [], isPending, error } = useUserQuizzes();
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');

  const remove = async (id) => {
    setBusy(id);
    setMessage('');
    try {
      await deleteUserQuizApi(id);
      queryClient.setQueryData(queryKeys.userQuizzes, (list = []) => list.filter((q) => q._id !== id));
      queryClient.removeQueries({ queryKey: queryKeys.userQuiz(id) });
      setConfirming(null);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(null);
    }
  };

  const full = quizzes.length >= QUIZ_LIMITS.MAX_QUIZZES;

  return (
    <AppShell title="Quiz builder">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">Quiz builder</h1>
          <p className="db-section-sub">Write your own quizzes and host them as live games for friends.</p>
        </div>
        <button className="db-btn-light" onClick={() => navigate('/builder/edit')} disabled={full} title={full ? `Up to ${QUIZ_LIMITS.MAX_QUIZZES} quizzes` : undefined}>
          <Icon name="plus" size={15} /> New quiz
        </button>
      </div>

      {(error || message) && <div className="db-error-msg bd-msg" role="alert">{message || error.message}</div>}

      {isPending ? (
        <div className="bd-grid" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="db-panel bd-card bd-skeleton" />)}
        </div>
      ) : !error && quizzes.length === 0 ? (
        <section className="db-panel bd-empty">
          <span className="bd-empty-icon"><Icon name="edit" size={22} /></span>
          <p className="db-empty-title">No quizzes yet</p>
          <p className="db-empty-text">
            Write questions on any topic, then host the quiz live: everyone answers at the same time.
          </p>
          <button className="db-btn-light" onClick={() => navigate('/builder/edit')}>
            <Icon name="plus" size={15} /> Create your first quiz
          </button>
        </section>
      ) : (
        <div className="bd-grid">
          {quizzes.map((q) => (
            <article key={q._id} className="db-panel bd-card">
              <div className="bd-card-body">
                <h2 className="bd-card-title">{q.title}</h2>
                {q.description && <p className="db-section-sub bd-card-desc">{q.description}</p>}
                <p className="bd-card-meta">
                  {q.questionCount} {q.questionCount === 1 ? 'question' : 'questions'} · edited {updatedLabel(q.updatedAt)}
                </p>
              </div>

              {confirming === q._id ? (
                <div className="bd-confirm" role="alertdialog" aria-label={`Delete ${q.title}?`}>
                  <p>Delete this quiz? This can&apos;t be undone.</p>
                  <div className="bd-card-actions">
                    <button className="db-btn-ghost" onClick={() => setConfirming(null)} disabled={busy === q._id} autoFocus>Cancel</button>
                    <button className="db-btn-light bd-danger" onClick={() => remove(q._id)} disabled={busy === q._id}>
                      {busy === q._id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bd-card-actions">
                  <button className="db-btn-light" onClick={() => navigate(`/live?host=${q._id}`)} disabled={q.questionCount < QUIZ_LIMITS.MIN_QUESTIONS}>
                    <Icon name="play" size={15} /> Host live
                  </button>
                  <button className="db-btn-ghost" onClick={() => navigate(`/builder/edit?id=${q._id}`)}>
                    <Icon name="edit" size={15} /> Edit
                  </button>
                  <button className="db-btn-ghost bd-icon-btn" onClick={() => setConfirming(q._id)} aria-label={`Delete ${q.title}`}>
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
