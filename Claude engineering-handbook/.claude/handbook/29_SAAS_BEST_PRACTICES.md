# 29 — SaaS Best Practices

Product and business patterns for the eight-product portfolio. Engineering decisions that
are really business decisions.

## Build order for a new product

1. **One core job.** The store builder makes a store live. Everything else is later.
2. **Auth + tenancy + billing skeleton first.** Retrofitting multi-tenancy is a rewrite;
   retrofitting billing is a migration. Both are cheap on day one.
3. **A real user before a second feature.** Chunkz is the test case for the store builder —
   ship to a real store before generalizing.
4. **Instrument from the first deploy.** You cannot recover analytics for last month.
5. **Then breadth.**

Resist building the admin panel, the settings page, and the integrations directory before
anyone has used the core flow once.

## Pricing

- **Charge from day one.** Free-only users teach you what free users want.
- Three tiers max. A free trial or a limited free tier, not both plus a freemium plan.
- Price on a value metric that grows with the customer's success: stores, orders/month,
  team members, sends. Not "features" — that just teaches people to want the next tier
  without needing it.
- Local pricing matters: NGN pricing for Nigerian customers via Paystack/Flutterwave, USD
  for international via Stripe. Don't make a Lagos customer pay a card-conversion fee.
- Grandfather existing customers on price rises. Announce with 30 days' notice.
- Annual plans at ~2 months free — cash up front and a lower churn rate.

## Trials and onboarding

- 14 days is usually right. No card required lowers friction; card required raises
  conversion of those who start. For low-touch self-serve, prefer no card.
- **Time-to-value is the metric that matters.** Aim for a "wow" inside 5 minutes: a store
  with a real product on it, a form that received a test submission.
- Seed demo data so the empty product doesn't look broken, and make it obviously deletable.
- Onboarding is a checklist, not a video. 3–5 steps, progress visible, skippable, and
  resumable.
- Email at day 0, 1, 3, 7, 12, and on expiry — each about one thing they haven't done yet.

## The activation metric

For every product, define the single action that predicts retention, then measure and
optimize it:

| Product          | Activation                              |
| ---------------- | --------------------------------------- |
| Store builder    | First real order received               |
| Booking          | First booking taken from a customer     |
| Form builder     | First 5 submissions                     |
| Newsletter       | First campaign sent to 50+ subscribers  |
| QR menu          | Menu scanned 10 times                   |

Everything upstream of activation is worth engineering effort. Everything downstream is a
retention problem.

## Churn

- Track: logo churn, revenue churn, and **cohort retention curves**. A flat tail matters
  more than a low first-month number.
- Involuntary churn (failed cards) is often 20–40% of total churn and is the cheapest to
  fix: dunning emails, card-expiry warnings, retry schedules (`30_PAYMENTS_STRIPE.md`).
- Cancellation flow: ask why (one question, optional), offer a pause and a downgrade before
  the cancel button, and **make cancelling easy anyway**. Trapping people generates
  chargebacks and bad reviews.
- Export their data on the way out. It's the right thing, it's legally required in several
  jurisdictions, and it makes returning possible.

## Metrics that matter

```
MRR, ARR                    revenue, the only score that counts
Net revenue retention       > 100% means growth without new customers
Activation rate             % of signups reaching the activation event
Time to value               signup → activation, in minutes
Cohort retention            % of month-N signups still paying in month N+3
CAC payback                 months to recover acquisition cost
Support tickets / customer  rising = a UX problem, not a staffing problem
```

Vanity metrics to ignore: total signups, page views, "users" that includes churned ones.

## Support as a product input

Every ticket is a bug report about your UX. Tag them, count the tags monthly, and fix the
top one. Publish docs for the top 10 questions and link them from inside the relevant
screen. For a solo operator, a good empty state and a good error message are worth more
than a chat widget.

## Multi-product strategy

With eight products, the leverage is in what they share:

- One design system, one auth model, one billing integration, one email layer, one
  analytics schema. Copy them until the third product proves the shape, then extract.
- **Don't** share a database or a deployment. Independent apps mean one product's incident
  doesn't take down the other seven.
- Cross-sell inside the products: a store builder customer is a plausible newsletter
  customer.
- Be honest about which products are experiments. Kill the ones with no activation after a
  fair launch, and say so publicly rather than leaving zombies running.

## Legal and compliance minimums

- Terms of Service and Privacy Policy before the first paying customer.
- NDPR (Nigeria) and GDPR (if EU customers): lawful basis, data export, deletion, breach
  notification within 72 hours.
- Cookie consent only if you set non-essential cookies. Prefer analytics that don't need it.
- Store payment data at the provider, never yourself. PCI scope you don't have is PCI scope
  you don't have to manage.
- A `security.txt` and a real contact address for vulnerability reports.

## Operating discipline for one person

- **Automate anything you do three times.** Onboarding emails, invoices, reports, deploys.
- **Alert only on what you'd act on at 2am.** Everything else is a dashboard.
- Set a weekly hour to read metrics and tickets. Building without reading is guessing.
- Write down the runbook: how to restore a backup, rotate a key, refund a customer, take
  the site down. You will need it on a bad day when you can't think clearly.
- Cap your spend on every provider (`25_DEPLOYMENT.md`). One runaway loop can cost more
  than a month of revenue.
