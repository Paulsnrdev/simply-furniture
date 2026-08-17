# 02 — Project Architecture

Where code goes, and why. Read this before creating any new folder.

## Shape of a product

Every SaaS product in this portfolio is an **independent Next.js 15 application** with
its own database, deployment, domain, and repo. Shared code moves between them by
copy-paste until it has stabilized in three products; only then does it become a package.

```
apps/store-builder/            # one product = one repo in practice
├─ CLAUDE.md
├─ .claude/handbook/           # this handbook
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ public/
├─ src/
│  ├─ app/                     # routing ONLY — see below
│  ├─ components/
│  │  ├─ ui/                   # shadcn primitives, no business logic
│  │  └─ shared/               # cross-feature composites (PageHeader, DataTable)
│  ├─ features/                # ← the important one
│  │  ├─ orders/
│  │  ├─ products/
│  │  └─ billing/
│  ├─ lib/                     # infrastructure adapters, no business logic
│  │  ├─ db.ts                 # prisma singleton
│  │  ├─ auth.ts
│  │  ├─ email/
│  │  ├─ payments/
│  │  └─ env.ts                # validated env, see below
│  ├─ server/                  # server-only cross-cutting (middleware, context)
│  ├─ styles/
│  └─ types/                   # only truly global types
├─ tests/
└─ scripts/
```

## Feature-first, not layer-first

Layer-first (`controllers/`, `services/`, `models/`) means one feature is smeared across
six folders and every change is a six-file diff. Feature-first keeps a change local.

```
src/features/orders/
├─ components/
│  ├─ order-table.tsx
│  ├─ order-status-badge.tsx
│  └─ refund-dialog.tsx
├─ actions.ts          # server actions — the write API for this feature
├─ queries.ts          # server-side reads (cached, tenant-scoped)
├─ schemas.ts          # Zod: input validation + inferred types
├─ types.ts            # feature types not derivable from schemas/Prisma
├─ constants.ts
├─ use-order-filters.ts  # client hooks
└─ __tests__/
```

**Rule:** a feature may import from `components/ui`, `components/shared`, `lib`, and its
own folder. A feature may **not** import from another feature's internals.

Cross-feature needs go one of three ways:

1. The consumer feature re-derives it from the DB with its own query. (Usually right.)
2. It is genuinely shared domain logic → promote to `src/lib/<domain>/`.
3. The two features were actually one feature → merge them.

## `app/` is routing, nothing else

Files in `src/app/` should be thin. A `page.tsx` fetches and composes; it does not
contain business logic, complex JSX trees, or inline data transformation.

```
src/app/
├─ (marketing)/                # route group: public site, own layout
│  ├─ page.tsx
│  └─ pricing/page.tsx
├─ (auth)/
│  ├─ login/page.tsx
│  └─ register/page.tsx
├─ (dashboard)/                # authenticated app
│  ├─ layout.tsx               # session guard + shell
│  └─ [workspace]/
│     ├─ orders/
│     │  ├─ page.tsx
│     │  ├─ loading.tsx
│     │  ├─ error.tsx
│     │  └─ [orderId]/page.tsx
│     └─ settings/page.tsx
├─ api/
│  ├─ webhooks/paystack/route.ts
│  └─ health/route.ts
└─ layout.tsx
```

A good `page.tsx`:

```tsx
// src/app/(dashboard)/[workspace]/orders/page.tsx
import { getOrders } from "@/features/orders/queries";
import { OrderTable } from "@/features/orders/components/order-table";
import { PageHeader } from "@/components/shared/page-header";

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { workspace } = await params;
  const { status, page } = await searchParams;
  const orders = await getOrders({ workspace, status, page: Number(page ?? 1) });

  return (
    <>
      <PageHeader title="Orders" />
      <OrderTable orders={orders} />
    </>
  );
}
```

If a page grows past ~60 lines, the excess belongs in the feature folder.

## The dependency rule

Dependencies point **inward and downward**, never sideways or up.

```
app/  →  features/  →  lib/  →  (node_modules, DB, external APIs)
           ↓
      components/
```

- `lib/` knows nothing about features. It is replaceable infrastructure.
- `features/` contains the domain rules.
- `app/` contains routing and composition.
- `components/ui/` knows nothing about anything — pure presentation.

If `lib/email` imports from `features/orders`, the layering is inverted; invert the
dependency by passing data in instead.

## `lib/` is adapters, not a junk drawer

Each subfolder wraps one external concern behind an interface *you* control:

```ts
// src/lib/email/index.ts — callers never import Resend/SES directly
export async function sendEmail(input: SendEmailInput): Promise<Result<string>> { ... }
```

Swapping Resend → SES then touches one folder. This is why `34_EMAIL.md` insists on it.

Never create `lib/utils.ts` beyond the shadcn `cn()` helper. Name by domain:
`lib/money.ts`, `lib/dates.ts`, `lib/slug.ts`.

## Environment variables

One validated module, imported everywhere. Nothing reads `process.env` directly.

```ts
// src/lib/env.ts
import { z } from "zod";

const server = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().startsWith("re_"),
  PAYSTACK_SECRET_KEY: z.string().startsWith("sk_"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const client = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export const env = {
  ...server.parse(process.env),
  ...client.parse({ NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL }),
};
```

Fail at boot, not at 2am on a webhook. Keep `.env.example` in sync in the same commit.

## Naming conventions

| Thing                  | Convention                | Example                        |
| ---------------------- | ------------------------- | ------------------------------ |
| Files & folders        | `kebab-case`              | `order-status-badge.tsx`       |
| React components       | `PascalCase`              | `OrderStatusBadge`             |
| Hooks                  | `use-` file, `useX` fn    | `use-order-filters.ts`         |
| Server actions         | verb first                | `createOrder`, `refundOrder`   |
| Queries                | `get*` / `list*`          | `getOrder`, `listOrders`       |
| Zod schemas            | `*Schema`                 | `createOrderSchema`            |
| Types from schemas     | `z.infer`, no re-typing   | `type CreateOrderInput = ...`  |
| Booleans               | `is/has/can/should`       | `isRefundable`                 |
| Constants              | `SCREAMING_SNAKE`         | `MAX_UPLOAD_BYTES`             |
| DB tables (Postgres)   | `snake_case` plural       | `order_items` via `@@map`      |
| Env vars               | `SCREAMING_SNAKE`         | `PAYSTACK_SECRET_KEY`          |

## Imports

Use the `@/` alias for anything outside the current folder; relative imports only for
siblings. Order: node builtins → external → `@/` internal → relative → types → styles.
Enforce with `eslint-plugin-import` rather than by hand.

## When to add a package

Extract to `packages/` only when **all three** are true: used by 3+ products, stable for
a month, and versioned independently is genuinely easier than copy-paste. Until then,
copying 200 lines is cheaper than owning a monorepo build graph alone.
