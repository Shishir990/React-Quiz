import { useState, useRef } from 'react';
import { bulkCreateQuestionsApi } from '../api/admin';
import { Icon } from '../Components/AppShell';
import { Modal } from './ui';
import { parseCSV, checkRows, templateCSV, downloadFile, MAX_IMPORT } from './csv';

const MAX_FILE_BYTES = 1024 * 1024;

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'ready', label: 'Ready' },
  { value: 'error', label: 'Errors' },
  { value: 'duplicate', label: 'Duplicates' },
];

const statusOf = (item) => (item.error ? 'error' : item.duplicate ? 'duplicate' : 'ready');

export default function ImportQuestions({ categories, existing, defaultCategory = '', onImported, onClose }) {
  const [category, setCategory] = useState(defaultCategory);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState(null); // parsed CSV, kept so a category change re-checks it
  const [fileError, setFileError] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const inputRef = useRef(null);

  const checked = rows ? checkRows(rows, { categories, defaultCategory: category, existing }) : null;
  const items = checked?.items || [];
  const counts = {
    all: items.length,
    ready: items.filter((i) => statusOf(i) === 'ready').length,
    error: items.filter((i) => i.error).length,
    duplicate: items.filter((i) => i.duplicate).length,
  };
  const toImport = items.filter((i) => !i.error && (!skipDuplicates || !i.duplicate));
  const shown = items.filter((i) => filter === 'all' || statusOf(i) === filter);
  const tooMany = toImport.length > MAX_IMPORT;

  const readFile = (file) => {
    setFileError('');
    setServerError('');
    setRows(null);
    setFilter('all');
    if (!file) return;
    setFileName(file.name);
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setFileError('Please choose a .csv file. In Excel or Google Sheets use "Save as / Download → CSV".');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError('That file is over 1 MB. Split it into smaller files.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCSV(String(reader.result));
      if (parsed.length < 2) setFileError('The file has no question rows under the header.');
      else setRows(parsed);
    };
    reader.onerror = () => setFileError("Couldn't read that file.");
    reader.readAsText(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    readFile(e.dataTransfer.files?.[0]);
  };

  const downloadTemplate = () => {
    const name = categories.find((c) => c._id === category)?.name || categories[0]?.name;
    downloadFile('questions-template.csv', templateCSV(name));
  };

  const runImport = async () => {
    setBusy(true);
    setServerError('');
    try {
      const res = await bulkCreateQuestionsApi(toImport.map((i) => i.data));
      onImported(res);
    } catch (err) {
      setServerError(err.message);
      setBusy(false);
    }
  };

  const reset = () => {
    setRows(null);
    setFileName('');
    setFileError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Modal
      title="Import questions from a spreadsheet"
      onClose={onClose}
      busy={busy}
      wide
      footer={
        <>
          {rows && <button className="ad-btn ad-btn-ghost ad-import-reset" onClick={reset} disabled={busy}>Choose another file</button>}
          <button className="ad-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="ad-btn ad-btn-primary"
            onClick={runImport}
            disabled={busy || !toImport.length || tooMany}
          >
            {busy ? 'Importing…' : `Import ${toImport.length || ''} ${toImport.length === 1 ? 'question' : 'questions'}`}
          </button>
        </>
      }
    >
      <div className="ad-import">
        {serverError && <div className="ad-alert">{serverError}</div>}

        {/* Step 1: template + default category */}
        <div className="ad-import-steps">
          <div className="ad-import-step">
            <span className="ad-import-num">1</span>
            <div>
              <p className="ad-import-step-title">Fill in the template</p>
              <p className="ad-muted">
                One question per row. <strong>correct</strong> is the letter (A–F) or the exact answer text.
                Difficulty and explanation are optional.
              </p>
              <button className="ad-link ad-link-btn" onClick={downloadTemplate}>
                <Icon name="arrow" size={13} /> Download template (.csv)
              </button>
            </div>
          </div>
          <div className="ad-import-step">
            <span className="ad-import-num">2</span>
            <div className="ad-import-step-body">
              <p className="ad-import-step-title">Category for rows without one</p>
              <select className="ad-input ad-input-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Use the category column only</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: file */}
        {!rows && (
          <label
            className={`ad-drop ${dragging ? 'is-dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input ref={inputRef} type="file" accept=".csv,text/csv,.txt" onChange={(e) => readFile(e.target.files?.[0])} hidden />
            <span className="ad-drop-icon"><Icon name="box" size={22} /></span>
            <span className="ad-drop-title">Drop your CSV here, or <u>browse</u></span>
            <span className="ad-muted">Up to {MAX_IMPORT} questions · CSV UTF-8 from Excel or Google Sheets</span>
            {fileName && fileError && <span className="ad-drop-file">{fileName}</span>}
          </label>
        )}
        {fileError && <div className="ad-alert">{fileError}</div>}

        {checked?.missingColumns.length > 0 && (
          <div className="ad-alert">
            Missing column{checked.missingColumns.length > 1 ? 's' : ''}: <strong>{checked.missingColumns.join(', ')}</strong>.
            The first row must be the header. Download the template to see the expected columns.
          </div>
        )}

        {/* Step 3: preview */}
        {items.length > 0 && (
          <div className="ad-import-preview">
            <div className="ad-import-summary">
              <p><strong>{fileName}</strong> · {items.length} {items.length === 1 ? 'row' : 'rows'}</p>
              <div className="ad-tabs" role="group" aria-label="Filter rows">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    className={`ad-tab ${filter === f.value ? 'is-active' : ''}`}
                    aria-pressed={filter === f.value}
                    onClick={() => setFilter(f.value)}
                  >
                    {f.label} <span className={`ad-tab-count is-${f.value}`}>{counts[f.value]}</span>
                  </button>
                ))}
              </div>
            </div>

            {counts.duplicate > 0 && (
              <label className="ad-check">
                <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
                Skip {counts.duplicate} {counts.duplicate === 1 ? 'question that already exists' : 'questions that already exist'} in the same category
              </label>
            )}
            {tooMany && <div className="ad-alert">That's {toImport.length} questions. Import at most {MAX_IMPORT} at a time.</div>}

            <div className="ad-table-wrap ad-import-table">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th scope="col">Row</th>
                    <th scope="col">Status</th>
                    <th scope="col">Question</th>
                    <th scope="col" className="ad-hide-sm">Answer</th>
                    <th scope="col" className="ad-hide-md">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((item) => {
                    const status = statusOf(item);
                    return (
                      <tr key={item.line} className={`is-${status}`}>
                        <td className="ad-muted">{item.line}</td>
                        <td className="ad-nowrap">
                          <span className={`ad-import-status is-${status}`}>
                            <Icon name={status === 'ready' ? 'check' : status === 'error' ? 'x' : 'ban'} size={13} />
                            {status === 'ready' ? 'Ready' : status === 'error' ? 'Error' : skipDuplicates ? 'Skipped' : 'Duplicate'}
                          </span>
                        </td>
                        <td>
                          <p className="ad-import-q">{item.text || <span className="ad-muted">(empty)</span>}</p>
                          {item.error && <p className="ad-import-err">{item.error}</p>}
                          {status === 'duplicate' && <p className="ad-import-dup">Already in this category</p>}
                        </td>
                        <td className="ad-hide-sm">{item.correctAnswer || <span className="ad-muted">—</span>}</td>
                        <td className="ad-hide-md ad-nowrap">{item.categoryName}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {shown.length === 0 && <p className="ad-import-none">No rows in this group.</p>}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
