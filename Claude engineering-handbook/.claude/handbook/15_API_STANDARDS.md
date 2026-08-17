# 15 — API Standards

Applies to Express routes, Next route handlers, and (in spirit) server actions.

## URL design

```
GET    /api/v1/orders                  list
POST   /api/v1/orders                  create
GET    /api/v1/orders/:id              read
PATCH  /api/v1/orders/:id              partial update
DELETE /api/v1/orders/:id              delete
POST   /api/v1/orders/:id/refund       action that isn't CRUD
GET    /api/v1/orders/:id/items        one level of nesting, max
```

- Plural nouns, `kebab-case` in paths, `camelCase` in JSON bodies.
- Verbs only for actions that don't map to CRUD (`/refund`, `/publish`, `/resend`).
- Version in the path from day one. Adding `/v2` later to an unversioned API is misery.
- Never expose internal identifiers or sequential integers.

## Status codes

| Code | Use                                                            |
| ---- | -------------------------------------------------------------- |
| 200  | OK with a body                                                  |
| 201  | Created (include the resource, and a `Location` header)         |
| 202  | Accepted — work queued (webhooks, exports)                      |
| 204  | Deleted / no content                                            |
| 400  | Malformed request (bad JSON, missing param)                     |
| 401  | Not authenticated                                               |
| 403  | Authenticated but not allowed                                   |
| 404  | Not found **or** not yours (don't confirm existence)            |
| 409  | Conflict — duplicate, version mismatch, insufficient stock      |
| 422  | Well-formed but semantically invalid (validation errors)        |
| 429  | Rate limited (with `Retry-After`)                               |
| 500  | Our bug                                                         |
| 502/503/504 | Upstream failed / degraded / timed out                  |

Never return 200 with `{ "error": ... }`. Never return 500 for a user mistake.

## Response envelope

Pick one shape and use it everywhere.

```jsonc
// success
{ "data": { "id": "ord_123", "status": "paid" }, "meta": { "requestId": "req_7f3a91" } }

// list
{
  "data": [ ... ],
  "meta": { "requestId": "req_7f3a91", "nextCursor": "eyJpZCI6Li4ufQ", "hasMore": true }
}

// error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields need attention.",
    "requestId": "req_7f3a91",
    "details": { "email": ["Enter a valid email address"] }
  }
}
```

`code` is a stable machine string clients can branch on. `message` is human-readable and
safe to display. `details` is optional and field-keyed. `requestId` appears on **every**
response and matches the log line.

## Validation

Zod at the boundary, always, for body, query, and params. Reject unknown fields on writes
(`.strict()`) so typos surface immediately. Coerce query strings deliberately:

```ts
const listQuerySchema = z.object({
  status: z.enum(["pending", "paid", "shipped"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
```

Cap `limit`. An uncapped `limit` is a denial-of-service invitation.

## Pagination

Cursor-based by default — stable under concurrent inserts and fast at any depth.

```
GET /api/v1/orders?limit=20&cursor=eyJpZCI6ImFiYyJ9
→ { "data": [...], "meta": { "nextCursor": "...", "hasMore": true } }
```

Offset pagination is acceptable only for small, admin-facing, stable datasets where users
need page numbers. Always return `hasMore`; only return a total count if it's cheap.

## Filtering, sorting, sparse fields

```
GET /api/v1/orders?status=paid&createdAfter=2026-01-01&sort=-createdAt&fields=id,reference
```

Allow-list sortable and filterable fields explicitly. Never pass a user string into an
`orderBy` or a SQL fragment.

## Idempotency

Any endpoint that creates something or moves money accepts an `Idempotency-Key` header.
Store the key with the response for 24h; a repeat returns the stored response instead of
acting twice.

```ts
const key = req.headers["idempotency-key"];
const existing = key && (await db.idempotencyKey.findUnique({ where: { key } }));
if (existing) return res.status(existing.status).json(existing.response);
```

This is what makes client retries and webhook redelivery safe.

## Errors are typed

```ts
export const ERROR_CODES = {
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UPSTREAM: 502,
  INTERNAL: 500,
} as const;
```

Client code branches on `code`, never on message text.

## Headers

- `Content-Type: application/json; charset=utf-8`
- `X-Request-Id` echoed on every response
- `Cache-Control: private, no-store` for authenticated responses
- `Retry-After` with every 429 and 503
- `RateLimit-*` (draft-7) on rate-limited endpoints
- CORS allow-list, never `*` with credentials

## Webhooks you receive

1. Read the **raw** body before any JSON parsing.
2. Verify the signature with `timingSafeEqual`.
3. Check the event id against a processed-events table (idempotency).
4. Enqueue the work and return 2xx within a couple of seconds.
5. Never trust the payload's amounts — re-fetch from the provider's API for anything
   financial.

## Webhooks you send

Sign with HMAC-SHA256 over `timestamp.body`, include the timestamp to prevent replay,
retry with exponential backoff for ~24h, expose delivery logs and a manual "resend", and
document the payload shape with a version field.

## Versioning and deprecation

Additive changes (new optional field, new endpoint) don't need a version. Breaking changes
(removing a field, changing a type, tightening validation) do. Deprecate with a
`Deprecation` header and a sunset date, and email known consumers. Support the old version
for at least 90 days.

## Documentation

Every public endpoint gets an OpenAPI entry (generate from Zod with `zod-to-openapi` so it
can't drift), a curl example, and its error codes listed. If it isn't documented, it isn't
public.
