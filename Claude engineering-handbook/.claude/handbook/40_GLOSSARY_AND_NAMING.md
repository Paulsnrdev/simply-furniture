# 40 — Glossary & Naming

One name per concept, everywhere: database, code, UI, emails, docs, and support replies.
Inconsistent vocabulary is the cheapest bug to prevent and the most annoying to fix later.

## Domain vocabulary

| Term          | Means                                                      | Not called                    |
| ------------- | ---------------------------------------------------------- | ----------------------------- |
| **Workspace** | The tenant. Owns all data. What a customer pays for.        | team, org, account, tenant, company |
| **Member**    | A user with a role inside a workspace                       | teammate, collaborator, seat  |
| **Owner**     | The role that controls billing and deletion                 | admin (that's a lower role)   |
| **User**      | A person with login credentials (may belong to many workspaces) | account, profile          |
| **Customer**  | Someone who buys from a workspace's store — **not** a user of ours | client, buyer          |
| **Plan**      | A pricing tier (FREE / PRO / SCALE)                         | package, subscription, tier   |
| **Subscription** | The active billing relationship with a provider          | plan                          |
| **Order**     | A customer's purchase                                       | transaction, sale, purchase   |
| **Payment**   | One attempt to collect money for an order                   | charge, transaction           |
| **Refund**    | Money returned against a payment                            | reversal, chargeback (different thing) |
| **Product**   | A sellable item                                             | item, SKU, listing            |
| **Variant**   | A size/colour of a product                                  | option, SKU                   |
| **Store**     | A workspace's public storefront                             | shop, site, page              |

"Account" is banned as a noun — it means workspace to some people and user to others, and
that ambiguity has caused real bugs.

## Status values

Use these exact sets. Adding a state is a migration and a decision, not a convenience.

```ts
OrderStatus:        PENDING | PAID | SHIPPED | DELIVERED | CANCELLED | REFUNDED
PaymentStatus:      PENDING | PAID | FAILED | REFUNDED | PARTIALLY_REFUNDED
SubscriptionStatus: TRIALING | ACTIVE | PAST_DUE | CANCELLED | EXPIRED
Role:               OWNER | ADMIN | MEMBER | VIEWER
Plan:               FREE | PRO | SCALE
```

Statuses are `SCREAMING_SNAKE` in the database, and mapped to sentence-case labels in the
UI ("Partially refunded"). Never show a raw enum to a user.

## Code naming

| Kind                | Convention              | Example                      |
| ------------------- | ----------------------- | ---------------------------- |
| Files / folders     | `kebab-case`            | `order-status-badge.tsx`     |
| Components          | `PascalCase`            | `OrderStatusBadge`           |
| Functions / vars    | `camelCase`             | `calculateOrderTotal`        |
| Hooks               | `useThing`              | `useOrderFilters`            |
| Types / interfaces  | `PascalCase`            | `CreateOrderInput`           |
| Zod schemas         | `camelCase` + `Schema`  | `createOrderSchema`          |
| Constants           | `SCREAMING_SNAKE`       | `MAX_UPLOAD_BYTES`           |
| DB tables           | `snake_case` plural     | `order_items`                |
| DB columns          | `snake_case`            | `total_minor`                |
| Env vars            | `SCREAMING_SNAKE`       | `PAYSTACK_SECRET_KEY`        |
| Analytics events    | `snake_case` past tense | `order_placed`               |
| Job names           | `dot.case`              | `email.orderConfirmation`    |
| Branches            | `type/description`      | `feat/partial-refunds`       |

## Function name prefixes

Consistent prefixes make the codebase searchable and predictable.

| Prefix    | Meaning                                    |
| --------- | ------------------------------------------ |
| `get*`    | Fetch one; may return `null`               |
| `list*`   | Fetch many, usually paginated              |
| `find*`   | Search; returns `null` if absent           |
| `create*` | Insert                                     |
| `update*` | Modify existing                            |
| `delete*` | Remove (soft unless stated)                |
| `is/has/can/should*` | Returns boolean                 |
| `assert*` | Throws if the condition doesn't hold       |
| `require*`| Returns the value or throws/redirects      |
| `to*`     | Convert (`toOrderDto`)                     |
| `on*`     | Event handler prop (`onRefund`)            |
| `handle*` | Event handler implementation               |

`get` never mutates. `require` always throws rather than returning null. Follow these and a
reader knows the contract from the name.

## Money naming

Any amount in minor units carries the suffix: `totalMinor`, `priceMinor`, `amountMinor`,
`total_minor`. No suffix means a formatted display string. This convention alone prevents
the most expensive bug class in the codebase — never introduce a bare `price: number`.

## Time naming

- `*At` for timestamps: `createdAt`, `paidAt`, `deletedAt`, `expiresAt`
- `*Duration` / `*Seconds` / `*Ms` for spans — always unit-suffixed
- All timestamps are `timestamptz`, stored UTC, rendered in the user's timezone (WAT by
  default here)
- Boolean-plus-timestamp beats a boolean alone: `deletedAt: DateTime?` tells you *when*,
  which `isDeleted: boolean` never will

## Id naming

`id` for the primary key, `<entity>Id` for foreign keys (`workspaceId`, `orderId`), and
`<provider>Ref` for external identifiers (`paystackRef`, `stripeCustomerId`). Never a bare
`ref` or `key`.

## UI label mapping

The database says `PARTIALLY_REFUNDED`; the user sees "Partially refunded". Keep one
mapping table per enum, in the feature folder, used by every component:

```ts
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};
```

One mapping means renaming a label is one edit, not a search across twelve components.

## When adding a new concept

1. Check this file — does a name for it already exist?
2. If it's a synonym for something here, use the existing name.
3. If it's genuinely new, add it here **in the same PR**, with a one-line definition.
4. Use it identically in the schema, the code, the UI, and the support macro.

A glossary that isn't updated is worse than none, because people trust it.
