# 06 — Tailwind CSS

## Philosophy

Utilities in the markup, not a parallel CSS file. The class list *is* the style. Don't
invent a naming system on top of Tailwind — extract a **component** when styles repeat,
not a CSS class.

```tsx
// ✗ recreating BEM on top of utilities
<div className="order-card">
// ✗ @apply soup in a stylesheet
.order-card { @apply rounded-lg border p-4 shadow-sm; }

// ✓ extract a React component
<Card className="p-4">
```

`@apply` is acceptable in exactly two places: base element resets in `globals.css`, and
overriding a third-party library's DOM you cannot reach.

## Design tokens

Never hardcode a hex, a font stack, or an off-scale spacing value in a component. Define
tokens once (Tailwind v4 uses CSS variables in `@theme`) and reference them.

```css
/* src/styles/globals.css */
@import "tailwindcss";

@theme {
  --color-brand-50:  oklch(0.97 0.02 265);
  --color-brand-500: oklch(0.62 0.19 265);
  --color-brand-600: oklch(0.55 0.19 265);

  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui;
  --radius-card: 0.75rem;
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.15 0 0);
  --muted: oklch(0.96 0 0);
  --destructive: oklch(0.58 0.22 27);
}

.dark {
  --background: oklch(0.15 0 0);
  --foreground: oklch(0.98 0 0);
  --muted: oklch(0.24 0 0);
}
```

Then `bg-background text-foreground`, `bg-brand-600`, `rounded-card`. Dark mode becomes
free because the semantic token changes, not the component.

## Semantic over literal

Use meaning-named tokens (`bg-card`, `text-muted-foreground`, `border-input`,
`bg-destructive`) rather than `bg-white`, `text-gray-500`. Then a rebrand is one file.

## Class ordering and merging

Install `prettier-plugin-tailwindcss` — ordering is never a review comment again.

Always merge conditional classes with `cn()` (clsx + tailwind-merge) so caller overrides
actually win:

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

```tsx
<div className={cn("rounded-lg border p-4", isActive && "border-brand-600", className)} />
```

Without `twMerge`, `p-4` and a caller's `p-6` both land in the class list and specificity
decides at random.

## Variants with CVA

For any component with more than two visual variations:

```ts
import { cva, type VariantProps } from "class-variance-authority";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white hover:bg-brand-700",
        secondary: "bg-muted text-foreground hover:bg-muted/80",
        outline: "border border-input bg-transparent hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
      },
      size: { sm: "h-8 px-3", md: "h-10 px-4", lg: "h-12 px-6 text-base" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof button>;
```

## Responsive

Mobile-first, always. Unprefixed utilities are the small screen; `sm:`/`md:`/`lg:` add up.
Design the phone layout first — most of this portfolio's traffic is mobile.

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
```

Prefer intrinsic layout over breakpoints where possible:
`grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]` needs no breakpoints at all.
Use container queries (`@container` + `@md:`) for components that appear in
differently-sized slots.

## Spacing and rhythm

Stick to the 4px scale (`gap-2` = 8px, `gap-4` = 16px, `gap-6` = 24px). Arbitrary values
like `mt-[13px]` are a smell — round to the scale.

Prefer layout-owned spacing: `flex flex-col gap-4` on the parent beats `mb-4` on every
child (no trailing margin, no "last child" hacks).

```tsx
// ✓
<div className="flex flex-col gap-6">
  <Section /> <Section /> <Section />
</div>
```

## Dark mode

`class` strategy with `next-themes`, plus `suppressHydrationWarning` on `<html>`. If you
used semantic tokens, you should need almost no `dark:` prefixes in components. A component
littered with `dark:` variants means the tokens are wrong.

## Arbitrary values

Allowed for genuine one-offs: `top-[117px]` matching a design, `grid-cols-[240px_1fr]`,
`w-[min(100%,65ch)]`. Not allowed as a way to avoid defining a token you'll use again.

## States

```tsx
className="hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring
           disabled:opacity-50 aria-[current=page]:font-semibold
           data-[state=open]:rotate-180 group-hover:opacity-100"
```

`focus-visible` (not `focus`) for keyboard rings. Radix/shadcn expose `data-state`
attributes — style those rather than tracking state in React.

## Performance and hygiene

- Class names must be **statically analyzable**. `bg-${color}-500` is compiled away to
  nothing. Use a lookup map instead:
  ```ts
  const TONE = { success: "bg-emerald-500", danger: "bg-red-500" } as const;
  ```
- Don't fight Tailwind with `!important` — restructure or use `cn()`.
- Delete unused custom CSS; the utility layer should be most of your styling.
- Keep `globals.css` small: `@import "tailwindcss"`, `@theme`, token definitions,
  a handful of base resets. Nothing component-specific.
