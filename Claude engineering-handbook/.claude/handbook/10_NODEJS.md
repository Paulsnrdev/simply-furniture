# 10 — Node.js

## Baseline

Node 20 LTS or 22 LTS, pinned in `.nvmrc`, `engines`, Dockerfile, and CI. ESM everywhere
(`"type": "module"`). pnpm as the package manager, lockfile committed.

```json
{ "type": "module", "engines": { "node": ">=20.11.0" }, "packageManager": "pnpm@9.x" }
```

## Async

- `async/await` only. No callbacks, no raw `.then()` chains in application code.
- Every `await` that can fail is inside a `try/catch` or has a caller that handles it.
- Parallelize independent work; don't `await` in a loop by accident.

```ts
// ✗ serial: 3 × latency
const user = await getUser(id);
const orders = await getOrders(id);
const plan = await getPlan(id);

// ✓ parallel
const [user, orders, plan] = await Promise.all([getUser(id), getOrders(id), getPlan(id)]);

// ✓ when partial failure is acceptable
const results = await Promise.allSettled(recipients.map(sendEmail));
```

Sequential loops are correct when order matters or you're rate-limited. Then be explicit
about the concurrency limit (`p-limit`) rather than firing 5,000 requests at once.

## Never block the event loop

One process, one thread for your JS. A 200ms synchronous loop stalls every concurrent
request.

- No `fs.readFileSync`, `crypto.pbkdf2Sync`, or big `JSON.parse` in a request path.
- CPU-heavy work (image processing, PDF generation, large CSV parsing) goes to a worker
  thread or a background job (`32_BACKGROUND_JOBS.md`).
- Stream large payloads instead of buffering them.

```ts
import { pipeline } from "node:stream/promises";
await pipeline(createReadStream(input), createGzip(), createWriteStream(output));
```

`pipeline` handles backpressure and cleanup; manual `.pipe()` chains leak on error.

## Errors

```ts
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "unhandled rejection");
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception");
  process.exit(1);
});
```

Crash on programmer errors; the process manager restarts a clean one. Handle operational
errors (network, validation, 404) in place. Use `cause` to preserve chains:

```ts
throw new AppError("Could not reach Paystack", "UPSTREAM", 502, { cause: error });
```

## Configuration

Read `process.env` exactly once, in a validated module (see `02_PROJECT_ARCHITECTURE.md`).
No `dotenv` in production — the platform injects env. Never commit `.env`; always commit
`.env.example`.

## Graceful shutdown

Required anywhere you run your own process (Express, workers, Docker, Railway, Fly).

```ts
const server = app.listen(port);

async function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  server.close();                       // stop accepting new connections
  await worker?.close();                // finish in-flight jobs
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
}

["SIGTERM", "SIGINT"].forEach((s) => process.on(s, () => shutdown(s)));
```

Add a forced-exit timer (~15s) so a stuck connection can't block a deploy forever.

## Useful built-ins (stop reaching for packages)

```ts
import { randomUUID, timingSafeEqual, createHmac } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const ac = AbortSignal.timeout(5_000);          // built-in fetch timeout
const res = await fetch(url, { signal: ac });
```

Global `fetch`, `structuredClone`, `AbortController`, `URL`, `URLSearchParams`, and
`node:test` all exist. Prefer them over `axios`, `lodash.clonedeep`, `node-fetch`, `uuid`.

Always prefix built-ins with `node:` — it's explicit and prevents shadowing.

## Outbound HTTP

Every external call gets a **timeout**, a **retry policy for idempotent verbs only**, and
error mapping. No naked `fetch` in a request path.

```ts
export async function httpJson<T>(url: string, init: RequestInit = {}, retries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8_000) });
      if (res.status >= 500 && attempt < retries) throw new Error(`upstream ${res.status}`);
      if (!res.ok) throw new AppError(`HTTP ${res.status}`, "UPSTREAM", res.status);
      return (await res.json()) as T;
    } catch (error) {
      if (attempt >= retries) throw error;
      await sleep(2 ** attempt * 250 + Math.random() * 100);   // exponential + jitter
    }
  }
}
```

Never retry a POST that creates or charges unless it carries an idempotency key.

## Security in Node specifically

- `pnpm audit` in CI; upgrade transitive vulns rather than ignoring them.
- Never `child_process.exec` with interpolated user input — use `execFile` with an argument
  array, or don't shell out at all.
- Path traversal: `path.resolve` the user segment and assert it stays inside the base dir.
- Use `timingSafeEqual` for comparing secrets, tokens, and webhook signatures.
- Set explicit body-size limits on anything that accepts uploads.

## Scripts

One-off and maintenance scripts live in `scripts/`, run with `tsx`, are idempotent, take
`--dry-run`, log what they touched, and process in batches with a delay so they don't melt
the database.

```ts
// scripts/backfill-order-totals.ts
const BATCH = 500;
let cursor: string | undefined;
for (;;) {
  const rows = await db.order.findMany({ take: BATCH, skip: cursor ? 1 : 0, cursor: cursor ? { id: cursor } : undefined, orderBy: { id: "asc" } });
  if (!rows.length) break;
  if (!dryRun) await db.$transaction(rows.map(updateTotal));
  cursor = rows.at(-1)!.id;
  logger.info({ cursor, count: rows.length }, "batch done");
  await sleep(100);
}
```

## Observability hooks

Structured logs via pino (`35_LOGGING.md`), Sentry initialized at process start, and a
`/health` endpoint that checks the DB and returns quickly.
