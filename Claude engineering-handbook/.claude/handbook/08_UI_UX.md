# 08 — UI & UX Standards

## The four states, every time

Before a screen is "done", all four exist and have been seen:

1. **Loading** — skeleton in the shape of the real content, not a centred spinner.
2. **Empty** — an explanation and a primary action, not a blank box.
3. **Error** — what happened, whether it's their fault, what to do next, a retry.
4. **Ready** — the happy path.

Plus the ones people forget: **partial** (some data failed), **unauthorized**,
**offline/slow**, and **too much data** (1,000 rows, 60-character product names).

```tsx
<EmptyState
  icon={PackageIcon}
  title="No orders yet"
  description="When a customer checks out, their order shows up here."
  action={<Button onClick={openTestOrder}>Create a test order</Button>}
/>
```

## Feedback rules

- Any action over ~200ms shows progress; the trigger disables to prevent double-submit.
- Destructive actions confirm — and the confirm button names the action
  ("Delete 3 products"), never "OK".
- Success is visible: a toast, a state change, or a redirect. Silence reads as failure.
- Optimistic updates for cheap, likely-to-succeed actions (likes, toggles, reorder);
  roll back visibly on failure.
- Never show a raw error code alone. Pair it with a sentence a human can act on.

## Forms

- Label every input visibly. Placeholders are not labels — they vanish on focus.
- Validate on blur, re-validate on change **after** the first error. Never validate on
  every keystroke of a fresh field.
- Errors sit next to the field, in words: "Password needs at least 8 characters", not
  "Invalid input".
- Correct `type`, `inputMode`, and `autocomplete` — this is most of mobile form UX.
- Never wipe input on failure. Never disable paste. Never cap password length at 20.
- One primary action per form; secondary actions look secondary.
- Long forms: group into sections, save progress, tell people how many steps remain.

```tsx
<Input type="email" inputMode="email" autoComplete="email"
       aria-invalid={!!error} aria-describedby={error ? "email-error" : undefined} />
{error && <p id="email-error" className="text-sm text-destructive">{error}</p>}
```

## Layout and hierarchy

- One primary action per screen, visually dominant. Everything else is quieter.
- Use spacing to group; related things are close, unrelated things are apart. Proximity
  does more work than borders.
- Text lines cap at ~65–75 characters (`max-w-prose`).
- Consistent page skeleton: title → description → actions → content. Use `PageHeader`.
- Align to a grid. Optical alignment beats mathematical alignment when they disagree.
- Above the fold on mobile: what this is, and what to do.

## Typography

Three sizes are usually enough per screen (page title, section title, body). Body text
never below 14px, 16px on mobile inputs (prevents iOS zoom). Line height ~1.5 for body,
tighter for headings. Use weight and color for hierarchy before reaching for size.

## Color and contrast

- Meet WCAG AA: 4.5:1 for body text, 3:1 for large text and UI boundaries.
- Never encode meaning in color alone — pair with an icon or label. ~8% of men are
  colorblind.
- Reserve saturated brand color for actions. A page where everything is brand-colored has
  no hierarchy.
- Semantic colors have fixed meaning across all products: green = success, amber =
  warning/pending, red = destructive/error, blue = informational.

## Mobile first

Design the 375px viewport first, then expand. In this market, most users arrive on a
mid-range Android over a patchy connection.

- Touch targets ≥ 44×44px with ≥ 8px between them.
- Primary actions within thumb reach; put destructive ones away from it.
- Sticky bottom bar for the main action on long pages.
- Respect safe areas (`env(safe-area-inset-bottom)`).
- Test with a slow 3G throttle and 4× CPU slowdown at least once per feature.

## Navigation

- Users should always know where they are (active state), how they got there
  (breadcrumbs on nested pages), and how to leave (visible back/close).
- URL reflects state — filters, tabs, and pagination are shareable and back-button-safe.
- Never trap: a modal closes on Escape, on backdrop click, and via a visible ✕.
- Preserve scroll position on back navigation.

## Accessibility baseline

Non-negotiable, and cheap if done from the start:

- Semantic HTML first. A `div` with `onClick` is not a button.
- Every interactive element is keyboard reachable, in a sensible tab order, with a visible
  `focus-visible` ring.
- Modals trap focus, restore focus to the trigger on close, and set `aria-modal`.
- Images have meaningful `alt`; decorative ones have `alt=""`.
- Live regions (`aria-live="polite"`) for async status like toasts.
- `prefers-reduced-motion` disables non-essential animation.
- Run axe DevTools on each main flow; fix everything it flags as serious or critical.

## Motion

Motion explains change; it doesn't decorate. 150–250ms for UI transitions, ease-out for
entrances, ease-in for exits. Animate `transform` and `opacity` only. If an animation
delays interaction, cut it.

## Copy in the UI

Buttons state the outcome ("Save changes", "Send invoice") not the mechanism ("Submit").
Error messages: what happened, why, what to do. Empty states are an opportunity to teach.
Never blame the user. See `09_WRITING_RULES.md`.

## Data-heavy screens

- Tables: sticky headers, sortable columns, right-aligned numbers, tabular figures,
  a per-row action menu, and bulk actions when >20 rows are plausible.
- Always show total counts and current range ("Showing 1–20 of 342").
- Filters live in the URL, are clearable in one click, and show an active count.
- Paginate or virtualize past 100 rows; never render 5,000 DOM nodes.
- Provide export (CSV) on any table a business user will want in a spreadsheet.

## Trust details that matter for commerce

Show the real total (with fees and delivery) before asking for payment. Show currency
explicitly (`₦12,500`, not `12,500`). Never re-request card details after a failure
without explaining why. Confirm orders on-screen *and* by email. Make refund and support
paths obvious — hiding them costs more in support load than it saves.

## Pre-ship UI checklist

- [ ] All four states implemented and viewed
- [ ] Works at 375px and 1440px
- [ ] Keyboard-only pass completed
- [ ] Contrast checked on text and buttons
- [ ] Long strings, empty strings, and 3-digit numbers don't break layout
- [ ] Loading skeleton matches final layout (no shift)
- [ ] Destructive actions confirm; primary action is obvious
- [ ] Copy reviewed against `09_WRITING_RULES.md`
