// Reference Express server: exposes the lifecycle-map document API backed by
// Postgres, behind Okta/Google bearer-token auth. The browser's
// HttpStorageAdapter talks to exactly these routes.
//
//   GET    /maps          → DocumentSummary[]
//   GET    /maps/:slug    → StoredDocument | 404
//   PUT    /maps/:slug    → { sources }, honoring `If-Match: <version>` → 409 on conflict
//   DELETE /maps/:slug    → 204
//
// Run: DATABASE_URL=... AUTH_MODE=okta OIDC_ISSUER=... OIDC_AUDIENCE=... node server.mjs

import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { PostgresStorageAdapter, VersionConflictError } from './postgresAdapter.mjs';
import { authMiddleware, AUTH_MODE } from './auth.mjs';

const PORT = Number(process.env.PORT ?? 8787);
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('Missing DATABASE_URL');

// Instantiate the adapter with your database info — this is the "pass the
// database" step, kept server-side.
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const storage = new PostgresStorageAdapter(pool);

const app = express();
app.use(cors()); // tighten `origin` to your app's domain in production
app.use(express.json({ limit: '5mb' }));
app.use(authMiddleware); // every route below requires a valid token (except in AUTH_MODE=none)

app.get('/maps', async (_req, res, next) => {
  try { res.json(await storage.list()); } catch (e) { next(e); }
});

app.get('/maps/:slug', async (req, res, next) => {
  try {
    const doc = await storage.load(req.params.slug);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) { next(e); }
});

app.put('/maps/:slug', async (req, res, next) => {
  try {
    const sources = req.body?.sources;
    if (!Array.isArray(sources)) return res.status(400).json({ error: 'Body must be { sources: [...] }' });
    const ifMatch = req.header('if-match');
    const doc = await storage.save(req.params.slug, sources, ifMatch ? { expectedVersion: ifMatch } : undefined);
    res.json(doc);
  } catch (e) {
    if (e instanceof VersionConflictError) {
      return res.status(409).json({ error: e.message, actualVersion: e.actualVersion });
    }
    next(e);
  }
});

app.delete('/maps/:slug', async (req, res, next) => {
  try { await storage.remove(req.params.slug); res.status(204).end(); } catch (e) { next(e); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error', detail: String(err?.message ?? err) });
});

app.listen(PORT, () => {
  console.log(`lifecycle-map storage server on :${PORT} (auth: ${AUTH_MODE})`);
});
