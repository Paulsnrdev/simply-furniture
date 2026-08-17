# 28 — Definition of Done

"It works on my machine" is not done. This is the checklist that decides whether a task can
be closed. Claude Code should run through it before reporting a task complete.

## Universal gate — every change

- [ ] `pnpm lint` — zero errors, zero warnings
- [ ] `pnpm typecheck` — zero errors, no new `any`, no `@ts-ignore`
- [ ] `pnpm test` — passes, including a test covering the new behaviour
- [ ] `pnpm build` — succeeds
- [ ] Manually exercised the happy path **and** one failure path
- [ ] No debug logging, commented-out code, or unowned TODOs
- [ ] Diff self-reviewed; nothing unrelated included
- [ ] Commit messages follow `09_WRITING_RULES.md`

If any of these fail, the task is in progress, not done.

## Feature work

- [ ] All four UI states: loading, empty, error, ready (`08_UI_UX.md`)
- [ ] Works at 375px and 1440px
- [ ] Keyboard navigable; visible focus; labels on inputs
- [ ] Inputs validated with Zod on the server, not only the client
- [ ] Authorization checked server-side; tenant scope in every query
- [ ] Copy reviewed — buttons name the outcome, errors are actionable
- [ ] Loading states prevent double submission
- [ ] Analytics event fired if this is a funnel step (`37_ANALYTICS.md`)
- [ ] Feature flagged if the rollout is risky

## Backend / API work

- [ ] Input schema, output DTO, and error codes defined
- [ ] Correct status codes; envelope matches `15_API_STANDARDS.md`
- [ ] Rate limited
- [ ] Idempotent if it creates anything or moves money
- [ ] Timeouts on every external call
- [ ] Errors logged with a request id; nothing sensitive in the log
- [ ] N+1 checked; indexes exist for new filters and sorts
- [ ] Integration test covering allowed, denied, and cross-tenant cases

## Database changes

- [ ] Migration generated, SQL reviewed by eye
- [ ] Backwards-compatible with the currently deployed code
- [ ] Indexes added for anything new that gets filtered or sorted
- [ ] Applied and rolled forward successfully on a copy of production-shaped data
- [ ] Backfill script is batched, idempotent, and has `--dry-run`
- [ ] No destructive change in the same release that stops using the column
- [ ] Rollback plan written down

## Bug fixes

- [ ] Root cause identified — not just the symptom suppressed
- [ ] **Regression test written that fails before the fix and passes after**
- [ ] Checked whether the same bug exists elsewhere in the codebase
- [ ] The Sentry issue is linked and will resolve
- [ ] If it affected users, decided whether they need to be told

## Anything touching money

- [ ] Amounts are integer minor units; currency stored alongside
- [ ] Webhook signature verified; event id deduplicated
- [ ] Amount re-verified against the provider, not trusted from the payload
- [ ] Idempotency key on every charge
- [ ] Failure path tested with the provider's test cards
- [ ] Audit row written
- [ ] Reconciliation possible: can you answer "what did we charge this customer and why?"

## Before deploying to production

- [ ] CI green on the merge commit
- [ ] Env vars added to the platform for every environment
- [ ] `.env.example` updated in the same PR
- [ ] Migrations run before the app deploy
- [ ] Rollback path known and under two minutes
- [ ] Deployed outside peak hours, not on a Friday evening

## After deploying

- [ ] `/api/health` returns 200
- [ ] One real user journey completed against production
- [ ] Sentry watched for 15 minutes — no new error signature
- [ ] Background jobs and crons still running
- [ ] Key metric checked (signups, orders, errors) against yesterday

## Documentation

- [ ] Non-obvious decisions captured — inline comment for local ones, an ADR for one-way doors
- [ ] README updated if setup or env changed
- [ ] Handbook updated if this established a new convention
- [ ] Anything intentionally left undone is written down as an issue, not remembered

## The honesty rule

If something on this list was skipped, **say so explicitly** rather than quietly leaving
it. "Done, but I didn't write the E2E test and the empty state is a placeholder" is useful.
"Done" when it isn't costs a debugging session later.

Claude Code: when you report completion, state which of these you actually verified by
running, and which you're asserting from reading the code. Those are different claims.
