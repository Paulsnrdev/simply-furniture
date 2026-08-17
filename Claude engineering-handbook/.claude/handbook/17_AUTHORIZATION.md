# 17 — Authorization

Authentication is *who you are*. Authorization is *what you may do*. Most real breaches in
small SaaS are authorization bugs — broken object-level access control, not cryptography.

## The two rules

1. **Deny by default.** Access is granted explicitly, never assumed.
2. **Check on the server, on every request, for every object.** Hiding a button is UX, not
   security. The server action behind it is a public endpoint.

## Model: RBAC scoped to a tenant

Roles live on the **membership**, not the user. The same person can be an owner of one
workspace and a viewer of another.

```prisma
model Membership {
  id          String   @id @default(uuid())
  userId      String
  workspaceId String
  role        Role     @default(MEMBER)
  @@unique([userId, workspaceId])
}

enum Role { OWNER ADMIN MEMBER VIEWER }
```

Permissions are derived from roles in code, not stored per user — simpler to reason about
and to change.

```ts
export const PERMISSIONS = {
  OWNER:  ["*"],
  ADMIN:  ["product:*", "order:*", "member:invite", "settings:read", "settings:update"],
  MEMBER: ["product:read", "product:create", "product:update", "order:read"],
  VIEWER: ["product:read", "order:read"],
} as const satisfies Record<Role, readonly string[]>;

export function can(role: Role, permission: Permission): boolean {
  const granted = PERMISSIONS[role];
  return granted.some(
    (p) => p === "*" || p === permission || (p.endsWith(":*") && permission.startsWith(p.slice(0, -1))),
  );
}
```

Reserve `OWNER` for: billing, deleting the workspace, transferring ownership, removing
other owners. Every workspace must always have at least one owner — enforce it.

## The single authorization gate

One function, called at the top of every action, query, and handler. If a code path
doesn't call it, that path is unprotected.

```ts
// src/server/authz.ts
import "server-only";

export async function authorize(permission: Permission, workspaceSlug: string) {
  const user = await requireUser();                          // 401 → redirect
  const membership = await db.membership.findFirst({
    where: { userId: user.id, workspace: { slug: workspaceSlug } },
    include: { workspace: { select: { id: true, slug: true } } },
  });
  if (!membership) notFound();                               // don't confirm existence
  if (!can(membership.role, permission)) {
    throw new AppError("Not allowed", "FORBIDDEN", 403);
  }
  return { user, role: membership.role, workspaceId: membership.workspace.id };
}
```

Returning `notFound()` rather than 403 for a workspace you're not a member of avoids
leaking which workspaces exist.

## Object-level checks (the one people miss)

Having permission to read *orders* is not permission to read *this* order.

```ts
// ✗ IDOR — any authenticated user can read any order by guessing the id
const order = await db.order.findUnique({ where: { id } });

// ✓ ownership is part of the query, not a separate check
const order = await db.order.findFirst({ where: { id, workspaceId } });
if (!order) notFound();
```

**Make the tenant/owner key part of every `where`.** Don't fetch-then-compare — a
fetch-then-compare that someone later refactors becomes a leak. See `31_MULTI_TENANCY.md`
for the Prisma extension and RLS backstops.

## Layered defence

| Layer                  | Protects against                                    |
| ---------------------- | --------------------------------------------------- |
| UI (hide/disable)      | Confusion. Not an attacker.                          |
| Route/middleware       | Casual URL poking                                    |
| Server action / handler| The real check — `authorize()` here                  |
| Query scoping          | Missed checks, IDOR                                  |
| Postgres RLS           | Application bugs                                     |
| Audit log              | Detecting what a breach touched                      |

Assume any one layer will fail. That's why there are six.

## Client-side rendering of permissions

Send the *derived* permissions to the client so the UI can hide things — never the raw
role logic, and never rely on it.

```tsx
const { can } = useWorkspace();
{can("order:refund") && <RefundButton orderId={order.id} />}
```

The `RefundButton`'s action still calls `authorize("order:refund", slug)`.

## API keys and service access

For programmatic access: generate a key with a visible prefix (`sk_live_…`), store only a
hash, scope it to a workspace and a permission set, show it once, support rotation and
revocation, record `lastUsedAt`, and rate limit per key. Never let an API key exceed the
permissions of the member who created it.

## Impersonation (support access)

If you build "log in as customer": require an owner-level internal role, require a reason,
time-box the session, banner the UI loudly, make it read-only where possible, and write an
audit record. Never silently impersonate.

## Audit log

Anything that changes money, permissions, or data ownership gets a row — not a log line.

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  workspaceId String
  actorId     String
  action      String   // "order.refunded"
  targetType  String   // "Order"
  targetId    String
  metadata    Json
  ip          String?
  createdAt   DateTime @default(now())
  @@index([workspaceId, createdAt(sort: Desc)])
}
```

Append-only. No updates, no deletes. Surface it to workspace owners.

## Common vulnerabilities to check for

- **IDOR**: any `findUnique({ where: { id } })` on tenant data.
- **Mass assignment**: spreading `req.body` into a Prisma `data` — a user sets
  `role: "OWNER"`. Always pick fields explicitly or use a strict Zod schema.
- **Privilege escalation**: an ADMIN editing their own role, or inviting someone as OWNER.
- **Missing checks on the "second" endpoint**: the list is protected, the export isn't.
- **Client-trusted workspace id**: taking `workspaceId` from the request body instead of
  deriving it from the session + slug.

## Testing authorization

For every protected resource, write tests for: owner allowed, viewer denied, non-member
gets 404, and cross-tenant id returns 404. These four tests catch most real bugs and are
cheap to write once you have a factory.
