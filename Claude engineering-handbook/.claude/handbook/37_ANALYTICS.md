# 37 — Analytics

## What to measure

Instrument the funnel, not everything. Start with the questions you actually want answered:

- Where do signups drop off?
- What % of signups activate, and how long does it take?
- Which feature predicts retention?
- Where does checkout fail?

If an event doesn't help answer a question like these, don't send it. Unused events cost
money and make the useful ones harder to find.

## Tooling

| Need                                | Tool                          |
| ----------------------------------- | ----------------------------- |
| Product analytics, funnels, cohorts | PostHog (self-host or cloud)  |
| Privacy-friendly web traffic        | Plausible or Umami            |
| Errors                              | Sentry (`36_MONITORING.md`)   |
| Revenue                             | Provider dashboard + your DB  |

PostHog covers events, funnels, session replay, and feature flags in one, which is why it's
the default here. Avoid GA4 for product analytics — it's built for marketing traffic, not
user journeys, and it requires cookie consent.

## Event naming

`object_verb`, snake_case, past tense. Consistent across all eight products so a shared
dashboard is possible.

```
user_signed_up
user_activated
workspace_created
product_created
order_placed
payment_succeeded
payment_failed
subscription_started
subscription_cancelled
export_downloaded
```

Never: `click`, `button_click`, `page1_next`. Name the business meaning, not the DOM.

## Properties

```ts
analytics.capture("order_placed", {
  workspace_id: workspaceId,
  order_id: orderId,
  amount_minor: order.totalMinor,
  currency: order.currency,
  item_count: order.items.length,
  payment_provider: "paystack",
  is_first_order: isFirst,
});
```

Rules: snake_case, consistent types (`amount_minor` is always an integer, everywhere),
include the ids you'll want to join on, and **never send PII** — no emails, names,
addresses, or card details. Send the user id and look up the rest in your own database.

## Server-side by default

Client-side events are blocked by ad blockers (a meaningful share of traffic) and can be
spoofed. Anything that matters — payments, signups, activation — is captured server-side.

```ts
// after the transaction commits
await analytics.capture({
  distinctId: userId,
  event: "payment_succeeded",
  properties: { workspace_id, amount_minor, currency },
});
```

Client-side is fine for UI interaction research: which tab, which filter, where people
hesitate.

## Identify and group

```ts
analytics.identify({ distinctId: userId, properties: { plan, created_at, country } });
analytics.groupIdentify({ groupType: "workspace", groupKey: workspaceId,
                          properties: { plan, member_count, mrr_minor } });
```

For B2B SaaS, group analytics at the **workspace** level is what makes retention and
expansion analysis possible. Set it up early — it's painful to backfill.

## Funnels worth defining per product

```
Signup:      landing_viewed → signup_started → user_signed_up → email_verified → workspace_created
Activation:  workspace_created → first_product_created → store_published → order_placed
Checkout:    cart_viewed → checkout_started → payment_initiated → payment_succeeded
Upgrade:     limit_reached → pricing_viewed → checkout_started → subscription_started
```

Then watch the biggest drop-off and fix that step. One funnel improvement beats ten new
events.

## Metrics that drive decisions

```
Activation rate         signups reaching the activation event
Time to value           signup → activation, median
Weekly active workspaces  (not users — workspaces pay)
Feature adoption        % of active workspaces using feature X
Cohort retention        month-N signups still active in month N+3
MRR, churn, NRR         from your own payments table, not an estimate
```

Ignore: total signups ever, pageviews, "users" including churned.

## Privacy

- Analyze behaviour, not people. Aggregate by default.
- No PII in event properties. Ever.
- Respect Do Not Track and offer an opt-out.
- Cookieless analytics (Plausible) avoids the consent banner entirely — a real UX win.
- Session replay: mask all inputs, block payment and settings pages, get consent if you're
  recording EU users.
- NDPR/GDPR: document what you collect, why, and for how long. Delete on request — including
  from the analytics tool, not just your database.

## Instrumenting a new feature

At build time, decide: what one event proves this feature is being used, and what property
tells me whether it's working? Add exactly those. You can always add more; you can never
recover data you didn't collect.

Add the event in the same PR as the feature (`28_DEFINITION_OF_DONE.md`) — "we'll add
analytics later" means launching blind.

## Reviewing the data

Weekly, one hour: funnel drop-offs, activation rate, this week's cohort against last
month's, top errors, top support tags. Write down one thing to change. Building without
reading the data is guessing expensively.
