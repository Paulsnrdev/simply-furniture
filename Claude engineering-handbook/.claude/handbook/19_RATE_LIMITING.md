# 19 — Rate Limiting

## Why

Rate limits protect three things: your bill (someone loops an endpoint that calls Claude
or sends email), your data (credential stuffing, scraping), and your availability (one
tenant starving the rest).

**Every public endpoint gets a limit.** The default is not "unlimited".

## Where to apply

| Endpoint class                    | Suggested limit               | Key            |
| --------------------------------- | ----------------------------- | -------------- |
| Login                             | 5 / 15 min                    | IP + email     |
| Signup                            | 3 / hour                      | IP             |
| Password reset request            | 3 / hour                      | IP + email     |
| Email/OTP resend                  | 3 / 10 min                    | user           |
| Generic authenticated API         | 100 / min                     | user or key    |
| Write endpoints                   | 20 / min                      | user           |
| Expensive (AI, export, report)    | 10 / hour                     | workspace      |
| Outbound email send               | plan quota / day              | workspace      |
| Public storefront reads           | 300 / min                     | IP             |
| Webhook receive                   | high, but capped              | source IP      |

Tune from real traffic. Set the initial number ~10× your legitimate p99, then tighten.

## Algorithm

**Sliding window** is the right default: no burst at the window boundary, cheap to
implement, easy to explain. Token bucket when you deliberately want to allow bursts (an
importer that batches 50 writes then idles).

Fixed windows allow 2× the limit across a boundary — avoid them for security-critical
endpoints.

## Implementation (Upstash Redis)

Works on serverless and edge, which is why it's the default here.

```ts
// src/lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const limiters = {
  login:     new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "15 m"), prefix: "rl:login", analytics: true }),
  api:       new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, "1 m"), prefix: "rl:api" }),
  expensive: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "rl:ai" }),
};

export async function enforce(limiter: Ratelimit, key: string) {
  const { success, limit, remaining, reset } = await limiter.limit(key);
  if (!success) {
    throw new AppError("Too many requests", "RATE_LIMITED", 429, {
      headers: {
        "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        "RateLimit-Limit": String(limit),
        "RateLimit-Remaining": String(remaining),
        "RateLimit-Reset": String(Math.ceil(reset / 1000)),
      },
    });
  }
}
```

For a long-running Express server, `express-rate-limit` with a Redis store is equivalent.
**In-memory limiters are useless in production** — each serverless instance and each replica
has its own counter.

## Choosing the key

- Authenticated: **user id** (or workspace id for shared quotas). Never IP alone —
  a whole office or mobile carrier shares one.
- Unauthenticated: IP, taken from the platform's trusted header
  (`x-forwarded-for` only when `trust proxy` is set correctly — otherwise it's spoofable).
- Login: **both** IP and account. Per-account stops targeted brute force; per-IP stops
  spraying across many accounts.
- Composite keys for expensive operations: `${workspaceId}:${operation}`.

## Layered limits

```
Cloudflare / platform WAF   →  volumetric, bot, and DDoS
Global per-IP limit         →  cheap, catches scrapers
Per-user / per-workspace    →  fairness between tenants
Per-endpoint                →  protects the expensive one
Per-resource quota          →  plan enforcement (emails/month, AI calls/day)
```

Quotas are not rate limits: a quota is a **plan entitlement** and should be enforced in
the domain layer with a clear upgrade message, not a 429.

## Responses

429 with:
- `Retry-After` in seconds — clients and crawlers respect it.
- `RateLimit-Limit` / `-Remaining` / `-Reset` (draft-7 headers).
- A body a human can read: "Too many attempts. Try again in 12 minutes."

In the UI, disable the button and count down rather than letting people hammer it.

## Login-specific defences

Rate limiting alone doesn't stop a distributed attack. Combine:

- Per-account counter (survives IP rotation).
- Progressive delay: 0s, 1s, 2s, 4s, 8s…
- CAPTCHA (Turnstile) after ~5 failures.
- Temporary account lock after ~10, with an email to the owner.
- Alert on a spike in failures across accounts — that's credential stuffing.

Reset the counter on successful login.

## Fail open or closed?

If Redis is down:

- **Auth endpoints: fail closed.** Better a brief outage than an open brute-force window.
- **Read endpoints: fail open**, log loudly, alert. Don't take the product down because the
  rate limiter is sick.

Make this decision explicitly per limiter; don't let it be an accident of where the
try/catch went.

## Cost-bearing operations

Anything that spends money per call — Claude API, SMS, email, image generation — needs
both a rate limit *and* a hard monthly cap per workspace, checked before the call and
recorded after. Alert yourself at 80% of your own provider budget. This is the difference
between a bad day and a bad month.

## Testing and monitoring

- Test that the 6th login attempt returns 429 and the headers are present.
- Test that limits are per-key (user A hitting the wall doesn't block user B).
- Dashboard: 429 rate per endpoint, top limited keys, and limiter latency.
- If legitimate users are hitting a limit regularly, the limit is wrong — fix the number,
  don't tell them to slow down.
