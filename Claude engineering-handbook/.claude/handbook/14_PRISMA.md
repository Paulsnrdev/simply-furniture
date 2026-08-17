# 14 — Prisma

## Client singleton

Hot reload in dev creates a new client per reload and exhausts connections.

```ts
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

## Schema conventions

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")     // pooled
  directUrl = env("DIRECT_URL")       // migrations
}

model Workspace {
  id        String   @id @default(uuid()) @db.Uuid
  slug      String   @unique
  name      String
  orders    Order[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("workspaces")
}

model Order {
  id          String      @id @default(uuid()) @db.Uuid
  workspaceId String      @map("workspace_id") @db.Uuid
  workspace   Workspace   @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  reference   String
  status      OrderStatus @default(PENDING)
  totalMinor  BigInt      @map("total_minor")
  currency    String      @default("NGN") @db.Char(3)
  items       OrderItem[]
  createdAt   DateTime    @default(now()) @map("created_at")

  @@unique([workspaceId, reference])
  @@index([workspaceId, status, createdAt(sort: Desc)])
  @@map("orders")
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
}
```

Conventions: camelCase in Prisma, `@map`/`@@map` to snake_case in the database. Explicit
`@@index` for every access pattern. `onDelete` on every relation. Money as `BigInt` minor
units (serialize with `.toString()` — `BigInt` is not JSON-safe).

## Query patterns

```ts
// select over include when you don't need everything
const order = await db.order.findFirst({
  where: { id, workspaceId },                    // tenant scope, always
  select: {
    id: true, reference: true, status: true, totalMinor: true,
    items: { select: { name: true, quantity: true, priceMinor: true } },
  },
});
```

- `findFirst` with a tenant filter, **not** `findUnique({ where: { id } })` — the latter
  returns another tenant's row.
- `findUniqueOrThrow` / `findFirstOrThrow` when absence is a genuine error.
- Never loop queries — that's an N+1:

```ts
// ✗ N+1
for (const order of orders) order.customer = await db.customer.findUnique(...);

// ✓ one query
const orders = await db.order.findMany({ where: { workspaceId }, include: { customer: true } });
```

Prisma's `include` issues a second query and joins in memory; that's fine and predictable.
For heavy reporting, use `$queryRaw` with `Prisma.sql` instead.

## Transactions

```ts
// interactive — use when later steps depend on earlier results
await db.$transaction(async (tx) => {
  const order = await tx.order.create({ data: { ...input, workspaceId } });
  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: qty } },
  });
  return order;
}, { timeout: 10_000, isolationLevel: "Serializable" });

// batch — independent writes, one round trip
await db.$transaction([
  db.order.update({ where: { id }, data: { status: "PAID" } }),
  db.payment.create({ data: payment }),
]);
```

Rules: no HTTP calls, no email sends, no long computation inside a transaction. Keep them
under a couple of seconds. Enqueue side effects **after** the commit.

## Atomic operations

```ts
// ✓ atomic, and the where clause prevents overselling
const updated = await db.product.updateMany({
  where: { id: productId, workspaceId, stock: { gte: qty } },
  data: { stock: { decrement: qty } },
});
if (updated.count === 0) throw new AppError("Out of stock", "CONFLICT", 409);
```

Use `increment`, `decrement`, `multiply`, `push` instead of read-modify-write. Use
`upsert` instead of "find then create or update".

## Tenant safety extension

Defence in depth against a forgotten `where`:

```ts
export function forWorkspace(workspaceId: string) {
  return db.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query, operation }) {
          if (TENANT_MODELS.has(model) && READ_WRITE_OPS.has(operation)) {
            args.where = { ...args.where, workspaceId };
          }
          return query(args);
        },
      },
    },
  });
}
```

This is a backstop, not permission to stop writing tenant filters explicitly. Pair it with
Postgres RLS (`13_POSTGRESQL.md`) so a bug in one layer isn't a breach.

## Migrations

```bash
pnpm prisma migrate dev --name add_order_refunds   # dev: creates + applies
pnpm prisma migrate deploy                          # CI/prod: applies only
pnpm prisma migrate resolve --applied 2026...       # recover from a failed migration
pnpm prisma generate                                # after any schema change
```

- `db push` is for prototyping on a throwaway database only.
- Review the generated SQL before committing. Prisma will happily emit a destructive
  `DROP COLUMN`.
- Renaming a column: Prisma sees drop + add. Hand-edit the migration to `ALTER TABLE ...
  RENAME COLUMN` or you lose the data.
- Data migrations go in a separate script, not the SQL file, so they can be retried.
- Never edit a migration that has been applied anywhere.

## Seeding

```ts
// prisma/seed.ts — idempotent, safe to run repeatedly
await db.plan.upsert({
  where: { code: "pro" },
  update: {},
  create: { code: "pro", name: "Pro", priceMinor: 15_000_00, currency: "NGN" },
});
```

## Types

```ts
type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;
type OrderListItem = Prisma.OrderGetPayload<{ select: typeof orderListSelect }>;

export const orderListSelect = {
  id: true, reference: true, status: true, totalMinor: true, createdAt: true,
} satisfies Prisma.OrderSelect;
```

Define the `select` once with `satisfies`, reuse it in the query and the type. Never
hand-write a model interface.

## Serialization to the client

Prisma returns `Date`, `BigInt`, and `Decimal` — none survive JSON. Map to a DTO at the
boundary:

```ts
export function toOrderDto(order: OrderWithItems) {
  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    total: Number(order.totalMinor),      // safe: fits in a JS number for our ranges
    createdAt: order.createdAt.toISOString(),
  };
}
```

This is also where you strip fields the client must never see.

## Performance

- Log slow queries in dev; anything > 100ms in a request path deserves an index.
- `@@index` in the schema — don't rely on Prisma inferring them (it only adds them for
  some relations).
- Watch out: `include` on a list multiplies rows fetched. Paginate first, then include.
- For dashboards with heavy aggregates, use `$queryRaw` with `Prisma.sql` and a tagged
  template — **never** string interpolation (`$queryRawUnsafe` is an injection vector).

```ts
const rows = await db.$queryRaw<{ day: Date; total: bigint }[]>`
  SELECT date_trunc('day', created_at) AS day, SUM(total_minor) AS total
  FROM orders WHERE workspace_id = ${workspaceId}::uuid AND status = 'PAID'
  GROUP BY 1 ORDER BY 1
`;
```

## Serverless notes

Set `connection_limit=1` on the pooled URL, use Supabase's transaction-mode pooler with
`pgbouncer=true`, and don't call `$disconnect()` between requests in a warm lambda.
