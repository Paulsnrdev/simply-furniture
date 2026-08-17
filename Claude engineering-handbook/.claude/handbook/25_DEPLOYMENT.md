# 25 — Deployment

## Environments

| Env         | Branch    | Database                | Keys  | Purpose                    |
| ----------- | --------- | ----------------------- | ----- | -------------------------- |
| Local       | any       | Docker Postgres         | test  | Development                |
| Preview     | PR        | Supabase branch / copy  | test  | Review each PR             |
| Staging     | `main`    | Separate DB, seeded     | test  | Final check, demos         |
| Production  | tag/`main`| Production DB           | live  | Customers                  |

Never point a preview at the production database. Never use live payment keys outside
production.

## Vercel setup (default)

- Framework preset: Next.js. Build: `pnpm build`. Install: `pnpm install --frozen-lockfile`.
- Set `prisma generate` in a `postinstall` script so the client is generated on every build.
- Environment variables set per environment (Development / Preview / Production) in the
  dashboard, mirrored in `.env.example`.
- Region closest to the database. If the DB is in Frankfurt and functions run in
  Washington, every query pays 100ms of latency — colocate them.
- Function timeouts: raise for exports and report endpoints, keep low elsewhere.

## Domains and DNS

For a Vercel-hosted app on a registrar like Hostinger or Namecheap:

```
A     @      76.76.21.21
CNAME www    cname.vercel-dns.com.
```

- Add the domain in Vercel first, then create the records — it verifies automatically.
- Pick one canonical host (apex or `www`) and 301 the other. Never serve both.
- TTL 300 while migrating, then raise it.
- Propagation is usually minutes; check with `dig @1.1.1.1 example.com` rather than
  refreshing the browser (which caches aggressively).
- Email records live at the registrar and are unaffected — but **verify MX and SPF still
  resolve after any nameserver change**, or you silently stop receiving mail.
- Wildcard `*.example.com` for multi-tenant subdomains (`31_MULTI_TENANCY.md`), plus the
  wildcard certificate that requires DNS-01 validation.

## Environment variables

- Validate at boot with `env.ts` (`02_PROJECT_ARCHITECTURE.md`) — fail fast and loudly.
- `NEXT_PUBLIC_*` is compiled into the bundle at **build time**; changing it requires a
  rebuild, and it is permanently public.
- Keep `.env.example` updated in the same commit that adds a variable. A missing variable
  discovered at 2am is entirely avoidable.
- Different values per environment, always. Never share a secret between staging and prod.

## Database in production

- Supabase pooler (6543, `pgbouncer=true`) as `DATABASE_URL`; direct (5432) as `DIRECT_URL`.
- `pnpm prisma migrate deploy` in CI before the app deploy — never `db push`, never
  `migrate dev` against production.
- Enable PITR and daily backups. **Test a restore before launch.**
- Set `statement_timeout` on the app role.

## Deployment sequence

```
1. Merge → CI green
2. Run migrations (backwards-compatible with running code)
3. Deploy app
4. Smoke test /api/health + one real user journey
5. Watch Sentry and logs for 15 minutes
6. Announce / close the ticket
```

Deploy on a Tuesday morning, not a Friday evening. Deploy small changes often rather than
big ones rarely — the blast radius of a small deploy is small.

## Zero-downtime rules

- Migrations are additive first (expand → backfill → switch → contract).
- Old and new code must be able to run simultaneously for a few minutes.
- Never rename or drop a column in the same release that stops using it.
- Feature-flag anything risky so a rollback is a toggle, not a redeploy.

## Feature flags

```ts
export async function isEnabled(flag: string, workspaceId: string) {
  const f = await getFlags();
  return f[flag]?.enabled && (!f[flag].workspaces || f[flag].workspaces.includes(workspaceId));
}
```

Use them for: risky launches, gradual rollout, per-customer betas, and kill switches on
expensive integrations. Delete the flag once the feature is fully on — stale flags are
dead branches that still execute.

## Rollback plan

Before deploying anything non-trivial, know the answer to: *how do I undo this in under
two minutes?*

- App: promote the previous Vercel deployment.
- Feature: flip the flag off.
- Migration: you don't roll back — you deploy a fix forward. Which is why they're additive.
- Data: restore from backup into a **new** database and copy rows across; never restore
  over a live database while writes are happening.

## Post-deploy verification

- `/api/health` returns 200 and checks the database.
- Log in as a real test account and complete one core journey.
- Trigger one webhook (a test payment) end to end.
- Check Sentry for a new error signature.
- Check that background jobs and crons are still running — a broken worker is silent.

## Static assets and caching

Hashed filenames are immutable — `Cache-Control: public, max-age=31536000, immutable`.
HTML and API responses are `no-store` when personalized. Purge the CDN on deploy only if
you serve unhashed assets (you shouldn't).

## Cost control

Set a spending cap and a billing alert on every provider: Vercel, Supabase, Upstash,
Resend/SES, and the Claude API. Alert at 50% and 80% of budget. A runaway loop calling a
paid API is the most expensive bug a solo developer can ship.
