# 20 — Security

Assume every input is hostile and every secret will eventually be exposed by mistake.
Design so that neither is fatal.

## OWASP Top 10, mapped to this stack

| Risk                          | Where it bites here                              | Defence                            |
| ----------------------------- | ------------------------------------------------ | ---------------------------------- |
| Broken access control         | Missing tenant filter, IDOR in server actions     | `17`, `31`, RLS                    |
| Cryptographic failures        | Secrets in client bundle, weak hashing            | `env.ts`, argon2, HTTPS only       |
| Injection                     | `$queryRawUnsafe`, `$where`, shell interpolation  | Parameterized queries, Zod         |
| Insecure design               | No rate limits, no idempotency                    | `19`, `15`                         |
| Security misconfiguration     | Permissive CORS, missing headers, debug on        | Headers below, `25`                |
| Vulnerable dependencies       | Stale transitive deps                             | Dependabot + `pnpm audit` in CI    |
| Auth failures                 | Enumeration, no lockout, long tokens              | `16`, `18`                         |
| Data integrity failures       | Unverified webhooks, unsigned uploads             | `15`, signature checks             |
| Logging failures              | Secrets in logs, no audit trail                   | `35`, audit table                  |
| SSRF                          | User-supplied URLs (webhooks, image import)       | Allow-list + block private ranges  |

## Input validation

Zod at every boundary — HTTP body, query, params, webhook payloads, environment,
third-party responses. Validate **shape and range**, not just type: a `quantity` of
2,147,483,647 is well-typed and still an attack.

```ts
const schema = z.object({
  quantity: z.number().int().min(1).max(100),
  note: z.string().max(500),
  email: z.string().email().toLowerCase().trim(),
}).strict();      // reject unknown keys — blocks mass assignment
```

Never spread request data into a database write. Pick fields explicitly.

## Injection

- **SQL**: Prisma's query builder and tagged `$queryRaw` are parameterized. `$queryRawUnsafe`
  and string-built SQL are banned.
- **NoSQL**: cast and validate before querying — `{ email: { $ne: null } }` arriving as a
  body value is an auth bypass. Never pass a raw body object as a Mongo filter.
- **Command**: `execFile` with an argument array, never `exec` with interpolation.
- **XSS**: React escapes by default. `dangerouslySetInnerHTML` requires DOMPurify and a
  code comment justifying it. Sanitize markdown and any user HTML server-side.
- **Path traversal**: `path.resolve` then assert the result starts with the base directory.

## Secrets

- Nothing secret is ever prefixed `NEXT_PUBLIC_`.
- Nothing secret is imported into a file that a `"use client"` module can reach.
  `import "server-only"` makes this a build error — use it.
- `.env` in `.gitignore`; `.env.example` committed with placeholder values.
- Rotate on any suspicion. Assume a leaked key is used within minutes.
- Enable GitHub secret scanning and push protection on every repo.
- Use different keys per environment. A staging key must never work in production.

If a secret does leak: rotate first, investigate second. Revoking is cheap.

## Security headers

```ts
// next.config.ts
const headers = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Content-Security-Policy", value: csp },
];
```

CSP is the one that takes effort and the one that pays. Start in `Content-Security-Policy-
Report-Only`, collect violations, then enforce. Use a per-request nonce rather than
`unsafe-inline` for scripts.

Verify with securityheaders.com — aim for A, not D.

## Cookies

`httpOnly`, `secure`, `sameSite: "lax"` (or `"strict"` for admin), explicit `path`, and the
shortest workable `maxAge`. `__Host-` prefix for session cookies where possible. CSRF
tokens for any state-changing form that isn't protected by `sameSite`.

## File uploads

- Validate the **magic bytes**, not the extension or the `Content-Type` header.
- Cap size before reading the whole body.
- Generate your own filename; never use the client's.
- Store outside the web root — Supabase Storage or S3 with private ACLs and signed URLs.
- Strip EXIF from images (location data leaks).
- Never serve user uploads from your app's origin if they could be HTML — use a separate
  domain or force `Content-Disposition: attachment`.

## SSRF

Any feature that fetches a user-supplied URL (webhook testing, image import, link preview)
must: resolve the hostname, reject private/loopback/link-local ranges and cloud metadata
IPs (`169.254.169.254`), allow only http/https, disable redirects or re-validate each hop,
and set a short timeout.

## Dependencies

- `pnpm audit --audit-level=high` in CI, failing the build.
- Dependabot or Renovate on a weekly cadence; batch patch updates.
- Before adding a package: check downloads, last publish, open issues, and whether it pulls
  50 transitive deps. Prefer the standard library.
- Lockfile committed and used in CI (`--frozen-lockfile`).

## Third-party integrations

Verify every webhook signature with `timingSafeEqual`. Store provider keys server-side
only. Re-fetch financial values from the provider rather than trusting the payload. Set
timeouts on every outbound call. Log the provider's request id for support.

## Data protection

- Encrypt in transit (TLS everywhere, HSTS) and at rest (managed by Supabase/Atlas).
- Minimize what you collect. The safest PII is the field you didn't add.
- Encrypt sensitive columns at the application layer (BVN, government ids) with a key in a
  secrets manager, not in the same database.
- Have a deletion path: NDPR and GDPR both require it. Soft-delete for recovery, hard-delete
  on a schedule.
- Don't put production data in staging. If you must, anonymize it.

## Incident response

Write this before you need it, in `docs/INCIDENT.md`:

1. Contain — revoke keys, disable the endpoint, take the feature down.
2. Assess — what data, whose, how long, via what.
3. Preserve — snapshot logs and the audit table before anything is rotated away.
4. Notify — affected users, and NDPR's 72-hour window where applicable.
5. Fix and write a blameless postmortem with one concrete prevention item.

## Pre-launch security checklist

- [ ] Every query tenant-scoped; RLS enabled where clients touch the DB
- [ ] No `NEXT_PUBLIC_` secret; `server-only` on all query/action modules
- [ ] Rate limits on auth, writes, and expensive endpoints
- [ ] Security headers score A; CSP enforced
- [ ] Webhook signatures verified; idempotency keys stored
- [ ] Uploads validated, private, and served signed
- [ ] `pnpm audit` clean at high/critical
- [ ] Logs redact tokens, passwords, PII
- [ ] Audit log for permission and money changes
- [ ] Backups exist **and a restore has been tested**
