# 13 — PostgreSQL

Default database for all new products. Supabase in production, Docker Postgres locally.

## Schema fundamentals

- `snake_case` table and column names, plural tables (`order_items`).
- Every table: a primary key, `created_at`, `updated_at` (`timestamptz`, never `timestamp`).
- Prefer `NOT NULL` with a default over nullable. Nullable columns are a question you'll
  have to answer in every query forever.
- Money: `BIGINT` minor units + a `currency CHAR(3)`. Never `float`, never `money`.
- Enums: Postgres `ENUM` for stable sets, a lookup table when values change often
  (adding an enum value is a migration; adding a row isn't).
- Foreign keys with explicit `ON DELETE` behaviour — `CASCADE` for owned children,
  `RESTRICT` for anything financial.

```sql
CREATE TABLE orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  reference    TEXT NOT NULL,
  status       order_status NOT NULL DEFAULT 'pending',
  total_minor  BIGINT NOT NULL CHECK (total_minor >= 0),
  currency     CHAR(3) NOT NULL DEFAULT 'NGN',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, reference)
);
```

## Keys

UUIDv7 (or ULID) beats UUIDv4 for primary keys: still unguessable, but time-ordered, so
inserts don't fragment the B-tree. Auto-increment integers leak volume ("we've had 47
orders") and make multi-tenant merges painful — avoid them on public-facing tables.

## Indexes

```sql
-- filter + sort together
CREATE INDEX orders_workspace_created_idx ON orders (workspace_id, created_at DESC);

-- partial: much smaller, used by the dashboard's default filter
CREATE INDEX orders_pending_idx ON orders (workspace_id) WHERE status = 'pending';

-- covering: index-only scan, no heap fetch
CREATE INDEX orders_list_idx ON orders (workspace_id, created_at DESC)
  INCLUDE (reference, status, total_minor);

-- case-insensitive lookup
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

-- JSONB containment
CREATE INDEX products_metadata_idx ON products USING GIN (metadata jsonb_path_ops);

-- full text
CREATE INDEX products_search_idx ON products
  USING GIN (to_tsvector('english', name || ' ' || coalesce(description, '')));
```

Rules: index every FK, every column in a `WHERE`, and the sort column of paginated lists.
Column order in a compound index matters — equality first, then range/sort. Drop unused
indexes; each one taxes every write. Check `pg_stat_user_indexes` for `idx_scan = 0`.

Build them concurrently in production:
`CREATE INDEX CONCURRENTLY ...` (cannot run inside a transaction).

## Query hygiene

- `EXPLAIN (ANALYZE, BUFFERS)` anything slow. Look for `Seq Scan` on big tables and a
  large gap between estimated and actual rows (stale stats → `ANALYZE`).
- Keyset pagination, not `OFFSET`:
  ```sql
  SELECT * FROM orders
  WHERE workspace_id = $1 AND (created_at, id) < ($2, $3)
  ORDER BY created_at DESC, id DESC LIMIT 20;
  ```
- Avoid `SELECT *` in application code.
- `EXISTS` beats `COUNT(*) > 0`.
- Push aggregation into SQL rather than looping in Node.
- Use CTEs for readability, but know they can be optimization fences with `MATERIALIZED`.

## Transactions and locking

Default isolation is `READ COMMITTED`. Use `SERIALIZABLE` for balance/inventory invariants
and be ready to retry on `40001`.

```sql
BEGIN;
SELECT stock FROM products WHERE id = $1 FOR UPDATE;   -- row lock
UPDATE products SET stock = stock - $2 WHERE id = $1;
INSERT INTO order_items (...) VALUES (...);
COMMIT;
```

Keep transactions short — never do an HTTP call or send an email inside one. Always lock
rows in a consistent order across the codebase to avoid deadlocks.

## Row Level Security (Supabase)

If clients talk to Postgres directly (Supabase JS with the anon key), RLS is your entire
authorization layer. Enable it on every table, then write policies.

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_select ON orders FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM memberships WHERE user_id = auth.uid()
  ));

CREATE POLICY orders_insert ON orders FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM memberships WHERE user_id = auth.uid()
  ));
```

Wrap `auth.uid()` in a `SELECT` inside policies so it's evaluated once, and index the
columns policies filter on — RLS predicates run per row.

**The service-role key bypasses RLS entirely.** It never leaves the server, never appears
in a client bundle, and never sits in a `NEXT_PUBLIC_` variable.

## Connection pooling

Serverless functions open a connection per invocation; Postgres has a hard limit.

- Supabase: use the **pooler** (port 6543, `pgbouncer=true`, transaction mode) as
  `DATABASE_URL`, and the direct connection (5432) as `DIRECT_URL` for migrations.
- In transaction pooling mode, prepared statements are unavailable — Prisma needs
  `pgbouncer=true` in the URL.
- Long-running servers can use a normal pool of ~10–20.

```
DATABASE_URL="postgres://...@...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgres://...@db...supabase.co:5432/postgres"
```

## Migrations

Forward-only, reviewed, and tested against a copy of production data. Never edit an applied
migration. Never run `db push` on production.

**Expand → migrate → contract** for anything with live traffic:

1. Add the new nullable column / new table. Deploy.
2. Backfill in batches; write to both old and new. Deploy.
3. Switch reads. Deploy.
4. Drop the old column, in a later release.

Dangerous operations that lock: adding a `NOT NULL` column with a volatile default,
changing a column type, adding a FK without `NOT VALID`. Use the two-step forms:

```sql
ALTER TABLE orders ADD CONSTRAINT orders_workspace_fk
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT orders_workspace_fk;
```

## JSONB

Good for genuinely schemaless payloads (webhook bodies, form-builder responses, feature
flags). Bad as a way to avoid designing a schema — you lose constraints, FKs, and cheap
indexing. If you query a JSONB key in a `WHERE` more than occasionally, promote it to a
real column.

## Operations

- Automated daily backups + PITR on anything with customers. **Test a restore quarterly.**
- Monitor: connection count, cache hit ratio (> 99%), longest transaction, table bloat,
  slow query log (`log_min_duration_statement = 200ms`).
- `pg_stat_statements` for finding the expensive queries.
- Set `statement_timeout` (e.g. 10s) on the application role so one bad query can't hold
  the database hostage.
