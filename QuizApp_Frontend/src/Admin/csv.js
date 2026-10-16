// CSV helpers for the bulk question import

export const MAX_IMPORT = 500;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
// Byte-order mark: Excel needs it to read UTF-8 symbols like π or ²
const BOM = String.fromCharCode(0xFEFF);

// Columns in the template, in order
const HEADERS = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'option_f', 'correct', 'explanation', 'difficulty', 'category'];

// Header spellings people are likely to use, mapped to our column names
const ALIASES = {
  question: 'question', text: 'question', 'question text': 'question',
  correct: 'correct', 'correct answer': 'correct', answer: 'correct', correct_answer: 'correct',
  explanation: 'explanation', why: 'explanation',
  difficulty: 'difficulty', level: 'difficulty',
  category: 'category', topic: 'category',
};
LETTERS.forEach((l, i) => {
  const key = `option_${l.toLowerCase()}`;
  [key, `option ${l.toLowerCase()}`, `option${l.toLowerCase()}`, `option ${i + 1}`, `option_${i + 1}`, `option${i + 1}`, l.toLowerCase()]
    .forEach((alias) => { ALIASES[alias] = key; });
});

// RFC 4180 CSV: quoted fields, "" escapes, commas and line breaks inside quotes.
// The delimiter (comma, semicolon or tab) is detected from the header line,
// since Excel uses semicolons in some regions.
export function parseCSV(input) {
  const text = input.startsWith(BOM) ? input.slice(1) : input;
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = [',', ';', '\t']
    .map((d) => [d, firstLine.split(d).length])
    .sort((a, b) => b[1] - a[1])[0][0];

  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row);
      row = []; field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  // Drop completely empty lines (e.g. trailing ones Excel adds)
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const csvCell = (value) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

// A ready-to-fill template. The BOM makes Excel read symbols like π or ² correctly.
export function templateCSV(categoryName = 'Science') {
  const rows = [
    HEADERS,
    ['What is the chemical symbol for water?', 'H2O', 'CO2', 'O2', 'NaCl', '', '', 'A', 'Two hydrogen atoms bonded to one oxygen atom.', 'easy', categoryName],
    ['Which planet is known as the Red Planet?', 'Venus', 'Mars', 'Jupiter', 'Saturn', '', '', 'Mars', '', 'medium', categoryName],
  ];
  return BOM + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function downloadFile(name, content, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Turn parsed CSV rows into checked import items.
 *   categories       all categories ({ _id, name })
 *   defaultCategory  id used when a row has no category column/value
 *   existing         current questions, to flag duplicates
 * Returns { items, missingColumns } where each item is
 *   { line, data?, error?, duplicate, categoryName }
 */
export function checkRows(rows, { categories, defaultCategory, existing }) {
  if (rows.length < 2) return { items: [], missingColumns: [], empty: true };

  const header = rows[0].map((h) => ALIASES[norm(h)] || null);
  const col = (name) => header.indexOf(name);
  const missingColumns = ['question', 'option_a', 'option_b', 'correct'].filter((c) => col(c) === -1);
  if (missingColumns.length) return { items: [], missingColumns };

  const byName = new Map(categories.map((c) => [norm(c.name), c]));
  const byId = new Map(categories.map((c) => [c._id, c]));
  const known = new Set(existing.map((q) => `${q.category?._id || q.category}|${norm(q.text)}`));
  const seenInFile = new Set();

  const items = rows.slice(1).map((cells, i) => {
    const line = i + 2; // spreadsheet row number (header is row 1)
    const get = (name) => (col(name) === -1 ? '' : String(cells[col(name)] ?? '').trim());

    const text = get('question');
    const options = LETTERS.map((l) => get(`option_${l.toLowerCase()}`)).filter(Boolean);
    const correctRaw = get('correct');
    const letterIndex = LETTERS.indexOf(correctRaw.toUpperCase());
    // "B" means option B; otherwise the cell must match an option's text
    const correctAnswer = correctRaw.length === 1 && letterIndex !== -1
      ? options[letterIndex] || ''
      : options.find((o) => norm(o) === norm(correctRaw)) || '';
    const difficulty = norm(get('difficulty')) || 'medium';
    const categoryCell = get('category');
    const category = categoryCell ? byName.get(norm(categoryCell)) : byId.get(defaultCategory);

    let error = null;
    if (!text) error = 'Question is empty';
    else if (options.length < 2) error = 'Needs at least two options';
    else if (new Set(options.map(norm)).size !== options.length) error = 'Two options are the same';
    else if (!correctRaw) error = 'Correct answer is empty';
    else if (!correctAnswer) error = `Correct answer "${correctRaw}" doesn't match an option`;
    else if (!DIFFICULTIES.includes(difficulty)) error = `Difficulty "${get('difficulty')}" should be easy, medium or hard`;
    else if (!category) error = categoryCell ? `No category named "${categoryCell}"` : 'Choose a category for rows without one';

    const key = category ? `${category._id}|${norm(text)}` : null;
    const duplicate = !error && (known.has(key) || seenInFile.has(key));
    if (key) seenInFile.add(key);

    return {
      line,
      error,
      duplicate,
      categoryName: category?.name || categoryCell || '—',
      text,
      correctAnswer,
      data: error ? null : {
        text, options, correctAnswer, difficulty,
        explanation: get('explanation'),
        category: category._id,
      },
    };
  });

  return { items, missingColumns: [] };
}
