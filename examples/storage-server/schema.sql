-- lifecycle-map document store.
-- One row per document: a lifecycle map plus its datatable bundle, stored as
-- the same source array the viewer uses (name/text/lang), keyed by slug.

CREATE TABLE IF NOT EXISTS documents (
  slug        TEXT PRIMARY KEY,
  sources     JSONB       NOT NULL,          -- [{ name, text, lang }]
  version     BIGINT      NOT NULL DEFAULT 1, -- bumped on every save (optimistic concurrency)
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- For a multi-tenant deployment, add a tenant/owner column and make it part of
-- the primary key, then filter every query by the authenticated principal:
--
--   ALTER TABLE documents ADD COLUMN tenant_id TEXT NOT NULL;
--   ALTER TABLE documents DROP CONSTRAINT documents_pkey;
--   ALTER TABLE documents ADD PRIMARY KEY (tenant_id, slug);
