# 27 — Code Review

Applies to reviewing Claude Code's output, a contractor's PR, and your own diff before
pushing. Solo doesn't mean unreviewed — it means you are the reviewer.

## What review is for

In priority order:

1. **Correctness** — does it do the right thing, including on the sad path?
2. **Security** — auth, tenant scoping, injection, secrets.
3. **Data safety** — migrations, destructive operations, money.
4. **Clarity** — will this be understandable in six weeks?
5. **Consistency** — does it match how the rest of the codebase does this?
6. **Design** — is there a materially simpler approach?

Style is not on this list. Prettier and ESLint own style; if you're commenting on
formatting, fix the config instead.

## The review pass, in order

**1. Read the description.** If you can't tell what problem this solves, stop and ask.

**2. Scan the file list.** Does the shape match the description? A "fix a typo" PR that
touches `prisma/schema.prisma` deserves a question.

**3. Look for the dangerous things first:**

- [ ] Any DB query without a tenant/owner filter
- [ ] Any server action or route handler without `authorize()`
- [ ] Any user input reaching a query, a shell, or `dangerouslySetInnerHTML`
- [ ] New env vars — added to `env.ts`, `.env.example`, and the platform?
- [ ] Migrations — reversible? backwards-compatible? locking?
- [ ] Money — integers? currency stored? rounding correct?
- [ ] Secrets — anything `NEXT_PUBLIC_` that shouldn't be?
- [ ] External calls — timeout? retry only if idempotent?

**4. Then read the logic.** Trace one real request through it. Then trace a failure.

**5. Then the tests.** Do they test behaviour? Would they fail if the code were wrong?
A PR that changes behaviour with no test change is suspicious.

**6. Then the details.** Naming, dead code, comments explaining *why*, error messages a
user could act on.

## Questions worth asking every time

- What happens when this is called twice? (Idempotency.)
- What happens when the external call times out?
- What does a user in another workspace see?
- What does this do with 10,000 rows? With zero?
- Is this the smallest change that solves the problem?
- What did we delete? (If nothing, and the codebase grew, is that right?)

## Giving feedback

Be specific, be kind, aim at the code. Label the severity so the author knows what blocks
merge:

```
blocking: `findUnique({ where: { id } })` isn't tenant-scoped — another workspace can read
this order by guessing the id. Use `findFirst({ where: { id, workspaceId } })`.

suggestion: this could be a `Result` return instead of a throw, matching the other actions
in this feature. Not blocking.

nit: `data2` → `refundedOrder`.

question: why 15 seconds here? If Paystack is slow, do we want the user waiting that long?

praise: nice catch handling the partial-refund rounding — that would have bitten us.
```

Explain the *why*, and give the fix when you know it. "This is wrong" costs the author
another round trip; "this is wrong because X, do Y" doesn't.

Ask, don't accuse. Half of "why did you do this?" moments have a good answer you didn't
have context for.

## Receiving feedback

The code is not you. Assume good intent. Respond to every comment — fixed, or here's why
not. Don't argue in threads longer than two replies; move to a call or a decision record.
If a reviewer misread the code, that's often a signal the code is unclear.

## Reviewing AI-generated code specifically

Claude Code produces plausible code fast, which is exactly why it needs review. Check
harder for:

- **Hallucinated APIs** — a method that doesn't exist on that library version. Check the
  lockfile version, not the latest docs.
- **Confidently wrong defaults** — a timeout, a cache TTL, a rate limit that was invented.
- **Missing tenant scoping** — the most common and most dangerous omission.
- **Over-engineering** — an abstraction layer, a factory, a config object where a function
  would do.
- **Silent scope creep** — files touched that the task didn't require.
- **Copied patterns that don't fit** — a Pages Router idiom in an App Router codebase.
- **Tests that assert the implementation** rather than the behaviour, or that mock the
  thing under test.

Run it. Read it. Don't merge on the basis that it looks right — plausible-looking is the
failure mode.

## Approving

Approve when: you understand the change, you'd be comfortable being paged for it, the
dangerous checklist is clear, and any remaining comments are non-blocking.

Don't approve to be nice. Don't block on preference. If you can't decide, say what would
make you comfortable.

## Self-review checklist (before requesting review)

- [ ] I read the full diff on GitHub, not just my editor
- [ ] `pnpm verify` passes
- [ ] No debug logs, no `.only`, no commented-out code, no TODO without an owner
- [ ] The PR description would make sense to me in six months
- [ ] Screenshots for UI changes
- [ ] Migration plan and rollback noted if relevant
- [ ] The diff is under 400 lines, or I've explained why it can't be
