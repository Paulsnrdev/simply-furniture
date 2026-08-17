# 18 — JWT

## When to use one

JWTs are useful when a **different** service must verify a token without calling your
database, or when a non-browser client (mobile, CLI, partner API) holds credentials.

For a single Next.js app with its own database, **server-side sessions are simpler and
safer** — they're revocable instantly. Don't reach for JWTs by default.

| Need                                   | Use                          |
| -------------------------------------- | ---------------------------- |
| Web app, one backend                    | Session cookie + DB session  |
| Mobile app or third-party API client    | JWT access + refresh         |
| Service-to-service                      | Short-lived JWT or mTLS      |
| Anything requiring instant revocation   | Sessions, or JWT + denylist  |

## Algorithms

- **HS256** — symmetric. Fine when the same service signs and verifies.
- **RS256/ES256** — asymmetric. Use when a different party verifies; publish a JWKS.
- **`alg: none` is an attack.** Always pin the expected algorithm at verification time.
  Never let the token's own header choose.

```ts
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(env.JWT_SECRET);   // ≥ 32 bytes, random

const token = await new SignJWT({ sub: user.id, wsp: workspaceId, role })
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setIssuedAt()
  .setIssuer("api.chunkzthebrand.com")
  .setAudience("chunkz-web")
  .setExpirationTime("15m")
  .setJti(randomUUID())
  .sign(secret);

const { payload } = await jwtVerify(token, secret, {
  algorithms: ["HS256"],          // pin it
  issuer: "api.chunkzthebrand.com",
  audience: "chunkz-web",
  clockTolerance: 5,
});
```

Use `jose` (works on edge and Node, actively maintained). `jsonwebtoken` is acceptable in
Node-only services but doesn't run on the edge runtime.

## Claims

| Claim | Meaning                        | Rule                                    |
| ----- | ------------------------------ | --------------------------------------- |
| `sub` | user id                        | Required                                |
| `iss` | issuer                         | Required, verified                      |
| `aud` | audience                       | Required, verified                      |
| `exp` | expiry                         | Required. 15 min for access tokens      |
| `iat` | issued at                      | Required                                |
| `jti` | token id                       | Required for refresh tokens (rotation)  |

Custom claims: keep them short and stable (`wsp`, `role`, `plan`). Every byte rides on
every request.

**Never put in a JWT:** passwords, PII beyond an id, payment details, anything secret. The
payload is base64, not encrypted — anyone holding the token can read it.

**Never trust a claim that can go stale.** If you embed `role` and then demote the user,
the old token still says ADMIN until it expires. Keep access tokens short and re-check
sensitive permissions against the database.

## Access + refresh pattern

```
access token   15 minutes   in memory (mobile) or httpOnly cookie (web)
refresh token  30 days      httpOnly, secure, sameSite, path=/api/auth/refresh
```

Refresh tokens are **stored server-side (hashed) and rotated on every use**:

```ts
export async function rotateRefresh(rawToken: string) {
  const hash = sha256(rawToken);
  const record = await db.refreshToken.findUnique({ where: { tokenHash: hash } });

  if (!record || record.expiresAt < new Date()) throw new AppError("Invalid", "UNAUTHENTICATED", 401);

  if (record.usedAt) {
    // reuse detected → the token was stolen. Kill the whole family.
    await db.refreshToken.updateMany({ where: { familyId: record.familyId }, data: { revokedAt: new Date() } });
    throw new AppError("Session revoked", "UNAUTHENTICATED", 401);
  }

  await db.refreshToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return issueTokenPair(record.userId, record.familyId);
}
```

Reuse detection is the whole point of rotation. Without it, a stolen refresh token is
valid for 30 days.

## Storage

| Location            | Verdict                                                    |
| ------------------- | ---------------------------------------------------------- |
| `localStorage`      | **Never.** Any XSS reads it.                                |
| `sessionStorage`    | **Never.** Same problem.                                    |
| JS-readable cookie  | **Never.** Same problem.                                    |
| httpOnly cookie     | ✅ Web. Add `sameSite=lax` + CSRF protection for state changes. |
| In-memory variable  | ✅ SPA access tokens, refreshed on load                      |
| Secure device store | ✅ Mobile (Keychain / Keystore)                              |

## Revocation

JWTs are valid until they expire — that's the tradeoff. Mitigate with:

1. Short access-token lifetimes (15 minutes).
2. A Redis denylist keyed on `jti`, with TTL matching the remaining lifetime.
3. A `tokenVersion` integer on the user; bump it on password change or logout-everywhere,
   and include it in the token. Mismatch → reject.

```ts
if (payload.tv !== user.tokenVersion) throw new AppError("Session expired", "UNAUTHENTICATED", 401);
```

Option 3 costs one user lookup but gives you instant global revocation.

## Common mistakes

- Not verifying the signature (decoding is not verifying — `jwt.decode` ≠ `jwt.verify`).
- Accepting the algorithm from the token header (`alg` confusion, RS256→HS256 attack).
- Weak or reused secret. Use ≥ 32 random bytes, unique per environment.
- Long-lived access tokens "for convenience".
- Storing permissions in the token and never re-checking them.
- Putting the token in a URL — it lands in logs, referrers, and browser history.
- Forgetting to verify `iss`/`aud`, so a token from your staging environment works in prod.
- No refresh rotation, so theft is undetectable.

## Verifying at the edge

`jose` works in Next middleware, which makes JWTs attractive for edge auth. Keep it to a
cheap "is this token structurally valid and unexpired" check — full authorization still
happens in the request path where you can hit the database.
