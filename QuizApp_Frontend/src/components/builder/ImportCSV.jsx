import { useRef, useState } from 'react';
import { Icon } from '../ui';
import { checkQuizRows, downloadFile, parseCSV, quizTemplateCSV } from '../../utils/csv';
import { QUIZ_LIMITS } from '../../utils/userQuiz';

const MAX_FILE_BYTES = 512 * 1024;

// Questions from a spreadsheet, into the quiz being edited. Rows are checked in the
// browser and shown before anything is added; nothing is saved until "Save quiz".
//   current     how many questions the quiz has now
//   replaceable true when the quiz has only blank questions (they're swapped out)
//   onImport(questions, { replace, fileName })
export default function ImportCSV({ current, replaceable, onImport, onClose }) {
  const [fileName, setFileName] = useState('');
  const [checked, setChecked] = useState(null);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [replace, setReplace] = useState(replaceable);
  const inputRef = useRef(null);

  const items = checked?.items || [];
  const ready = items.filter((i) => !i.error);
  const errors = items.filter((i) => i.error);
  const room = QUIZ_LIMITS.MAX_QUESTIONS - (replace ? 0 : current);
  const toAdd = ready.slice(0, Math.max(0, room));
  const overLimit = ready.length > toAdd.length;

  const readFile = (file) => {
    setFileError('');
    setChecked(null);
    if (!file) return;
    setFileName(file.name);
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setFileError('Choose a .csv file. In Excel or Google Sheets use "Save as / Download → CSV".');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError('That file is over 512 KB. A quiz can only have 50 questions anyway.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result));
      if (rows.length < 2) {
        setFileError('The file has no question rows under the header.');
        return;
      }
      setChecked(checkQuizRows(rows, QUIZ_LIMITS));
    };
    reader.onerror = () => setFileError("Couldn't read that file.");
    reader.readAsText(file);
  };

  const reset = () => {
    setChecked(null);
    setFileName('');
    setFileError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const add = () => onImport(toAdd.map((i) => i.question), { replace, fileName });

  return (
    <section className="db-panel bd-card bd-import" aria-labelledby="bd-import-title">
      <div className="bd-import-head">
        <div>
          <h2 id="bd-import-title" className="db-section-title">Import questions from a CSV</h2>
          <p className="db-section-sub">
            One question per row. <strong>correct</strong> is the letter (A–F) or the exact answer text.
            The explanation is optional.
          </p>
        </div>
        <button type="button" className="bd-tool" onClick={onClose} aria-label="Close import">
          <Icon name="close" size={15} />
        </button>
      </div>

      <button type="button" className="bd-link" onClick={() => downloadFile('quiz-template.csv', quizTemplateCSV())}>
        <Icon name="download" size={14} /> Download the template
      </button>

      {!checked && (
        <label
          className={`bd-drop ${dragging ? 'is-dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer.files?.[0]); }}
        >
          <input ref={inputRef} type="file" accept=".csv,text/csv,.txt" onChange={(e) => readFile(e.target.files?.[0])} hidden />
          <span className="bd-drop-icon"><Icon name="box" size={20} /></span>
          <span className="bd-drop-title">Drop your CSV here, or <u>browse</u></span>
          <span className="db-section-sub">CSV UTF-8 from Excel or Google Sheets · up to {QUIZ_LIMITS.MAX_QUESTIONS} questions</span>
        </label>
      )}

      {fileError && <p className="lv-inline-error bd-import-error" role="alert">{fileError}</p>}

      {checked?.missingColumns.length > 0 && (
        <p className="lv-inline-error bd-import-error" role="alert">
          Missing column{checked.missingColumns.length > 1 ? 's' : ''}: <strong>{checked.missingColumns.join(', ')}</strong>.
          The first row must be the header; the template shows the columns.
        </p>
      )}

      {items.length > 0 && (
        <>
          <p className="bd-import-summary">
            <strong>{fileName}</strong>: {ready.length} ready
            {errors.length > 0 && <>, <span className="bd-bad">{errors.length} with problems (skipped)</span></>}
          </p>

          <ol className="bd-import-rows">
            {items.map((i) => (
              <li key={i.line} className={i.error ? 'is-error' : ''}>
                <span className="bd-import-line">Row {i.line}</span>
                <span className="bd-import-text">{i.text || <em>(no question)</em>}</span>
                {i.error
                  ? <span className="bd-import-status is-error">{i.error}</span>
                  : <span className="bd-import-status"><Icon name="check" size={13} /> {i.question.options.length} options</span>}
              </li>
            ))}
          </ol>

          {!replaceable && current > 0 && (
            <div className="pg-chips bd-import-mode" role="group" aria-label="What to do with the current questions">
              <button type="button" className={`pg-chip ${!replace ? 'is-active' : ''}`} aria-pressed={!replace} onClick={() => setReplace(false)}>
                Add after my {current} {current === 1 ? 'question' : 'questions'}
              </button>
              <button type="button" className={`pg-chip ${replace ? 'is-active' : ''}`} aria-pressed={replace} onClick={() => setReplace(true)}>
                Replace them
              </button>
            </div>
          )}
          {overLimit && (
            <p className="db-section-sub">
              A quiz holds up to {QUIZ_LIMITS.MAX_QUESTIONS} questions, so only the first {toAdd.length} will be added.
            </p>
          )}

          <div className="bd-import-actions">
            <button type="button" className="db-btn-ghost" onClick={reset}>Choose another file</button>
            <button type="button" className="db-btn-light" onClick={add} disabled={!toAdd.length}>
              <Icon name="plus" size={15} /> {replace ? 'Use' : 'Add'} {toAdd.length} {toAdd.length === 1 ? 'question' : 'questions'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
