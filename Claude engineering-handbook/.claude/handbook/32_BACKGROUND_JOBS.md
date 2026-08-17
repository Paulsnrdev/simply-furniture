# 32 — Background Jobs

## What belongs in a job

Anything that is slow, retryable, or must survive the user closing the tab:

- Sending email and SMS
- Payment webhook processing
- AI/LLM calls (recommendation engines, summaries)
- Report and export generation
- Image and file processing
- Data sync with third parties
- Scheduled digests, reminders, and cleanups

**Rule:** if a request handler would take more than ~2 seconds, it's a job. Return `202`
with a job id, and let the client poll or receive a realtime update.

## Choosing a runner

| Situation                                  | Use                                   |
| ------------------------------------------ | ------------------------------------- |
| Vercel/serverless, no always-on process    | Upstash QStash (HTTP-delivered jobs)  |
| Simple recurring schedule                  | Vercel Cron → a route handler         |
| Long-running host (Railway, Fly, VPS)      | BullMQ + Redis                        |
| Heavy pipelines, complex retries, fan-out  | Inngest or Trigger.dev                |

QStash is the default here because it needs no always-on worker: it POSTs to your endpoint
with retries and scheduling handled for you.

## The four rules of jobs

**1. Idempotent.** Every job must be safe to run twice — at-least-once delivery is the
norm, not the exception.

```ts
export async function sendOrderConfirmation({ orderId }: { orderId: string }) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.confirmationSentAt) return;      // already done

  await sendEmail({ to: order.email, template: "order-confirmation", data: order });
  await db.order.update({ where: { id: orderId }, data: { confirmationSentAt: new Date() } });
}
```

Guard with a flag, a unique constraint, or a state transition — not with hope.

**2. Small payloads.** Pass ids, not objects. The record may have changed by the time the
job runs, and the queue is not your database.

```ts
await enqueue("order.confirm", { orderId });          // ✓
await enqueue("order.confirm", { order: fullOrder }); // ✗ stale and large
```

**3. Retry with backoff, and know what's retryable.** Network errors and 5xx: retry.
Validation errors and 4xx: fail immediately — retrying will never help.

```ts
if (error instanceof AppError && error.status < 500) throw new NonRetryableError(error);
```

**4. Every job has a dead letter path.** After max attempts, record the failure with the
payload so it can be inspected and replayed. A silently dropped job is worse than a loud
failure.

## QStash pattern

```ts
// enqueue
await qstash.publishJSON({
  url: `${env.APP_URL}/api/jobs/send-email`,
  body: { orderId },
  retries: 3,
  deduplicationId: `order-confirm-${orderId}`,   // provider-side idempotency
});

// receive
export async function POST(req: Request) {
  const isValid = await receiver.verify({
    signature: req.headers.get("upstash-signature") ?? "",
    body: await req.text(),
  });
  if (!isValid) return new Response("bad signature", { status: 401 });

  await handleJob(payload);
  return new Response("ok");
}
```

**Verify the signature** — the job endpoint is a public URL, and anyone can POST to it.

## BullMQ pattern (long-running host)

```ts
export const emailQueue = new Queue("email", { connection: redis });

new Worker("email", async (job) => handlers[job.name](job.data), {
  connection: redis,
  concurrency: 5,
  limiter: { max: 10, duration: 1000 },     // respect the provider's rate limit
});

await emailQueue.add("order-confirmation", { orderId }, {
  attempts: 5,
  backoff: { type: "exponential", delay: 2_000 },
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 86_400 },
});
```

Workers need graceful shutdown (`await worker.close()`) or a deploy kills in-flight jobs.

## Scheduled jobs

```json
// vercel.json
{ "crons": [
  { "path": "/api/cron/daily-digest",     "schedule": "0 7 * * *" },
  { "path": "/api/cron/expire-trials",    "schedule": "0 * * * *" },
  { "path": "/api/cron/cleanup-sessions", "schedule": "0 3 * * *" }
]}
```

Cron endpoints must:

- Verify `Authorization: Bearer ${CRON_SECRET}` — otherwise anyone can trigger them.
- Be idempotent (a cron can fire twice).
- Complete inside the platform's timeout, or fan out into individual queued jobs.
- Log a heartbeat, and alert if the heartbeat is missing (a cron that stops running is
  silent — that's the danger).

```ts
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const due = await db.trial.findMany({ where: { expiresAt: { lte: new Date() }, notifiedAt: null }, take: 500 });
  await Promise.allSettled(due.map((t) => enqueue("trial.expire", { trialId: t.id })));
  return Response.json({ processed: due.length });
}
```

Fan out rather than doing the work inline: the cron finds what needs doing, jobs do it.

## Transactions and jobs

**Enqueue after the commit, never inside the transaction.** If the transaction rolls back,
the job has already been sent and will operate on data that doesn't exist.

```ts
const order = await db.$transaction(async (tx) => { ... });
await enqueue("order.confirm", { orderId: order.id });   // ✓ after
```

If you need exactly-once semantics, use an outbox table: write the job row in the same
transaction, and have a poller dispatch it.

## Observability

Every job logs: name, id, payload ids (not payload contents), attempt number, duration, and
outcome. Track queue depth, oldest waiting job, failure rate, and p95 duration. Alert on:
depth growing without bound, a job failing repeatedly, and a cron that hasn't checked in.

Use a correlation id from the originating request so a job's logs join up with the request
that caused it (`35_LOGGING.md`).

## Common mistakes

- Doing work in the webhook handler instead of enqueuing it (provider times out, redelivers,
  you process twice).
- Passing full objects, then acting on stale data.
- No idempotency, so a retry sends the email twice.
- Retrying a validation failure 5 times with backoff.
- An unbounded `findMany` in a cron that works fine at 100 rows and dies at 100,000.
- No alert on a stalled queue — you find out from a customer.
- Jobs that assume they run in order. They don't.
