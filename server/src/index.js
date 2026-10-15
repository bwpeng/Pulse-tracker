import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from './routes/api.js';
import { isSeeded } from './db.js';
import { seed } from './seed.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 4000);
const WEB_DIST = path.resolve(here, '..', '..', 'web', 'dist');

// First run on a clean machine shouldn't be an empty app.
if (!isSeeded()) {
  const result = seed();
  if (result.seeded) console.log(`[pulse] seeded ${result.users} demo accounts`);
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

app.use('/api', api);

// Serve the built front end when it exists, so `npm start` is the whole app.
if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(WEB_DIST, 'index.html'));
  });
}

app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));

// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
app.use((err, _req, res, _next) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error('[pulse]', err);
  res.status(status).json({ error: err.message ?? 'server_error' });
});

app.listen(PORT, () => {
  console.log(`[pulse] API on http://localhost:${PORT}/api`);
  if (fs.existsSync(WEB_DIST)) console.log(`[pulse] serving built front end from ${WEB_DIST}`);
});
