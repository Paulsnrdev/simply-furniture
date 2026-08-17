# 05 — React Standards

## Component rules

- One component per file; the file is named after it in `kebab-case`.
- Function declarations, not arrow consts, for components — better stack traces.
- Under ~150 lines. Past that, extract subcomponents or a hook.
- No default exports for components (except `page.tsx`/`layout.tsx`, which Next requires).
- Props typed with a `type` alias named `<Component>Props`.

```tsx
type OrderStatusBadgeProps = {
  status: OrderStatus;
  className?: string;
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant} className={className}>{config.label}</Badge>;
}
```

Keep lookup tables outside the component so they aren't rebuilt each render.

## You probably don't need an effect

`useEffect` synchronizes React with an **external** system. If there's no external system,
there's no effect.

```tsx
// ✗ derived state via effect: extra render, stale risk, more code
const [total, setTotal] = useState(0);
useEffect(() => setTotal(items.reduce((s, i) => s + i.price, 0)), [items]);

// ✓ derive during render
const total = items.reduce((sum, i) => sum + i.price, 0);
```

```tsx
// ✗ resetting state when a prop changes
useEffect(() => setDraft(product.name), [product.id]);

// ✓ remount with a key
<ProductForm key={product.id} product={product} />
```

Legitimate effects: subscriptions, event listeners, timers, `IntersectionObserver`,
syncing to `localStorage`, imperatively focusing, integrating a non-React widget.

Always clean up:

```tsx
useEffect(() => {
  const controller = new AbortController();
  window.addEventListener("resize", onResize, { signal: controller.signal });
  return () => controller.abort();
}, []);
```

## State placement

Start with state in the component that uses it. Lift only to the nearest common ancestor
when a sibling needs it. If lifting makes a component re-render huge subtrees, push state
down into a smaller island instead.

```tsx
// ✗ page re-renders on every keystroke
function Page() {
  const [q, setQ] = useState("");
  return <><SearchInput value={q} onChange={setQ} /><HugeList query={q} /></>;
}

// ✓ isolate the fast-changing state, debounce into the expensive part
```

Prefer `useReducer` when several fields change together or transitions have rules
(wizards, editors, filter panels). Prefer one object over five correlated `useState`s.

## Derived state and memoization

React 19's compiler auto-memoizes most components. Do **not** pre-emptively sprinkle
`useMemo`/`useCallback`/`memo`. Add them only when:

- you profiled and saw the cost, or
- a value is a dependency of an effect and must be referentially stable, or
- you're passing props to a `memo`'d third-party component that re-renders expensively.

```tsx
// justified: expensive, runs on every keystroke otherwise
const filtered = useMemo(
  () => products.filter((p) => matches(p, query)),
  [products, query],
);
```

## Keys

```tsx
{orders.map((order) => <OrderRow key={order.id} order={order} />)}
```

Never index keys for lists that can reorder, filter, or delete — React reuses the wrong
DOM node and inputs keep the previous row's value. Never `key={Math.random()}` (remounts
everything, every render).

## Custom hooks

Extract when logic is stateful *and* reused, or when a component's hook section is
drowning out its JSX. A hook returns data and actions — never JSX.

```ts
export function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = useState(initial);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  return { isOpen, open, close, toggle };
}
```

Rules: name starts with `use`, called unconditionally at the top level, one responsibility,
returns a stable shape.

## React 19 APIs worth using

```tsx
// useOptimistic — instant feedback, auto-rollback on failure
const [optimisticItems, addOptimistic] = useOptimistic(
  items,
  (state, newItem: Item) => [...state, { ...newItem, pending: true }],
);

// useActionState — form state tied to a server action
const [state, formAction, isPending] = useActionState(createProduct, { ok: false });

// useFormStatus — pending state inside a submit button, no prop drilling
function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Saving…" : "Save"}</Button>;
}

// use() — read a promise or context conditionally
const user = use(userPromise);
```

`ref` is now a normal prop on function components — `forwardRef` is no longer required.

## Context

Context is for low-frequency, widely-needed values: theme, current workspace, feature
flags, auth user. It is not a state manager — every consumer re-renders when the value
changes.

- Split contexts by update frequency (stable config vs. changing value).
- Memoize the provider value.
- Export a `useX()` hook that throws outside the provider, so misuse fails loudly.

```tsx
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
```

## Conditional rendering

```tsx
{items.length > 0 && <List items={items} />}   // ✗ renders "0" when empty
{items.length ? <List items={items} /> : <EmptyState />}   // ✓
```

Handle all four states explicitly — loading, error, empty, ready. A ternary chain more
than two deep should become early returns or a small `switch`.

## Error boundaries

Wrap risky subtrees (charts, editors, third-party embeds) so one failure doesn't blank the
page. In App Router, `error.tsx` covers the route; add component-level boundaries for
islands. Report to Sentry inside the boundary.

## Testing-friendly components

- Presentational components take props and render — no fetching inside.
- Query by role and label, not `data-testid`, wherever possible.
- Avoid asserting implementation details (state names, internal handlers).

See `21_TESTING.md`.

## Checklist before committing a component

- [ ] Correct client/server placement, `"use client"` as low as possible
- [ ] All four UI states handled
- [ ] Stable keys, no index keys on mutable lists
- [ ] No unnecessary effects; every effect cleans up
- [ ] Accessible: labels, roles, focus, keyboard
- [ ] No `any`, no inline `// @ts-ignore`
- [ ] No secrets or unmapped DB objects in props
