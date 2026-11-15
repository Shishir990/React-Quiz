// API documentation: GET /api/docs (Swagger UI) and GET /api/docs/openapi.json (the spec).
// Swagger UI is loaded from a CDN rather than from node_modules: Vercel's serverless
// bundle doesn't reliably include swagger-ui's static files, which leaves a blank page.
// Set API_DOCS=off to turn the page off.
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const YAML = require('yaml');

const SWAGGER_UI = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14';

const spec = YAML.parse(fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8'));

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>QuizApp API docs</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="${SWAGGER_UI}/swagger-ui.css">
  <style>body { margin: 0; } .swagger-ui .topbar { display: none; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_UI}/swagger-ui-bundle.js" crossorigin></script>
  <script src="./docs.js"></script>
</body>
</html>`;

// Kept in its own file so the page needs no inline script (the CSP forbids those)
const init = `window.ui = SwaggerUIBundle({
  url: './openapi.json',
  dom_id: '#swagger-ui',
  deepLinking: true,
  persistAuthorization: true,
  docExpansion: 'list',
  defaultModelsExpandDepth: 0,
  tryItOutEnabled: false,
});`;

const router = express.Router();

// Same protections as the rest of the API, plus the CDN for Swagger UI's script and styles
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
    },
  },
}));

// /api/docs and /api/docs/ both work; relative URLs in the page need the trailing slash
router.get('/', (req, res) => {
  if (!req.originalUrl.split('?')[0].endsWith('/')) return res.redirect(301, `${req.baseUrl}/`);
  res.type('html').send(page);
});
router.get('/docs.js', (req, res) => res.type('application/javascript').send(init));
router.get('/openapi.json', (req, res) => res.json(spec));

module.exports = { router, spec };
