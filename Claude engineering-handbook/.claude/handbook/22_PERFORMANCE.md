# 22 — Performance

## Budgets

Measure against these on a mid-range Android over 4G, not a MacBook on fibre.

| Metric                          | Target    | Fail       |
| ------------------------------- | --------- | ---------- |
| LCP                             | < 2.0s    | > 2.5s     |
| INP                             | < 200ms   | > 500ms    |
| CLS                             | < 0.05    | > 0.1      |
| TTFB                            | < 500ms   | > 800ms    |
| First-load JS (route)           | < 150KB gz| > 250KB    |
| API p95                         | < 300ms   | > 1s       |
| DB query in a request path      | < 50ms    | > 200ms    |

Set these in Lighthouse CI so a regression fails the PR rather than being discovered by a
customer.

## Measure before optimizing

```bash
ANALYZE=true pnpm build     # @next/bundle-analyzer
pnpm dlx lighthouse <url> --view
```

Sources of truth: real-user data (Vercel Speed Insights / PostHog web vitals) > lab
Lighthouse > your local machine, which is lying to you.

For the backend: Sentry performance traces, `pg_stat_statements`, and Prisma query logs.
Find the slowest *endpoint*, then the slowest *query inside it*. Don't guess.

## Frontend: the big wins, in order

1. **Ship less JavaScript.** Server Components by default; `"use client"` only on leaves.
   Check what a route actually ships in the build output.
2. **Split heavy client libraries.**
   ```ts
   const Chart = dynamic(() => import("./revenue-chart"), { ssr: false, loading: () => <ChartSkeleton /> });
   ```
   Charts, rich text editors, maps, PDF viewers, and date pickers are usually 100KB+ each.
3. **Images.** `next/image` with correct `sizes`, AVIF/WebP, `priority` on the LCP image
   only, and explicit dimensions to prevent CLS. An unoptimized hero image is the single
   most common LCP failure.
4. **Fonts.** `next/font` with `display: "swap"` and preloaded subsets. Self-hosted, never
   a render-blocking `<link>` to Google.
5. **Stream.** `<Suspense>` around slow sections so the shell paints immediately instead of
   the whole page waiting on one aggregate query.
6. **Third-party scripts.** Each analytics/chat/pixel tag costs real INP. Load with
   `next/script` `strategy="lazyOnload"`, and audit the list quarterly — most can go.

## Rendering strategy

| Content                        | Strategy                     |
| ------------------------------ | ---------------------------- |
| Marketing, docs, blog          | Static (SSG)                 |
| Public storefront, catalogs    | ISR (`revalidate = 300`) + tag invalidation |
| Authenticated dashboard        | Dynamic, streamed with Suspense |
| Highly interactive editors     | Static shell + client island |

Cache aggressively at the edge for anything not user-specific. Never cache a personalized
response without the user in the key.

## Database performance

The most common cause of a slow SaaS page is not JavaScript.

- **N+1 queries.** One query with `include`, not a loop. Log query counts per request in
  dev — a page issuing 40 queries is a bug.
- **Missing indexes.** Every filter, sort, and FK. `EXPLAIN ANALYZE` anything over 100ms.
- **`SELECT *`.** Use `select` with only the fields the UI renders.
- **Offset pagination** at depth. Use keyset (`13_POSTGRESQL.md`).
- **Counting everything.** `COUNT(*)` on a large table for a "342 results" label is often
  the slowest query on the page. Use `EXISTS`, an approximate count, or drop the label.
- **Aggregates in the request path.** Precompute daily rollups in a background job and read
  from a summary table.

```ts
// Cache expensive shared reads
export const getPlanLimits = unstable_cache(
  async () => db.plan.findMany(),
  ["plan-limits"],
  { revalidate: 3600, tags: ["plans"] },
);
```

## Caching layers

```
Browser cache        → static assets, immutable hashed filenames
CDN / edge           → static pages, ISR, public API GETs
unstable_cache       → shared server-side computation
Redis                → session, rate limit counters, hot lookups
React cache()        → per-request memoization (dedupes the same query in one render)
```

Rules: cache the expensive and stable; invalidate by tag on write; never cache
tenant-scoped data under a shared key; always set a TTL — an unbounded cache is a memory
leak with extra steps.

## Perceived performance

Often cheaper and more valuable than real performance:

- Skeletons matching the final layout (no shift when data lands).
- Optimistic updates for likely-to-succeed actions.
- Prefetch on hover/viewport (`<Link>` does this by default).
- Instant feedback on click, even if the result takes 800ms.
- Stream the parts that are ready instead of waiting for the slowest.

## Node/API performance

- Parallelize independent awaits (`Promise.all`).
- Never block the event loop — see `10_NODEJS.md`.
- Move slow work out of the request: email, PDF generation, exports, AI calls → queue.
- Set timeouts on every outbound call so one slow upstream doesn't cascade.
- Compress responses (`gzip`/`brotli`) — usually the platform does this.
- Connection pooling correct for serverless (`13`, `14`).

## When something is slow, in order

1. Reproduce it and **measure** — which request, which span, which query?
2. Is it the database? (Usually.) → index, rewrite, or precompute.
3. Is it waterfall latency? → parallelize or stream.
4. Is it payload size? → paginate, select fewer fields, compress.
5. Is it client JS? → split, defer, or move to the server.
6. Only then: caching. Caching a slow query hides the problem until invalidation.

Re-measure after each change. If it didn't move the number, revert it — you've added
complexity for nothing.

## Anti-patterns

- Optimizing without a profile.
- `useMemo` everywhere as "performance work".
- Caching to paper over an unindexed query.
- Loading 5,000 rows and filtering in JavaScript.
- Fetching in a client `useEffect` what a Server Component could render.
- Adding a Redis cache before adding an index.
