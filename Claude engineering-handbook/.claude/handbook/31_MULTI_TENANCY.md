# 31 — Multi-Tenancy

One missed `where` clause is a customer seeing another customer's data. Treat this as the
highest-severity category in the codebase.

## Model: shared database, shared schema, `workspaceId` column

For this portfolio (many products, one operator, thousands not millions of tenants), a
single database with a tenant column is right. Schema-per-tenant and database-per-tenant
multiply migration and operational cost by the number of customers — unaffordable solo.

```prisma
model Workspace {
  id        String       @id @default(uuid())
  slug      String       @unique          // used in URLs and subdomains
  name      String
  plan      Plan         @default(FREE)
  members   Membership[]
  products  Product[]
  orders    Order[]
  deletedAt DateTime?
}

model Product {
  id          String    @id @default(uuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  slug        String

  @@unique([workspaceId, slug])     // unique WITHIN a tenant, not globally
  @@index([workspaceId, createdAt])
}
```

**Every** tenant-owned table gets `workspaceId`, an index on it, and every unique
constraint is scoped by it. A globally-unique product slug means the first customer to
register "hoodie" blocks everyone else.

## Resolving the tenant

Pick one and be consistent:

| Strategy               | URL                         | Notes                             |
| ---------------------- | --------------------------- | --------------------------------- |
| Path segment           | `app.com/acme/orders`       | Simplest. Default choice.         |
| Subdomain              | `acme.app.com/orders`       | Nicer branding; needs wildcard DNS + cert |
| Custom domain          | `shop.acme.com`             | For storefronts; needs domain verification |

Path segments avoid an entire class of cookie, CORS, and certificate problems. Use
subdomains and custom domains for public-facing storefronts, where branding is the product.

```ts
// middleware.ts — subdomain → rewrite
const host = req.headers.get("host") ?? "";
const sub = host.split(".")[0];
if (sub && sub !== "app" && sub !== "www") {
  return NextResponse.rewrite(new URL(`/s/${sub}${url.pathname}`, req.url));
}
```

**Never take the workspace id from the request body or a client-supplied header.** Derive
it from the URL, then verify membership against the session.

## The single source of tenant context

```ts
// src/server/context.ts
import "server-only";
import { cache } from "react";

export const requireWorkspace = cache(async (slug?: string) => {
  const user = await requireUser();
  const workspaceSlug = slug ?? (await getSlugFromRoute());

  const membership = await db.membership.findFirst({
    where: { userId: user.id, workspace: { slug: workspaceSlug, deletedAt: null } },
    include: { workspace: true },
  });
  if (!membership) notFound();       // don't confirm the workspace exists

  return { userId: user.id, workspaceId: membership.workspaceId, role: membership.role };
});
```

Every query function, server action, and route handler starts with this. No exceptions.

## Three layers of isolation

**1. Explicit scoping in every query.** The primary defence.

```ts
// ✗ IDOR
db.order.findUnique({ where: { id } });
// ✓
db.order.findFirst({ where: { id, workspaceId } });
```

**2. A Prisma extension as a backstop** — injects the filter if someone forgets:

```ts
const TENANT_MODELS = new Set(["Product", "Order", "Customer", "Invoice"]);

export const scopedDb = (workspaceId: string) =>
  db.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (TENANT_MODELS.has(model) && !SAFE_OPS.has(operation)) {
            args.where = { ...(args.where ?? {}), workspaceId };
          }
          return query(args);
        },
      },
    },
  });
```

**3. Postgres RLS** — survives an application bug entirely (`13_POSTGRESQL.md`). Essential
if any client talks to Supabase directly with the anon key.

Three layers because you will eventually forget one.

## Cross-tenant operations

Admin tooling, analytics, and background jobs legitimately cross tenants. Isolate them:

- A separate `adminDb` client, used only in `src/server/admin/`, with an ESLint rule
  banning its import elsewhere.
- Every cross-tenant read is audit-logged with the operator's identity.
- Background jobs receive `workspaceId` in the payload and scope like any request.

Never reuse the admin client for a user-facing path "just this once".

## Per-tenant limits

```ts
const PLAN_LIMITS = {
  FREE:  { products: 20,   ordersPerMonth: 100,   members: 1,  storageBytes: 100_000_000 },
  PRO:   { products: 1000, ordersPerMonth: 5000,  members: 10, storageBytes: 5_000_000_000 },
  SCALE: { products: Infinity, ordersPerMonth: Infinity, members: 50, storageBytes: 50_000_000_000 },
} as const;

export async function assertWithinLimit(workspaceId: string, resource: keyof Limits) {
  const [plan, used] = await Promise.all([getPlan(workspaceId), countUsage(workspaceId, resource)]);
  if (used >= PLAN_LIMITS[plan][resource]) {
    throw new AppError(`You've reached your ${resource} limit on the ${plan} plan.`, "LIMIT_REACHED", 402);
  }
}
```

Enforce server-side at creation. Show usage in the UI *before* the wall, not at it. When
someone downgrades over the limit, restrict creation but don't delete their data.

Also protect the noisy-neighbour case: per-workspace rate limits so one tenant's import
script can't starve the rest (`19_RATE_LIMITING.md`).

## Onboarding a tenant

```ts
await db.$transaction(async (tx) => {
  const workspace = await tx.workspace.create({ data: { name, slug: await uniqueSlug(name) } });
  await tx.membership.create({ data: { userId, workspaceId: workspace.id, role: "OWNER" } });
  await tx.settings.create({ data: { workspaceId: workspace.id, ...defaults } });
});
```

Reserve slugs (`api`, `app`, `admin`, `www`, `help`, `status`, `blog`, `mail`) so a tenant
can't take a route you need.

## Offboarding

Soft-delete first (`deletedAt`), exclude from every query, retain for 30–60 days, email a
data export, then hard-delete on a schedule. `onDelete: Cascade` on every relation makes
the hard delete a single statement — verify it actually cascades before you rely on it.

## Testing tenant isolation

Write these four tests for every tenant-owned resource. They are the cheapest security
tests you will ever write:

```ts
it("returns the resource for a member", ...)
it("returns 404 for a non-member", ...)
it("returns 404 for a valid id from another workspace", ...)
it("does not include another workspace's rows in the list", ...)
```

Run a repo-wide check in review: search for `findUnique(` on tenant models. Each hit is a
question to answer.
