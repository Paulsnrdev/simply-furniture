# 26 — Git Workflow

## Branching

Trunk-based. `main` is always deployable. Short-lived branches merged within a day or two.

```
main
 ├─ feat/order-partial-refunds
 ├─ fix/checkout-modal-spinner
 └─ chore/upgrade-next-15-4
```

Prefixes: `feat/`, `fix/`, `refactor/`, `chore/`, `docs/`, `perf/`, `test/`, `hotfix/`.
Lowercase, hyphenated, descriptive. Include the issue number if there is one:
`feat/142-partial-refunds`.

No long-lived `develop` branch. For one developer it's pure overhead; for a small team it
just delays integration pain.

## Commits

Conventional Commits, imperative mood, ≤ 72-character subject, no trailing period.

```
feat(orders): support partial refunds
fix(checkout): stop Flutterwave modal spinning on retry
refactor(email): move provider behind a Result-returning adapter
perf(dashboard): add composite index for the orders list query
chore(deps): bump next to 15.4.2
docs(handbook): add multi-tenancy isolation rules
```

Body explains **why**, wraps at 72, and links the issue. Breaking changes:

```
feat(api)!: return cursor pagination instead of page numbers

BREAKING CHANGE: `page` and `total` are removed from list responses.
Clients must use `meta.nextCursor`.
```

## What makes a good commit

- One logical change. If the message needs "and", split it.
- The build passes at that commit. Every commit on `main` should be checkout-able.
- No mixed formatting and logic. Reformat in its own commit or the diff is unreviewable.
- No commented-out code, no `console.log`, no `.only` in tests.
- Never commit `.env`, credentials, `node_modules`, build output, or a 40MB asset.

Commit often locally, then clean up before pushing:

```bash
git rebase -i main       # squash "wip", "fix typo", "actually fix it"
```

## Pull requests

Even solo. A PR is a checkpoint that forces you to read your own diff.

- **Under 400 lines** of real change. Bigger PRs get worse reviews, not better ones.
- One concern per PR. Refactoring rides in its own PR, never with a feature.
- Description follows the template in `09_WRITING_RULES.md`: What / Why / How / Testing / Risk.
- Draft PRs for early feedback; mark ready when CI is green.
- Screenshots or a short clip for anything visual. Before *and* after.
- Self-review the diff on GitHub before requesting review. You will find something.

## Merging

**Squash merge** into `main`. One feature = one commit = one revertible unit, and the
messy intermediate history stays out of the trunk.

Rebase your branch onto `main` before merging rather than merging `main` into it — linear
history makes `git bisect` and `git log` actually useful.

```bash
git fetch origin
git rebase origin/main
# resolve, then
git push --force-with-lease      # never plain --force
```

Delete the branch after merge.

## Never rewrite shared history

Rebase your own unpushed or unshared branch freely. Once someone else has pulled it, or
it's `main`, use `git revert`.

```bash
git revert <sha>          # safe, creates a new commit
git revert -m 1 <merge>   # reverting a merge commit
```

## Hotfixes

```bash
git switch -c hotfix/checkout-500 main
# minimal fix, nothing else
# PR, expedited review, merge, deploy, verify
```

A hotfix fixes one thing. Resist the urge to tidy while you're in there. Write the
regression test in the same PR.

## Tags and releases

Semantic versioning for anything with consumers (packages, public APIs). Date-based or
sequential is fine for an app.

```bash
git tag -a v1.4.0 -m "Partial refunds, cursor pagination"
git push origin v1.4.0
```

Generate the changelog from Conventional Commits (`changesets` or
`conventional-changelog`) — that's the payoff for the commit discipline.

## `.gitignore` essentials

```
node_modules/
.next/
out/
dist/
coverage/
.env
.env.*
!.env.example
*.log
.DS_Store
.vercel
/playwright-report
```

Add `.gitattributes` with `* text=auto eol=lf` so line endings never become a diff.

## Recovery

```bash
git reflog                       # everything you've done — nothing is really lost
git reset --hard HEAD@{3}
git restore --staged <file>      # unstage
git restore <file>               # discard local changes
git stash push -m "wip filters"
git cherry-pick <sha>
git bisect start / bad / good    # find the commit that broke it
git log -S"functionName"         # when was this introduced or removed?
git blame -w -C <file>           # who and why, ignoring whitespace moves
```

`git reflog` has saved more work than any other command. Learn it before you need it.

## If a secret gets committed

1. **Rotate the secret immediately.** It's compromised the moment it's pushed, even if you
   force-push it away seconds later.
2. Then clean the history (`git filter-repo` or BFG) if the repo is public.
3. Enable push protection so it can't happen again.

Order matters. Cleaning history first while the key is live is the wrong priority.
