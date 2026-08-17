# 36 — Monitoring

You cannot watch eight products manually. Monitoring is how one person covers them all.

## The four questions

1. **Is it up?** — uptime checks
2. **Is it erroring?** — Sentry
3. **Is it slow?** — performance traces and Web Vitals
4. **Is the business working?** — orders, signups, payments (`37_ANALYTICS.md`)

Cover all four per product. Three out of four means a silent failure mode.

## Sentry setup

```ts
Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,      // ties errors to a deploy
  tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
    /^NEXT_(REDIRECT|NOT_FOUND)$/,
  ],
  beforeSend(event) {
    if (event.request?.cookies) delete event.request.cookies;
    if (event.request?.headers) delete event.request.headers.authorization;
    return event;
  },
});
```

Setting `release` is what makes "this started three deploys ago" answerable. Do it.

Tag events with what you'll want to filter by:

```ts
Sentry.setUser({ id: user.id });                       // id only, never email or name
Sentry.setTag("workspace", workspaceId);
Sentry.setTag("plan", workspace.plan);
```

## Error triage

Group by impact, not recency: users affected × frequency × whether it blocks a core flow.

A useful weekly rhythm:
- Resolve or assign everything new.
- Fix anything affecting more than a handful of users.
- Ignore (explicitly, not by neglect) the browser-extension noise.
- Set alert rules: a new issue in a payment or auth path pages you; everything else is a
  daily digest.

The Sentry MCP server plus a GitHub Action can turn a triaged issue into a draft PR — worth
setting up once and reusing across all eight products.

## Uptime

Better Stack, Cronitor, or UptimeRobot hitting `/api/health` every minute from two regions.
Alert after two consecutive failures (one failure is usually a blip). Also monitor:

- The public marketing page (a broken deploy often shows here first)
- One authenticated endpoint via a synthetic account
- The webhook receiver (providers stop retrying eventually)
- **Cron heartbeats** — a cron that silently stops is the most common invisible outage

```ts
await fetch(`https://cronitor.link/p/${id}/daily-digest?state=complete`);
```

## Performance monitoring

- **Sentry Performance** for backend spans: slowest transactions, slowest DB queries, N+1
  detection.
- **Vercel Speed Insights** or PostHog for real-user Web Vitals — field data, not lab.
- Database: Supabase dashboard for connections, slow queries, cache hit ratio.
- Queue: depth, oldest job, failure rate (`32_BACKGROUND_JOBS.md`).

Alert on p95 crossing your budget (`22_PERFORMANCE.md`), not on individual slow requests.

## Health endpoints

```ts
// /api/health — cheap, no DB. Load balancers hammer this.
export async function GET() {
  return Response.json({ status: "ok", version: process.env.VERCEL_GIT_COMMIT_SHA });
}

// /api/ready — dependency check, called by monitoring, not by the LB
export async function GET() {
  const checks = await Promise.allSettled([
    db.$queryRaw`SELECT 1`,
    redis.ping(),
  ]);
  const ok = checks.every((c) => c.status === "fulfilled");
  return Response.json({ ok, checks: checks.map((c) => c.status) }, { status: ok ? 200 : 503 });
}
```

## Alerting rules

**Page me immediately (phone):**
- Site down > 2 minutes
- Payment webhook failing repeatedly
- Auth broken (login error rate spike)
- Database unreachable
- Error rate > 5% of requests

**Notify (Slack/email, working hours):**
- New error affecting > 10 users
- p95 latency above budget for 15 minutes
- Queue depth growing for 30 minutes
- Bounce rate > 2%
- Approaching a provider spend cap

**Dashboard only:**
- Everything else

If an alert fires and you don't act, delete the alert or fix the threshold. Alert fatigue
is how real incidents get missed.

## Dashboards

One page per product with: request rate, error rate, p95 latency, signups today, orders
today, revenue today, queue depth, and the last deploy. If you can't see the product's
health in 10 seconds, the dashboard is too detailed.

One portfolio-level page across all eight: up/down, error count, revenue. Check it daily.

## Incident practice

1. **Acknowledge** — stop the alert, note the start time.
2. **Mitigate before diagnosing** — roll back, flip the flag, disable the endpoint. Restore
   service first; understand it after.
3. **Communicate** — a status page or a tweet beats silence, even with no ETA.
4. **Diagnose** with logs, traces, and the deploy timeline.
5. **Fix forward**.
6. **Postmortem** — blameless, written the same week, with exactly one concrete prevention
   action. A postmortem with ten action items produces zero.

Keep a `docs/RUNBOOK.md`: how to roll back, rotate a key, restore a backup, drain a queue,
put up a maintenance page. Written calm, read panicked.

## Cost monitoring

Monitoring your bill is monitoring. Billing alerts on Vercel, Supabase, Upstash, the email
provider, and the Claude API at 50% and 80% of budget. A runaway job calling a paid API is
the classic solo-founder disaster.
