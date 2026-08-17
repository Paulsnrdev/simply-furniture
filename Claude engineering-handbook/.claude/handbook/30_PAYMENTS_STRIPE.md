# 30 — Payments (Stripe, Paystack, Flutterwave)

Money bugs are the expensive kind. These rules are non-negotiable.

## The five laws

1. **Amounts are integers in minor units.** Kobo, cents. `12_500` not `125.00`. Never a
   float — `0.1 + 0.2 !== 0.3` and your ledger will not balance.
2. **The provider is the source of truth.** Your database mirrors it; it never decides it.
3. **Never trust a client-supplied amount.** Compute the price server-side from your own
   product records, every time.
4. **Every write is idempotent.** Networks retry. Users double-click. Webhooks redeliver.
5. **Everything is auditable.** An append-only record of every charge, refund, and status
   change, with the provider's reference.

## Provider choice

| Case                                   | Provider              |
| -------------------------------------- | --------------------- |
| Nigerian customers, NGN, cards + transfer + USSD | Paystack or Flutterwave |
| International, subscriptions, USD/EUR   | Stripe                |
| Both                                    | Both — route by currency, keep one internal interface |

Wrap them: `lib/payments/index.ts` exposes `createCheckout`, `verifyPayment`, `refund`,
and a normalized event type. Features never import a provider SDK directly.

## Checkout flow (hosted, always)

Use the provider's hosted or embedded checkout. Never touch raw card numbers — PCI scope
you don't have is scope you don't have to manage.

```ts
export async function startCheckout(orderId: string) {
  const { workspaceId } = await requireWorkspace();
  const order = await db.order.findFirst({ where: { id: orderId, workspaceId } });
  if (!order) notFound();

  const reference = `ORD-${order.id}-${Date.now()}`;   // your reference, stored first
  await db.payment.create({
    data: { orderId: order.id, reference, amountMinor: order.totalMinor,
            currency: order.currency, status: "PENDING", provider: "PAYSTACK" },
  });

  return paystack.initialize({
    email: order.customerEmail,
    amount: Number(order.totalMinor),       // server-computed, never from the client
    reference,
    callback_url: `${env.NEXT_PUBLIC_APP_URL}/checkout/verify`,
    metadata: { orderId: order.id, workspaceId },
  });
}
```

Write the pending payment row **before** redirecting. If the webhook arrives before the
user returns (it often does), you already have somewhere to put it.

## Webhooks are the source of truth, not the redirect

The user closing the tab must not lose their order. The callback URL is a UX convenience;
the webhook is the transaction.

```ts
export async function POST(req: Request) {
  const raw = await req.text();                       // raw body, before parsing
  const sig = req.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(raw).digest("hex");
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return new Response("bad signature", { status: 401 });
  }

  const event = JSON.parse(raw);

  // idempotency: unique index on providerEventId
  try {
    await db.processedEvent.create({ data: { providerEventId: event.id, provider: "PAYSTACK" } });
  } catch {
    return Response.json({ received: true });         // already handled
  }

  await enqueue("payments.process", event);           // do the work off the request path
  return Response.json({ received: true });
}
```

Then, in the job: **re-verify with the provider's API** before crediting anything.

```ts
const verified = await paystack.verify(event.data.reference);
if (verified.status !== "success") return;
if (BigInt(verified.amount) !== payment.amountMinor) {
  await flagForReview(payment.id, "amount mismatch");
  return;
}
```

Amount mismatch means either a bug or an attack. Never auto-fulfil it.

## Idempotent fulfilment

```ts
await db.$transaction(async (tx) => {
  const updated = await tx.payment.updateMany({
    where: { reference, status: "PENDING" },          // only transitions from PENDING
    data: { status: "PAID", paidAt: new Date(), providerRef: verified.id },
  });
  if (updated.count === 0) return;                    // already processed — stop
  await tx.order.update({ where: { id: orderId }, data: { status: "PAID" } });
  await tx.auditLog.create({ data: { action: "payment.succeeded", ... } });
});

await enqueue("email.orderConfirmation", { orderId }); // side effects AFTER commit
```

The `status: "PENDING"` in the `where` is the idempotency guard. Two concurrent webhooks
cannot both fulfil.

## Subscriptions (Stripe)

Events you must handle:

```
checkout.session.completed          → provision the workspace
customer.subscription.created       → set plan + period end
customer.subscription.updated       → upgrade, downgrade, cancel-at-period-end
customer.subscription.deleted       → downgrade to free, keep data
invoice.paid                        → extend access, send receipt
invoice.payment_failed              → dunning, warn, eventually restrict
```

Store `stripeCustomerId` and `stripeSubscriptionId` on the workspace, and derive
entitlements from `plan` + `currentPeriodEnd`. Never gate features on "did they pay once".

Proration on upgrades is Stripe's job — don't compute it yourself. Downgrades take effect
at period end, not immediately, or you owe a refund.

Use Stripe's Customer Portal for card updates, invoices, and cancellation. Building that
yourself is weeks of work for no differentiation.

## Failed payments (dunning)

Involuntary churn is often a third of all churn and the cheapest to fix.

```
Day 0   payment fails → email "we couldn't charge your card", retry in 3 days
Day 3   retry → email again, in-app banner
Day 7   retry → banner becomes blocking for admin actions
Day 14  final notice
Day 21  downgrade to free, data retained for 60 days
```

Never delete data on payment failure. Restrict, then downgrade, then (much later) delete
with warning.

## Refunds

- Full and partial, both through the provider's API — never by editing your own records.
- Validate against the **remaining refundable balance**, not the original total.
- Record each refund as its own append-only row so the ledger reconstructs.
- Email the customer with the amount and the expected arrival window.
- Reverse the fulfilment (revoke access, restock inventory) in the same transaction.

## Currency and display

Store `currency` alongside every amount. Format at the edge:

```ts
new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amountMinor / 100);
```

Never sum amounts of different currencies. Never convert on the fly for reporting without
storing the rate you used and when.

## Testing

Use test keys and the provider's test cards for: success, insufficient funds, declined, 3DS
challenge, and a network timeout mid-flow. Trigger webhooks with the CLI (`stripe listen`)
or the dashboard's resend. **Test the double-webhook case explicitly** — send the same
event twice and assert the customer was charged once and fulfilled once.

## Reconciliation

Monthly: pull the provider's settlement report and compare to your `payments` table. Any
row in one and not the other is a bug you need to find before your accountant does.
Alert on: a payment PENDING for more than an hour, an amount mismatch, and a refund
without a matching charge.
