# 16 — Authentication

**Do not build this from scratch.** Use Auth.js (NextAuth v5), Supabase Auth, or Clerk.
Hand-rolled auth is where solo projects get breached. This doc is about using them
correctly and understanding what's underneath.

## Choosing

| Situation                                    | Use                          |
| -------------------------------------------- | ---------------------------- |
| Next.js app, own database, full control       | Auth.js v5 + Prisma adapter  |
| Already on Supabase, want RLS to work         | Supabase Auth                |
| Want orgs/SSO/MFA without building them       | Clerk or WorkOS              |
| Standalone Express API                        | Session cookies + Redis store|

## Password storage

If you own passwords: **argon2id** (preferred) or **bcrypt** with cost ≥ 12. Nothing else.
Never MD5, SHA-256, or "salted SHA" — they're fast, which is exactly wrong.

```ts
import argon2 from "argon2";

const hash = await argon2.hash(password, {
  type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
});
const ok = await argon2.verify(hash, password);
```

Rules: minimum 8 characters (NIST), **no maximum below 64**, no forced composition rules,
no forced rotation, allow paste, and check against a breached-password list (k-anonymity
API from HIBP) rather than demanding a symbol.

## Sessions vs tokens

Default to **server-side sessions with an httpOnly cookie** for web apps. They're
revocable, invisible to JS, and simple.

```ts
cookies().set("session", sessionId, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
});
```

Use JWTs when you need stateless verification across services or for mobile/third-party
clients — with the caveats in `18_JWT.md`. Never store a session token in `localStorage`;
any XSS becomes account takeover.

Rotate the session id on login and on privilege change (session fixation). Invalidate all
sessions on password change and let users see and revoke active sessions.

## Login flow

1. Rate limit by IP **and** by account (`19_RATE_LIMITING.md`).
2. Look up the user; run the password hash comparison **even when the user doesn't exist**
   (dummy hash) so timing doesn't reveal registered emails.
3. Generic failure message: "Email or password is incorrect." Never "no account with that
   email".
4. On success: rotate session, log the event with IP and user agent, check for MFA.
5. Progressive delay or CAPTCHA after ~5 failures on one account.

## Email verification

Sign up → create user with `emailVerified: null` → send a single-use token (32 random
bytes, hashed in the DB, 24h expiry) → verify → mark verified. Gate meaningful actions on
verification, not the ability to log in. Rate limit resends.

```ts
const raw = randomBytes(32).toString("base64url");
await db.verificationToken.create({
  data: { userId, tokenHash: sha256(raw), expiresAt: addHours(new Date(), 24) },
});
```

Store the **hash**, send the raw token. A leaked database then contains nothing usable.

## Password reset

The one flow attackers probe most.

- Always respond "If that email exists, we've sent a link" — no enumeration.
- Token: 32 random bytes, hashed at rest, single use, 15–60 minute expiry.
- On use: delete the token, update the hash, **invalidate all sessions**, and email the
  user that their password changed.
- Rate limit requests per email and per IP.
- Never email the new password, and never include the token in a URL you also log.

## OAuth

Use the library's provider config. Non-negotiables:

- Validate the `state` parameter (CSRF) and use PKCE.
- Exact redirect URI allow-list — no wildcards.
- Only link an OAuth identity to an existing account if the provider says the email is
  verified; otherwise an attacker registers with your user's email at a sloppy provider
  and walks in.
- Store `provider + providerAccountId` as the unique key, not email.
- Request the minimum scopes.

## Magic links

Good UX for low-frequency B2B tools. Single use, ~10 minute expiry, invalidate on use,
rate limited, and warn that anyone with inbox access can log in. Don't use them for admin
accounts.

## MFA

TOTP (RFC 6238) via `otplib`. Store the secret encrypted. Generate 10 single-use recovery
codes, hashed. Require the current password to disable MFA. Allow a ±1 step window and
block reuse of a code within its window. Offer it on any account that can move money or
change billing.

## Middleware and route protection

Check the cookie's presence in middleware for a fast redirect, but verify the session in
the request path — edge middleware shouldn't hit your database, and a redirect is not a
security boundary.

```ts
// src/server/context.ts
import "server-only";
import { cache } from "react";

export const getSession = cache(async () => {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;
  return db.session.findFirst({
    where: { id: token, expiresAt: { gt: new Date() } },
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
  });
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}
```

Every server action and route handler calls `requireUser()` — not just the page that
renders the button.

## Logging out

Delete the server-side session record (not just the cookie), clear the cookie, and
redirect. "Log out everywhere" deletes all sessions for the user.

## What to log (and never log)

Log: sign-in success/failure, password reset requested/completed, MFA enrolled/disabled,
email changed, session revoked — with IP, user agent, and timestamp. Surface this to users
as a security activity list.

Never log: passwords, tokens, session ids, OTPs, recovery codes, `Authorization` headers.
See `35_LOGGING.md` for redaction.

## Checklist

- [ ] argon2id/bcrypt, never a fast hash
- [ ] httpOnly + secure + sameSite cookies; nothing sensitive in localStorage
- [ ] Session rotated on login and privilege change
- [ ] Generic errors; no user enumeration anywhere including reset and signup
- [ ] Reset and verification tokens hashed, single-use, short-lived
- [ ] Rate limits on login, signup, reset, resend, and OTP verify
- [ ] All sessions invalidated on password change
- [ ] OAuth state + PKCE + verified-email linking
- [ ] Security events logged and visible to the user
