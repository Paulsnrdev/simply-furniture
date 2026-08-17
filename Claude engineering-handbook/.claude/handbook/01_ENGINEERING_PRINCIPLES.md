# 01 — Engineering Principles

The rules that decide arguments. When two approaches both "work", these break the tie.

## The ordering

When principles conflict, resolve in this order:

1. **Correctness** — it does the right thing, including on the sad path.
2. **Security & data integrity** — no leaks, no corruption, no lost money.
3. **Clarity** — the next person (me, in six weeks) understands it in one read.
4. **Simplicity** — fewest moving parts that satisfy 1–3.
5. **Performance** — fast, once 1–4 hold.
6. **Elegance** — nice to have. Never a reason to add abstraction.

If you find yourself trading clarity for cleverness, stop and take the boring option.

## Optimize for the solo maintainer

This codebase is maintained by one person across many products. Therefore:

- **Boring beats novel.** A pattern used in three other files beats a better pattern used once.
- **Explicit beats magic.** No decorators, no metaprogramming, no dynamic imports by string,
  no "framework inside the framework".
- **Colocate.** Put code near where it is used. A helper used by one route lives beside
  that route, not in `lib/utils.ts`.
- **Duplicate twice, abstract on the third.** Two similar blocks are fine. Premature
  abstraction is the most expensive mistake in a small codebase because it couples
  features that were about to diverge.

## Complexity budget

Every dependency, config file, env var, service, and abstraction spends budget.

Before adding one, answer:

- What breaks if I don't add it? (If "nothing", stop.)
- What does it cost at 3am when it fails?
- Can I delete it later without a rewrite?
- Is there a stdlib / framework-native way that is 80% as good?

**Adding a library is a decision, not a detail.** Prefer: no dependency > framework
built-in > one small well-maintained package > a large framework.

## Make the invalid unrepresentable

Push errors from runtime to compile time wherever it is cheap.

```ts
// ✗ Every consumer must remember the rules
type Order = { status: string; paidAt?: Date; refundedAt?: Date };

// ✓ Impossible states cannot be constructed
type Order =
  | { status: "pending" }
  | { status: "paid"; paidAt: Date }
  | { status: "refunded"; paidAt: Date; refundedAt: Date };
```

Same idea elsewhere: NOT NULL columns, DB unique constraints instead of "check first",
Zod schemas at the edge so the interior is already valid, discriminated unions over
boolean pairs (`isLoading` + `isError` → `status: "idle" | "loading" | "error" | "ready"`).

## Fail loudly, degrade gracefully

- **Internally**, throw early with a specific message. Silent fallbacks hide bugs for weeks.
- **Externally**, never show a stack trace. Show what happened, what it means, what to do.
- Anything that can be retried should be **idempotent** (see `32_BACKGROUND_JOBS.md`).
- Anything touching money or user data should be **auditable** — write a record, not a log line.

```ts
// ✗ swallows the failure, user sees an empty page forever
const user = await getUser(id).catch(() => null);

// ✓ distinguishes "not found" from "our fault"
const user = await getUser(id); // throws → error boundary → logged to Sentry
if (!user) notFound();
```

## Boundaries are where the thinking goes

Most bugs live at edges, not in the middle. Spend your care on:

| Boundary          | What must happen there                                       |
| ----------------- | ------------------------------------------------------------ |
| HTTP request in   | Zod parse, authn, authz, rate limit                           |
| DB write          | Transaction, tenant scope, constraint, migration reviewed     |
| Third-party call  | Timeout, retry policy, error mapping, no secrets in logs      |
| Webhook in        | Signature verification, idempotency key, fast 2xx             |
| Server → client   | Only serializable, only non-sensitive fields                  |

Interior functions can be simple because the boundary already guaranteed the invariants.

## Reversibility

Classify every decision before committing to it:

- **Two-way door** (a component's shape, a file layout, a copy change): decide fast, move on.
- **One-way door** (database schema on live data, auth model, tenancy model, pricing units,
  public API shape, choice of payment provider): slow down, write the tradeoff in an ADR,
  and prefer the option that keeps future options open.

## ADRs

Any one-way door gets a short record in `docs/adr/NNNN-title.md`:

```md
# 0007 — Use per-row tenant_id over schema-per-tenant

Date: 2026-02-11
Status: accepted

## Context
Eight products, single Postgres, solo maintainer. Expect < 10k tenants per product.

## Decision
Single schema, `tenantId` column on every tenant-owned table, enforced by Prisma
extension + Postgres RLS.

## Consequences
+ One migration path, cheap to operate, easy cross-tenant analytics.
− Every query must be scoped; a missed `where` is a data leak. Mitigated by the
  Prisma client extension and a lint rule.
```

Five minutes now saves an afternoon of "why is it like this?" later.

## Definition of "works"

A change is not done because the happy path renders. It works when:

- The sad path is handled (empty, loading, error, unauthorized, offline, slow).
- It behaves correctly for a second tenant and a second user.
- It is safe to run twice.
- It leaves a trace when it fails (log with a correlation id, Sentry event).
- Someone else could delete it cleanly.

## Anti-patterns to reject on sight

- Utility dumping grounds (`utils.ts`, `helpers.ts`, `common/`) — name by domain instead.
- Abstractions with exactly one implementation "for flexibility".
- Config that only ever has one value.
- Comments explaining *what* the line does instead of *why* it exists.
- Try/catch that logs and continues as if nothing happened.
- Copying a pattern from a tutorial into production without reading it.
