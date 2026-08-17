# 21 — Testing

## What to test, given one developer and limited time

Optimize for **bugs caught per minute spent**. That means:

```
        ▲  few    E2E (Playwright)  — 5–10 critical journeys
       ╱ ╲
      ╱   ╲       Integration       — the bulk. Route/action + real DB.
     ╱     ╲
    ╱_______╲     Unit              — pure logic: money, permissions, dates, parsing
```

Skip: snapshot tests of markup, tests of framework behaviour, tests that mock the thing
they're testing, and 100% coverage as a goal.

**Always test:** anything involving money, permissions, tenant boundaries, or a state
machine. **Always test** every bug you fix — that's the regression that pays for itself.

## Stack

- **Vitest** — unit and integration (fast, ESM-native, same config as Vite).
- **@testing-library/react** — component tests, user-centric queries.
- **Playwright** — E2E in a real browser.
- **Testcontainers or a Docker Postgres** — real database for integration tests.
- **MSW** — mock third-party HTTP (Paystack, Resend), never your own API.

## Naming and structure

```ts
describe("refundOrder", () => {
  it("refunds a paid order and records a ledger entry", async () => { ... });
  it("rejects a refund larger than the remaining balance", async () => { ... });
  it("returns 404 when the order belongs to another workspace", async () => { ... });
});
```

Test names describe **behaviour**, not implementation. If the name mentions a function's
internals, the test will break on every refactor.

Arrange / Act / Assert, with a blank line between each. One logical assertion per test.

## Unit tests: pure logic only

```ts
describe("calculateOrderTotal", () => {
  it("applies percentage discount before shipping", () => {
    const total = calculateOrderTotal({
      items: [{ priceMinor: 10_000, quantity: 2 }],
      discount: { type: "percent", value: 10 },
      shippingMinor: 1_500,
    });
    expect(total).toBe(19_500);   // 20000 - 10% + 1500
  });

  it("never returns a negative total", () => {
    expect(calculateOrderTotal({ items: [], discount: { type: "fixed", value: 5_000 }, shippingMinor: 0 })).toBe(0);
  });
});
```

Extract this kind of logic *out* of components and actions specifically so it's testable
without a database.

## Integration tests: the highest value tier

Test the server action or route handler against a real database. This catches the bugs
that actually happen: missing tenant filters, wrong status codes, broken transactions.

```ts
beforeEach(async () => { await resetDb(); });

it("does not return another workspace's order", async () => {
  const a = await createWorkspaceWithOrder();
  const b = await createWorkspaceWithUser();

  await expect(getOrder(a.order.id, { as: b.user })).rejects.toThrow(/not found/i);
});
```

Reset with `TRUNCATE ... RESTART IDENTITY CASCADE` between tests — faster than migrating,
and safer than relying on test order.

**Don't mock Prisma.** A mocked Prisma test passes when your `where` clause is wrong,
which is the exact bug you were trying to catch.

## Component tests

Query the way a user perceives the UI: role, label, text. Not class names, not test ids
(unless there's genuinely no accessible handle — and that itself is an a11y smell).

```tsx
it("shows a validation error for a bad email", async () => {
  const user = userEvent.setup();
  render(<SignupForm />);

  await user.type(screen.getByLabelText(/email/i), "not-an-email");
  await user.click(screen.getByRole("button", { name: /create account/i }));

  expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
});
```

Test behaviour and the four states (loading, empty, error, ready) — not that a div has a
class.

## E2E: only the journeys that make money

For each product, pick 5–10:

1. Sign up → verify email → land in dashboard
2. Create the core resource (product / form / booking)
3. Public-facing consumption (storefront checkout, form submission)
4. Payment happy path with the provider's test card
5. Payment failure path
6. Invite a teammate → they accept → they see the right things and not the wrong things

```ts
test("customer completes checkout", async ({ page }) => {
  await page.goto("/store/chunkz");
  await page.getByRole("button", { name: /add to cart/i }).first().click();
  await page.getByRole("link", { name: /checkout/i }).click();
  await page.getByLabel("Email").fill("buyer@example.com");
  await page.getByRole("button", { name: /pay/i }).click();
  await expect(page.getByText(/order confirmed/i)).toBeVisible({ timeout: 15_000 });
});
```

Rules: no `waitForTimeout`, use web-first assertions (`toBeVisible` auto-retries), seed
state via API or DB rather than clicking through setup, and run against a real deployed
preview.

## Test data

Factories with sensible defaults and overrides. No shared mutable fixtures.

```ts
export const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: randomUUID(),
  workspaceId: randomUUID(),
  reference: `ORD-${Date.now()}`,
  status: "PENDING",
  totalMinor: 10_000,
  currency: "NGN",
  createdAt: new Date(),
  ...overrides,
});
```

Every test creates its own data. Tests must pass in any order, in parallel, and on a
Tuesday.

## Mocking

Mock only what you don't own and can't run: payment providers, email, SMS, the Claude API.
Use MSW so the mock is at the network layer and your code path is unchanged.

```ts
server.use(
  http.post("https://api.paystack.co/transaction/initialize", () =>
    HttpResponse.json({ status: true, data: { authorization_url: "https://checkout.test/x" } }),
  ),
);
```

Freeze time with `vi.useFakeTimers()` for anything date-dependent. Never assert against
`new Date()` in a test.

## Coverage

Track it, don't target it. Meaningful thresholds: ~80% on `features/*/actions.ts`,
`lib/`, and anything computing money; low coverage on presentational components is fine.
Coverage measures which lines ran, not whether they're correct.

## CI

Run unit + integration on every push (should finish under 3 minutes). Run E2E on PRs to
`main` and against preview deployments. A flaky test is a broken test — fix it or delete
it, never retry-loop it into silence.

## Definition of a good test

- Fails when the behaviour breaks
- Passes when the implementation is refactored
- Names the behaviour in its title
- Runs in isolation, in any order
- Is faster to read than the code it tests
