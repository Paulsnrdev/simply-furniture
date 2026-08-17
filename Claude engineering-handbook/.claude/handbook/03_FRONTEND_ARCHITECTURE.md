# 03 — Frontend Architecture

How data, state, and components fit together on the client.

## The server/client boundary

Default to **Server Components**. Add `"use client"` only when you need one of:

- event handlers (`onClick`, `onChange`)
- state or lifecycle (`useState`, `useEffect`, `useReducer`)
- browser-only APIs (`window`, `localStorage`, `IntersectionObserver`)
- a library that requires them (framer-motion, recharts, most date pickers)

**Push the boundary down.** Don't mark a page client just because one button is
interactive. Extract the button.

```tsx
// ✗ whole page ships to the browser
"use client";
export default function Page() {
  const [open, setOpen] = useState(false);
  return <div>{/* 300 lines of static markup */}</div>;
}

// ✓ server page, one small island
export default async function Page() {
  const products = await listProducts();
  return (
    <div>
      <ProductGrid products={products} />   {/* server */}
      <AddProductDialog />                  {/* "use client" */}
    </div>
  );
}
```

Server Components can render Client Components. Client Components cannot import Server
Components — but they can accept them as `children`, which is the escape hatch:

```tsx
<ClientTabs>
  <ServerRenderedPanel />   {/* stays on the server */}
</ClientTabs>
```

## The four kinds of state

Most frontend mess is state in the wrong place. Classify before you reach for a tool.

| Kind            | Examples                                | Where it lives                        |
| --------------- | --------------------------------------- | ------------------------------------- |
| **Server**      | orders, products, the user record        | RSC fetch / TanStack Query. Never duplicated into `useState`. |
| **URL**         | filters, page, tab, search, sort, modal-open-for-deep-link | `searchParams` + `nuqs` or router push |
| **Local UI**    | dropdown open, hover, input draft        | `useState` in the nearest component   |
| **Global UI**   | theme, sidebar collapsed, toasts, cart   | Zustand or Context — small, rare       |

Rules of thumb:

- If a user would expect refresh/back/share to preserve it → **URL state**.
- If it comes from the database → **server state**. Re-fetch or revalidate; don't mirror.
- If only one component and its children care → **local**.
- Reach for a global store only after the same value is needed by 3+ unrelated trees.

```tsx
// ✓ URL state: shareable, back-button correct, server-readable
const [status, setStatus] = useQueryState("status", { defaultValue: "all" });
```

## Data fetching decision guide

| Situation                                        | Do this                                     |
| ------------------------------------------------ | ------------------------------------------- |
| Page needs data to render                        | `async` Server Component, call `queries.ts`  |
| Mutation from a form or button                   | Server Action + `revalidatePath`/`revalidateTag` |
| Client needs polling, infinite scroll, optimistic caching | TanStack Query hitting a route handler |
| Third-party client widget needs a token          | Route handler that mints it server-side      |
| Realtime                                         | Supabase Realtime channel in a client island |

Never fetch from your own API route inside a Server Component. Call the query function
directly — the HTTP hop is pure latency.

```ts
// src/features/orders/queries.ts
import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/server/context";

export const getOrder = cache(async (id: string) => {
  const { workspaceId } = await requireWorkspace();
  return db.order.findFirst({
    where: { id, workspaceId },           // tenant scope, always
    include: { items: true, customer: true },
  });
});
```

`import "server-only"` makes a leak into a Client Component a build error rather than a
data breach. Use it in every `queries.ts` and `actions.ts`.

## Component taxonomy

1. **Primitives** (`components/ui/`) — shadcn/Radix. Styling only. No fetching, no domain
   words. Never edit these to fit one feature; wrap them instead.
2. **Composites** (`components/shared/`) — `PageHeader`, `DataTable`, `EmptyState`,
   `ConfirmDialog`. Generic across features, still no domain logic.
3. **Feature components** (`features/x/components/`) — know about orders, products, plans.
   May call server actions. This is where most code lives.
4. **Route components** (`app/**/page.tsx`) — compose the above. Thin.

**Container/presentational still applies**, just renamed: the async server component
fetches, the presentational component receives props and is trivially testable.

## Props

- Props in, events out. A component never reaches upward for state.
- Prefer 1 object prop over 6 primitives once you pass more than ~5 things.
- No boolean explosions: `variant="danger"` beats `isDanger` + `isWarning` + `isMuted`.
- Avoid prop drilling deeper than 2 levels — pass `children`, or colocate the state lower.

```tsx
type OrderTableProps = {
  orders: OrderListItem[];
  onRefund?: (orderId: string) => void;
  emptyState?: React.ReactNode;
};
```

## Forms

Standard stack: **react-hook-form + zodResolver + shared Zod schema + server action**.
The same schema validates on both sides — client for UX, server for truth.

```tsx
"use client";
const form = useForm<CreateProductInput>({
  resolver: zodResolver(createProductSchema),
  defaultValues: { name: "", priceMinor: 0 },
});

async function onSubmit(values: CreateProductInput) {
  const result = await createProduct(values);
  if (!result.ok) return form.setError("root", { message: result.error });
  toast.success("Product created");
  router.push(`/products/${result.data.id}`);
}
```

Rules: disable submit while pending, show field-level errors inline, never clear a user's
input on failure, and always handle the root/server error case visibly.

## Loading and error strategy

Every route segment that fetches gets:

- `loading.tsx` — a skeleton matching the real layout's shape, not a spinner in the middle.
- `error.tsx` — `"use client"`, shows a human message and a `reset()` button, reports to Sentry.
- Explicit empty states — see `08_UI_UX.md`. An empty table is not an empty state.

Use `<Suspense>` to stream slow independent sections so the shell paints immediately.

```tsx
<Suspense fallback={<StatsSkeleton />}>
  <RevenueStats />   {/* slow aggregate query */}
</Suspense>
```

## Rendering rules that prevent 90% of bugs

- Keys are stable ids, never array index, never `Math.random()`.
- Derive during render; don't `useEffect` to sync derived state.
- `useEffect` is for synchronizing with something *outside* React. If there is no external
  system, you probably don't need it.
- No conditional hooks. No hooks in loops.
- Cleanup every subscription, timer, and listener.

## Performance defaults

- `next/image` always; explicit `sizes` for responsive images.
- `next/font` — no font `<link>` tags, no layout shift.
- Dynamic-import heavy client-only widgets (charts, editors, maps) with `ssr: false`.
- Memoize only after measuring. React 19's compiler handles most of it.
- Virtualize lists past ~200 rows (`@tanstack/react-virtual`).

See `22_PERFORMANCE.md` for budgets and measurement.

## Accessibility baseline

Semantic elements first (`button`, `nav`, `main`, `label`). Every input has a real label.
Focus is visible and trapped in modals. Interactive targets ≥ 44px. Color is never the only
signal. Run axe on the main flows before calling anything done.
