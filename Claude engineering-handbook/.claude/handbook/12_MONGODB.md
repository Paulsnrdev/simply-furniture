# 12 — MongoDB & Mongoose

Used in MERN client projects and legacy work. New products default to Postgres + Prisma
(`13`/`14`) unless the data is genuinely document-shaped.

## When Mongo is the right call

Good fit: nested documents read as a unit (a CMS page with blocks), highly variable
schemas per record, event/log storage, rapid early-stage iteration.

Bad fit: anything with real relational integrity, money, reporting across entities, or
multi-entity transactions. If you find yourself writing three `$lookup`s, you wanted SQL.

## Connection

One connection per process, reused. In serverless, cache it on `globalThis` or you will
exhaust the connection pool.

```ts
let cached = (globalThis as any).mongoose ?? { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;
  cached.promise ??= mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 45_000,
  });
  cached.conn = await cached.promise;
  return cached.conn;
}
```

Always use SRV connection strings with `retryWrites=true&w=majority` on Atlas.

## Schema design

Model around **access patterns**, not entities. Ask "what does one screen need in one
query?" first.

**Embed** when: the child is owned by the parent, is always read with it, and the array
stays bounded (< ~100 items, < 16MB doc).
**Reference** when: the child is queried independently, shared, or unbounded (orders,
comments, events).

```ts
const orderSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    customer:  { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    reference: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    // embedded: items never change after creation and are always read with the order
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },     // denormalized snapshot
        priceMinor: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    totalMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN" },
  },
  { timestamps: true },
);
```

**Snapshot what must not change.** An order stores the product name and price at purchase
time. Never render an old order from the live product document.

## Indexes

Every field you filter, sort, or join on needs an index. Compound indexes follow **ESR**:
Equality fields first, then Sort fields, then Range fields.

```ts
orderSchema.index({ workspace: 1, status: 1, createdAt: -1 });   // list a workspace's orders
orderSchema.index({ reference: 1 }, { unique: true });
orderSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }); // TTL
```

Verify with `.explain("executionStats")`: `COLLSCAN` in a hot path is a bug, and
`totalDocsExamined` should be close to `nReturned`.

Disable `autoIndex` in production; create indexes in a migration script instead.

## Query rules

- **Always scope by tenant.** `Order.findById(id)` is a data leak — use
  `Order.findOne({ _id: id, workspace })`.
- Project only what you need: `.select("name priceMinor status")`.
- `.lean()` for reads you don't mutate — returns POJOs, several times faster.
- Never `find()` without a `limit`.
- Avoid `$where`, unindexed regex, and `$ne`/`$nin` on large collections.
- Paginate with a cursor (`_id` or `createdAt`), not `skip` — `skip(10000)` scans 10,000 docs.

```ts
const orders = await Order.find({ workspace, ...(cursor && { _id: { $lt: cursor } }) })
  .sort({ _id: -1 })
  .limit(21)
  .lean();
const hasMore = orders.length > 20;
```

## Aggregation

Filter early, project early, `$limit` before `$lookup`. Every pipeline should start with a
`$match` that can use an index.

```ts
const revenue = await Order.aggregate([
  { $match: { workspace: wsId, status: "paid", createdAt: { $gte: from, $lt: to } } },
  { $group: { _id: { $dateTrunc: { date: "$createdAt", unit: "day" } }, total: { $sum: "$totalMinor" }, count: { $sum: 1 } } },
  { $sort: { _id: 1 } },
]);
```

`$lookup` is a nested loop join — if it's in a hot path, denormalize instead.

## Atomic updates

Read-modify-write loses concurrent updates. Use operators.

```ts
// ✗ race condition
const p = await Product.findById(id); p.stock -= qty; await p.save();

// ✓ atomic, and refuses to go negative
const updated = await Product.findOneAndUpdate(
  { _id: id, workspace, stock: { $gte: qty } },
  { $inc: { stock: -qty } },
  { new: true },
);
if (!updated) throw new AppError("Insufficient stock", "CONFLICT", 409);
```

## Transactions

Available on replica sets (Atlas is one). Use for multi-document invariants — but if you
need them often, you wanted Postgres.

```ts
const session = await mongoose.startSession();
try {
  await session.withTransaction(async () => {
    await Order.create([orderDoc], { session });
    await Product.bulkWrite(stockOps, { session });
  });
} finally { await session.endSession(); }
```

## Validation

Mongoose validation is a safety net, not the boundary. Validate with Zod at the API edge
first — Mongoose casting silently coerces types and skips validators on `findOneAndUpdate`
unless you pass `runValidators: true`.

## Migrations

Mongo has no schema migrations, which means *you* own them. Use `migrate-mongo` or
versioned scripts in `scripts/`. Every schema change is a two-phase deploy: write both
shapes → backfill → read the new shape → drop the old field.

## Operational hygiene

- Enable Atlas backups and test a restore before you need one.
- Watch the slow-query log; anything > 100ms in a request path gets an index or a rewrite.
- Set `maxTimeMS` on analytics queries so a bad aggregate can't take the cluster down.
- Never expose `_id` sequences or full documents to clients — map to a DTO.
