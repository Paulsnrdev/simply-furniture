# 07 — TypeScript

## Compiler settings

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,      // arr[0] is T | undefined — catches real bugs
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "target": "ES2022",
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

`pnpm typecheck` (`tsc --noEmit`) must be clean. Next's build does not typecheck every
file the way you think it does — run it explicitly in CI.

## The `any` rule

`any` is banned. It disables checking for everything it touches, silently.

```ts
// ✗
function parse(data: any) { return data.user.email; }

// ✓ unknown forces you to prove the shape
function parse(data: unknown) {
  return userSchema.parse(data).email;
}
```

Escape hatches, in order of preference: `unknown` + Zod, a type guard, a discriminated
union, generics, `as` with a comment justifying it. `@ts-expect-error` (never
`@ts-ignore`) with a one-line reason is acceptable in tests and around broken third-party
types — it errors if the underlying issue is fixed, which is the point.

## Infer, don't duplicate

Types should have one source of truth. Derive everything else.

```ts
// Zod is the source for anything crossing a boundary
export const createProductSchema = z.object({
  name: z.string().min(1).max(120),
  priceMinor: z.number().int().positive(),
  status: z.enum(["draft", "active", "archived"]),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

// Prisma is the source for DB rows
type Product = Prisma.ProductGetPayload<{ include: { variants: true } }>;

// Derive DTOs instead of rewriting them
export type ProductListItem = Pick<Product, "id" | "name" | "priceMinor" | "status">;
```

Never hand-write a type that mirrors a schema — they drift within a week.

## `type` vs `interface`

Use `type` by default: it handles unions, intersections, mapped and conditional types, and
it can't be accidentally re-opened by declaration merging. Use `interface` only when you
*want* merging (augmenting a library's types) or when defining an implementable contract.

## Discriminated unions everywhere

The single highest-value pattern in this codebase.

```ts
export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

const result = await createProduct(input);
if (!result.ok) {
  toast.error(result.error);   // result.data is not accessible here
  return;
}
router.push(`/products/${result.data.id}`);   // narrowed, no optional chaining
```

Same for fetch states, webhook payloads, and domain entities. Replace flag pairs with a
`status` field so "loading AND error" cannot be represented.

## Exhaustiveness

```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

switch (order.status) {
  case "pending": return <PendingView />;
  case "paid":    return <PaidView />;
  case "refunded":return <RefundedView />;
  default:        return assertNever(order);
}
```

Adding a new status now breaks the build in every place that must be updated. That is a
feature.

## Type guards and assertion functions

```ts
export function isDefined<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined;
}

export function assertWorkspace(
  ctx: Context,
): asserts ctx is Context & { workspaceId: string } {
  if (!ctx.workspaceId) throw new Error("Workspace required");
}

const ids = items.map((i) => i.parentId).filter(isDefined);   // string[], not (string|null)[]
```

## Branded types for identifiers

Prevents passing a `userId` where an `orderId` was expected — a real class of production bug.

```ts
type Brand<T, B extends string> = T & { readonly __brand: B };
export type UserId = Brand<string, "UserId">;
export type WorkspaceId = Brand<string, "WorkspaceId">;
export type Minor = Brand<number, "Minor">;   // money in kobo/cents

export const asUserId = (v: string) => v as UserId;
```

Use for: ids that flow far, money amounts, and anything where two `string`s mean different
things.

## Utility types worth knowing

```ts
Partial<T> Required<T> Readonly<T> Pick<T,K> Omit<T,K> Record<K,V>
Exclude<T,U> Extract<T,U> NonNullable<T> ReturnType<F> Awaited<P>
Parameters<F> ComponentProps<"button">

// Common local helpers
type Nullable<T> = T | null;
type AsyncReturn<F extends (...a: never[]) => Promise<unknown>> = Awaited<ReturnType<F>>;
type RequireAtLeastOne<T, K extends keyof T = keyof T> =
  Omit<T, K> & { [P in K]-?: Required<Pick<T, P>> & Partial<Omit<T, P>> }[K];
```

## Generics

Only when a function is genuinely polymorphic. Constrain them; single-letter names are fine
for truly abstract params, but prefer meaningful names in domain code.

```ts
export async function withTransaction<TResult>(
  fn: (tx: Prisma.TransactionClient) => Promise<TResult>,
): Promise<TResult> {
  return db.$transaction(fn);
}

export function groupBy<TItem, TKey extends string>(
  items: readonly TItem[],
  keyOf: (item: TItem) => TKey,
): Record<TKey, TItem[]> { ... }
```

If a generic parameter appears only once in the signature, it probably shouldn't be generic.

## `const` assertions and enums

Skip TypeScript `enum` (runtime object, awkward with `isolatedModules`, poor tree-shaking).
Use const objects:

```ts
export const ORDER_STATUS = ["pending", "paid", "shipped", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];
```

Prisma-generated enums are fine to import and use directly.

## Errors

```ts
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "RATE_LIMITED",
    readonly status: number,
    readonly cause?: unknown,
  ) { super(message); this.name = "AppError"; }
}

try { ... } catch (error) {
  if (error instanceof AppError) return { ok: false, error: error.code };
  logger.error({ err: error }, "unexpected");   // error is `unknown` — narrow it
  throw error;
}
```

`catch (e)` gives you `unknown`. Never assume `e.message` exists.

## Async types

Type the promise, don't leave it inferred as `Promise<any>` from an untyped library. Use
`Awaited<T>` rather than manual unwrapping. Prefer `Promise.all` for independent work and
`Promise.allSettled` when partial failure is acceptable — but type the settled results:

```ts
const results = await Promise.allSettled(jobs);
const failed = results.filter((r) => r.status === "rejected");
```

## Red flags in review

- `any`, `as any`, `as unknown as X`
- `@ts-ignore`
- A hand-written interface duplicating a Zod schema or Prisma model
- Optional props that are actually always required (`user?: User` then `user!.name`)
- `!` non-null assertions outside tests
- `Function`, `object`, `{}` as types
- Generics with no constraint and one usage
