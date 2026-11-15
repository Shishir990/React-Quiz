// Fails when the API and its documentation (Docs/openapi.yaml) disagree:
// a route the server has but the docs don't, or a documented route that no longer exists.
// Run: npm run docs:check
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// "/api/results" + "/:id" -> "/api/results/{id}"
const toOpenApi = (p) => p.replace(/\/$/, '').replace(/:(\w+)/g, '{$1}') || '/';
const METHOD = /(?:router|app)\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;

const actual = new Set();
const server = read('server.js');

// Routes defined directly on the app (e.g. /api/health)
for (const [, method, p] of server.matchAll(METHOD)) {
  if (p.startsWith('/api')) actual.add(`${method.toUpperCase()} ${toOpenApi(p)}`);
}

// Routers mounted with app.use('/api/x', require('./Routes/xRoutes'))
const MOUNT = /app\.use\(\s*['"](\/api\/[^'"]+)['"]\s*,\s*require\(\s*['"]\.\/Routes\/(\w+)['"]\s*\)\s*\)/g;
for (const [, prefix, file] of server.matchAll(MOUNT)) {
  const code = read(`Routes/${file}.js`);
  for (const [, method, p] of code.matchAll(METHOD)) {
    actual.add(`${method.toUpperCase()} ${toOpenApi(prefix + (p === '/' ? '' : p))}`);
  }
}

const spec = YAML.parse(read('Docs/openapi.yaml'));
const documented = new Set();
for (const [p, ops] of Object.entries(spec.paths || {})) {
  for (const method of Object.keys(ops)) {
    if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) documented.add(`${method.toUpperCase()} ${p}`);
  }
}

const missing = [...actual].filter((r) => !documented.has(r)).sort();
const stale = [...documented].filter((r) => !actual.has(r)).sort();

if (missing.length) console.error(`Not documented in Docs/openapi.yaml:\n  ${missing.join('\n  ')}`);
if (stale.length) console.error(`Documented but not served by the API:\n  ${stale.join('\n  ')}`);
if (missing.length || stale.length) process.exit(1);
console.log(`API docs match the server: ${actual.size} endpoints documented.`);
