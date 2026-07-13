# lifecycle-map storage server (reference backend)

A minimal, runnable example of the **server side** of lifecycle-map's pluggable
storage: a Postgres-backed document store behind an authenticated HTTP API that
the browser's `HttpStorageAdapter` talks to.

This is the piece that lets you *"instantiate passing the database info and use
Okta / Google Workspace auth"* — done securely. **Database credentials and the
OAuth client-secret live here, on the server, never in the browser bundle.**

```
┌─────────────┐   Authorization: Bearer <session token>   ┌────────────────────┐
│   Browser   │ ────────────────────────────────────────▶ │  This server       │
│             │        GET/PUT/DELETE /maps[/:slug]        │  (Node + Express)  │
│ HttpStorage │                                            │                    │
│  Adapter    │ ◀──────────────────────────────────────── │  1. verify token   │
└─────────────┘             JSON documents                 │     (Okta/Google)  │
                                                            │  2. PostgresAdapter│
                                                            │        │           │
                                                            │        ▼           │
                                                            │   ┌──────────┐     │
                                                            │   │ Postgres │     │
                                                            │   └──────────┘     │
                                                            └────────────────────┘
```

## Install & run

```bash
cd examples/storage-server
npm install                       # installs pg, express, cors, jose

export DATABASE_URL="postgres://user:pass@localhost:5432/lifecycle_map"
# Pick ONE auth mode (see auth.mjs):
export AUTH_MODE="okta"           # or "google" or "none" (dev only)
export OIDC_ISSUER="https://<your-org>.okta.com/oauth2/default"
export OIDC_AUDIENCE="api://lifecycle-map"

node server.mjs                   # listens on :8787
```

Then point the browser app at it:

```ts
import { App } from 'lifecycle-map';
import { HttpStorageAdapter } from 'lifecycle-map/storage';

const storage = new HttpStorageAdapter({
  baseUrl: 'http://localhost:8787/maps',
  getToken: () => auth.getAccessToken(),   // your Okta/Google session token
});

render(<App storage={storage} />);
// Open the app at ?doc=<slug> to load that document; edits autosave back.
```

## Files

| File | What it is |
|------|-----------|
| `postgresAdapter.mjs` | `PostgresStorageAdapter` — the same `StorageAdapter` contract, backed by a `documents` table. Instantiate with a `pg` Pool. |
| `auth.mjs` | Bearer-token verification middleware for Okta / Google Workspace (OIDC JWT via `jose`), plus a `none` mode for local dev. |
| `server.mjs` | Express app mapping the HTTP API to the adapter, behind the auth middleware. |
| `schema.sql` | The `documents` table (slug PK, sources JSONB, version, updated_at). |

## The contract (must match the browser adapter)

- `GET  /maps`          → `DocumentSummary[]`  (`{ slug, version, updatedAt }[]`)
- `GET  /maps/:slug`    → `StoredDocument` or `404`
- `PUT  /maps/:slug`    → body `{ sources }`, header `If-Match: <version>` for
  optimistic concurrency; `409` with `{ actualVersion }` on a stale write.
- `DELETE /maps/:slug`  → `204`

These mirror `src/lib/storage/httpAdapter.ts` exactly, so the browser adapter
works against this server unchanged.

## Security notes

- **Never** put `DATABASE_URL` or an OAuth client-secret in frontend code — they
  would ship in the JS bundle and be readable by any user. They belong only here.
- The browser only ever sends a short-lived **session token**; this server
  verifies it (`auth.mjs`) before touching the database.
- Scope writes per user/tenant in a real deployment (add a `tenant_id` column and
  filter every query by the authenticated principal). This example authenticates
  but does not multi-tenant — add that before production.
