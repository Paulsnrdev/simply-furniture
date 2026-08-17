# 35 — Logging

Logs exist to answer "what happened?" at 2am when you can't reproduce it. Optimize for
that moment.

## Structured, always

JSON, not string interpolation. You cannot query a sentence.

```ts
// ✗
console.log(`User ${userId} created order ${orderId} for ${amount}`);

// ✓
logger.info({ userId, orderId, amountMinor, workspaceId }, "order created");
```

Use **pino** — fast, JSON-native, works everywhere.

```ts
// src/lib/logger.ts
import pino from "pino";

export const logger = pino({
  level: env.LOG_LEVEL ?? (env.NODE_ENV === "production" ? "info" : "debug"),
  redact: {
    paths: [
      "password", "*.password", "passwordHash",
      "token", "*.token", "accessToken", "refreshToken",
      "authorization", "req.headers.authorization", "req.headers.cookie",
      "card", "*.cvv", "*.pan", "secret", "*.apiKey",
    ],
    censor: "[REDACTED]",
  },
  transport: env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,
});
```

## Levels, and what they mean here

| Level   | Meaning                                          | Example                              |
| ------- | ------------------------------------------------ | ------------------------------------ |
| `fatal` | Process cannot continue                          | Cannot connect to the database at boot |
| `error` | An operation failed; someone should look          | Payment webhook processing threw     |
| `warn`  | Degraded or unexpected, handled                   | Retrying an upstream call; rate limit hit |
| `info`  | Notable business events                           | Order created, user signed up, job completed |
| `debug` | Development detail                                | Query parameters, branch taken       |
| `trace` | Extremely verbose                                 | Rarely enabled                       |

Production runs at `info`. If a level is on and you never read it, it's costing money for
nothing.

## Correlation ids

The single most valuable practice. One id ties a request to its logs, its jobs, its emails,
and its Sentry event.

```ts
export const withRequestId = (req: Request) => {
  const requestId = req.headers.get("x-request-id") ?? randomUUID();
  return logger.child({ requestId });
};
```

Propagate it: into background jobs (in the payload), into outbound API calls (as a header),
and back to the client in the error envelope (`15_API_STANDARDS.md`). When a customer says
"it broke", you ask for the reference and find the exact request.

## What to log

**Do log:**
- Request start/finish with method, path, status, duration, userId, workspaceId
- Every error with the stack, the operation, and enough ids to reproduce
- Business events: signups, orders, payments, plan changes, refunds
- External calls: provider, endpoint, status, duration, provider request id
- Job lifecycle: enqueued, started, completed/failed, attempt number
- Auth events: login success/failure, password reset, permission denied
- Slow things: any query or request over its budget

**Never log:**
- Passwords, tokens, session ids, API keys, OTPs, recovery codes
- Full card numbers, CVV, BVN, government ids
- Full request bodies on auth or payment endpoints
- Email bodies, message contents, uploaded file contents
- Anything you'd be uncomfortable seeing in a screenshot of your log dashboard

The redact config above is a safety net, not a substitute for not logging it.

## Context over prose

```ts
// ✗ says nothing useful
logger.error("Something went wrong");

// ✓ tells you where to look
logger.error(
  { err: error, orderId, workspaceId, provider: "paystack", reference, attempt },
  "payment verification failed",
);
```

Message = a short, stable, greppable description of the event. Everything variable goes in
the object.

Keep messages consistent so they aggregate: always `"payment verification failed"`, never
sometimes `"Failed to verify payment"`.

## Errors

```ts
catch (error) {
  logger.error({ err: error, orderId }, "refund failed");   // pino serializes `err` properly
  Sentry.captureException(error, { tags: { orderId }, extra: { workspaceId } });
  throw error;   // don't log-and-swallow
}
```

Log **or** rethrow — never log at every level on the way up, or one failure becomes twelve
log lines and you can't tell how many things broke.

## Where logs go

- **Vercel**: built-in logs, short retention. Ship to a real destination for anything you'll
  need in a week — Axiom, Better Stack, or Datadog.
- **Sentry** for errors specifically (`36_MONITORING.md`); logs are for context, Sentry is
  for alerting and grouping.
- Retention: 30 days for application logs, 1+ year for audit records (which live in the
  database, not the log stream).

## Audit logs are not application logs

| | Application log | Audit log |
| --- | --- | --- |
| Purpose | Debugging | Accountability |
| Storage | Log service | Database table |
| Retention | 30 days | Years |
| Mutable | Rotated away | Append-only, never deleted |
| Audience | You | You, the customer, possibly a regulator |

Money, permissions, and data ownership changes go in the audit table (`17_AUTHORIZATION.md`).

## Cost control

Logging is metered. Common blowouts: `debug` left on in production, logging inside a tight
loop, logging full response bodies, and logging every successful health check. Sample
high-volume success paths (log 1%) and keep 100% of errors.

## Local development

`pino-pretty` for readable output. Turn on Prisma query logging when investigating
performance, off otherwise. `console.log` is fine while debugging — it just must not survive
the commit (`28_DEFINITION_OF_DONE.md`).
