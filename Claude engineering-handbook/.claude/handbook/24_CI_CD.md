# 24 — CI/CD

## Principles

- **Every push runs the checks.** If it isn't in CI, it isn't enforced.
- **CI must be fast.** Under 5 minutes or people start bypassing it.
- **The same commands run locally and in CI.** No CI-only magic.
- **A red build blocks merge.** No exceptions, no "I'll fix it after".

## Pipeline stages

```
push → install (cached) → lint → typecheck → unit+integration → build → preview deploy
                                                                    ↓
merge to main → migrate → deploy production → smoke test → notify
```

## Main workflow

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push: { branches: [main] }

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_USER: test, POSTGRES_PASSWORD: test, POSTGRES_DB: test }
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-retries 5
        ports: ["5432:5432"]
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/test
      DIRECT_URL: postgresql://test:test@localhost:5432/test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }

      - run: pnpm install --frozen-lockfile
      - run: pnpm prisma generate
      - run: pnpm prisma migrate deploy

      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test --coverage
      - run: pnpm build

      - run: pnpm audit --audit-level=high
        continue-on-error: true      # report, don't block, on transitive advisories
```

`--frozen-lockfile` is important: it fails if `package.json` and the lockfile disagree,
which catches a whole class of "works on my machine".

## Caching

Cache the pnpm store (via `setup-node`) and the Next build cache:

```yaml
- uses: actions/cache@v4
  with:
    path: .next/cache
    key: next-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('src/**') }}
    restore-keys: next-${{ hashFiles('pnpm-lock.yaml') }}-
```

Never cache `node_modules` directly — cache the package manager store and let it link.

## Preview deployments

Every PR gets its own URL. Vercel does this automatically; for other platforms, deploy to a
per-branch environment.

Rules: previews use a **separate database** (a branch/copy, never production), test API
keys, and a `noindex` header. Post the URL as a PR comment so review includes clicking.

## Deploy on merge

```yaml
# .github/workflows/deploy.yml
on:
  push: { branches: [main] }

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production        # requires approval + holds the secrets
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm prisma migrate deploy
        env: { DATABASE_URL: ${{ secrets.DIRECT_URL }} }
      - run: pnpm dlx vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }}
      - name: Smoke test
        run: curl -fsS --retry 5 --retry-delay 5 https://app.example.com/api/health
```

**Migrations run before the deploy**, and must be backwards-compatible with the code
currently running (`13_POSTGRESQL.md`, expand/contract). This is what lets you roll back
the app without rolling back the database.

## Required status checks

Protect `main`:

- Require PR before merging
- Require `verify` to pass
- Require branches be up to date
- Dismiss stale approvals on new commits
- No force push, no deletion
- Signed commits if you can be bothered (you should)

## Secrets

Store in GitHub Environments, scoped per environment. Never in workflow files. Use OIDC
for cloud providers instead of long-lived keys where available. Rotate quarterly. Enable
secret scanning and push protection.

## Other useful workflows

```yaml
# Weekly dependency updates
on: { schedule: [{ cron: "0 6 * * 1" }] }

# Lighthouse budget check on preview
- uses: treosh/lighthouse-ci-action@v11
  with: { urls: ${{ steps.deploy.outputs.url }}, budgetPath: ./lighthouse-budget.json }

# Nightly E2E against staging
on: { schedule: [{ cron: "0 2 * * *" }] }
```

Keep the Sentry-to-PR triage pipeline in its own workflow so a failure there never blocks
a deploy.

## Local parity

```json
{
  "scripts": {
    "verify": "pnpm lint && pnpm typecheck && pnpm test && pnpm build"
  }
}
```

Plus a pre-commit hook (husky + lint-staged) running `eslint --fix` and `prettier` on
staged files only. Don't run the full test suite on commit — people will start using
`--no-verify` and then nothing runs.

## When CI is red

1. Read the actual error, not the summary.
2. Reproduce locally with the same command.
3. Fix forward if it's trivial; revert if it's blocking others.
4. If it's flaky, quarantine the test *and open an issue the same day*. A permanently
   flaky suite trains you to ignore red, which is how a real failure ships.

## Rollback

Know how to do this before you need it:

- Vercel: promote the previous deployment (instant, no rebuild).
- Docker: redeploy the previous SHA tag.
- Database: you don't roll back migrations — you roll forward with a fix. This is why
  migrations must be additive and deployed ahead of the code that uses them.
