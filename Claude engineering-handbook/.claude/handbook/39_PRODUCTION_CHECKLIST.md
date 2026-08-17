# 39 — Production Checklist

Run before the first real customer touches a product, and again before any major launch.
Nothing here is optional; some items are simply cheaper than the incident they prevent.

## Security

- [ ] Every tenant-owned query scoped by `workspaceId` (`31`)
- [ ] Every server action and route handler calls `authorize()` (`17`)
- [ ] Postgres RLS enabled if any client touches the DB directly
- [ ] No secrets in the client bundle; no `NEXT_PUBLIC_` on anything sensitive
- [ ] `import "server-only"` on all query/action modules
- [ ] Security headers scoring A on securityheaders.com; CSP enforced
- [ ] Rate limits on login, signup, password reset, writes, and expensive endpoints
- [ ] Webhook signatures verified; event ids deduplicated
- [ ] File uploads: type-checked by magic bytes, size-capped, private, served signed
- [ ] `pnpm audit` clean at high/critical
- [ ] Secret scanning + push protection enabled on the repo
- [ ] Passwords hashed with argon2id/bcrypt; sessions httpOnly + secure + sameSite

## Data

- [ ] Migrations applied via `migrate deploy`; no `db push` ever ran against prod
- [ ] Indexes on every filter, sort, and foreign key
- [ ] Automated backups on **and a restore actually tested**
- [ ] PITR enabled
- [ ] `statement_timeout` set on the application role
- [ ] Connection pooling correct for serverless (pooler URL + `DIRECT_URL`)
- [ ] Money stored as integer minor units with currency
- [ ] Soft delete + a real hard-delete path for data requests
- [ ] Seed/demo data is clearly removable and not mistaken for real records

## Reliability

- [ ] `/api/health` and `/api/ready` respond correctly
- [ ] Uptime monitoring from two regions, alerting to your phone
- [ ] Cron heartbeats monitored — you'll know if one stops
- [ ] Background jobs: idempotent, retried with backoff, dead-letter path exists
- [ ] Timeouts on every outbound call
- [ ] Graceful shutdown on any long-running process
- [ ] Rollback path tested and under two minutes

## Observability

- [ ] Sentry live on client and server, with `release` set to the commit SHA
- [ ] Alerts configured: page for payments/auth/downtime, digest for everything else
- [ ] Structured logging with correlation ids; secrets redacted
- [ ] Audit log recording money and permission changes
- [ ] Analytics capturing the signup, activation, and checkout funnels server-side
- [ ] A dashboard you can read in 10 seconds

## Payments

- [ ] Live keys in production only; test keys everywhere else
- [ ] Amounts computed server-side, never accepted from the client
- [ ] Payment verified against the provider before fulfilment
- [ ] Double-webhook tested: charged once, fulfilled once
- [ ] Refund flow works, including partial
- [ ] Failed-payment dunning sequence live
- [ ] Receipts and invoices sending
- [ ] Reconciliation query written

## Email

- [ ] SPF, DKIM, DMARC all passing (mail-tester.com ≥ 9/10)
- [ ] Dedicated sending subdomain; transactional and marketing separated
- [ ] All transactional templates tested in Gmail, Outlook, Apple Mail, Android
- [ ] Plain-text alternative on every email
- [ ] Bounce and complaint webhooks handled; suppression list enforced
- [ ] One-click unsubscribe on everything non-transactional
- [ ] Non-production environments physically cannot email customers

## Performance

- [ ] LCP < 2.5s, INP < 200ms, CLS < 0.1 on a mid-range Android over 4G
- [ ] First-load JS under budget; heavy client libraries dynamically imported
- [ ] Images via `next/image` with `sizes`; fonts via `next/font`
- [ ] No N+1 queries in any core flow
- [ ] Pagination or virtualization on every list that can grow
- [ ] Caching strategy explicit per route; nothing personalized is shared-cached

## UX

- [ ] Every screen: loading, empty, error, and ready states implemented
- [ ] Works at 375px; keyboard navigable; focus visible; contrast AA
- [ ] Forms: real labels, inline errors, no data loss on failure
- [ ] Destructive actions confirm and name what they'll do
- [ ] Copy reviewed against `09_WRITING_RULES.md`
- [ ] 404 and 500 pages designed, with a way back

## Legal and business

- [ ] Terms of Service and Privacy Policy published and linked
- [ ] Cookie consent if any non-essential cookies are set
- [ ] NDPR/GDPR: data export and deletion paths work
- [ ] Support contact that reaches a human
- [ ] Pricing page accurate; billing matches what it says
- [ ] Cancellation possible without emailing you
- [ ] `security.txt` with a contact address

## Operations

- [ ] Spending caps and billing alerts on every provider
- [ ] `docs/RUNBOOK.md` written: rollback, key rotation, backup restore, maintenance page
- [ ] `.env.example` complete and current
- [ ] README explains setup, deploy, and env vars
- [ ] Domain: canonical host chosen, the other 301s, certificate valid, auto-renewing
- [ ] DNS verified after any nameserver change — especially MX records

## Launch day

- [ ] Deploy in the morning, midweek
- [ ] Complete one full real journey on production yourself, paying real money
- [ ] Watch Sentry and logs for the first hour
- [ ] Check that jobs and crons ran
- [ ] Confirm the first real signup produced the right emails and analytics events

## The honest question

Before you call it launched: *if this broke at 2am, would I know, and would I know what to
do?* If the answer to either half is no, the gap is in monitoring or the runbook — fix that
before adding another feature.
