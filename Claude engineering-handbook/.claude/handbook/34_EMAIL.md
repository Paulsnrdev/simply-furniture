# 34 — Email

Email is infrastructure. If it breaks, password resets fail, orders go unconfirmed, and you
find out from an angry customer.

## Provider choice

| Situation                                    | Provider                    |
| -------------------------------------------- | --------------------------- |
| Getting started, one or two domains           | Resend — best DX            |
| Many domains / many products, cost-sensitive  | AWS SES — cheapest at scale, per-region not per-domain |
| Need marketing + transactional in one         | Brevo                       |
| High-volume marketing                         | SES + a sending library, or Brevo |

**On per-domain pricing:** Resend prices per domain, which gets expensive across eight
products. SES charges per message regardless of how many verified domains you have —
that's the reason to move once more than two or three products are live. Brevo sits between
the two and includes campaign tooling.

## Always wrap the provider

```ts
// src/lib/email/index.ts
export type SendEmailInput = {
  to: string | string[];
  subject: string;
  react?: React.ReactElement;
  text: string;                       // always provide a plain-text version
  replyTo?: string;
  tags?: Record<string, string>;
  idempotencyKey?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<Result<string>> {
  try {
    const id = await provider.send(input);
    await db.emailLog.create({ data: { to: input.to, subject: input.subject, providerId: id, status: "SENT" } });
    return { ok: true, data: id };
  } catch (error) {
    logger.error({ err: error, to: redact(input.to) }, "email send failed");
    await db.emailLog.create({ data: { ..., status: "FAILED" } });
    return { ok: false, error: "Could not send email" };
  }
}
```

Features call `sendEmail()`. Swapping Resend → SES then touches one file. This is the
"internal email orchestration layer" idea in its simplest useful form: one interface, a
log table, and a queue in front.

## Always send from a job

Never send inline in a request handler. The provider will be slow one day, and a checkout
that times out because an email was slow is an outage.

```ts
await enqueue("email.send", { template: "order-confirmation", orderId });
```

Retry on 5xx and rate-limit responses, never on a 400 (bad address won't get better).

## Deliverability — the part that actually matters

Without these, your mail goes to spam regardless of how good the copy is.

- **SPF**: `v=spf1 include:amazonses.com ~all`
- **DKIM**: the CNAME records your provider gives you. All of them.
- **DMARC**: start at `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`, read the
  reports, then move to `p=quarantine` and eventually `p=reject`.
- **Dedicated subdomain**: send from `mail.yourdomain.com` so transactional reputation is
  isolated from your main domain.
- **Separate subdomains for transactional and marketing.** A bad campaign must not poison
  password resets.
- **Warm up** a new domain: start at ~50/day, double every few days.
- **Real reply-to address** that a human reads. `noreply@` hurts reputation and is hostile.
- **List-Unsubscribe header** (including one-click) on everything non-transactional. Gmail
  and Yahoo now require it at volume.

Check yourself with mail-tester.com before launch and after any DNS change.

## Transactional vs marketing

| | Transactional | Marketing |
| --- | --- | --- |
| Basis | The user's own action | Consent |
| Examples | Reset, receipt, order update, invite | Newsletter, feature announcement, promo |
| Unsubscribe | Not required (but preferences are) | **Required**, one-click |
| Subdomain | `mail.` | `news.` |
| Can be mixed? | **No** | **No** |

Slipping a promo into a receipt is how you lose the ability to send receipts.

## Templates

React Email components, rendered server-side, with a plain-text alternative generated
alongside.

```tsx
export function OrderConfirmation({ order, storeName }: Props) {
  return (
    <Html>
      <Preview>Your {storeName} order {order.reference} is confirmed</Preview>
      <Body style={body}>
        <Container>
          <Heading>Thanks for your order</Heading>
          <Text>We've received your order {order.reference} and we're getting it ready.</Text>
          <OrderItems items={order.items} />
          <Button href={`${env.APP_URL}/orders/${order.id}`}>View your order</Button>
          <Text style={footer}>Questions? Reply to this email — a person reads it.</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

Rules: tables for layout (Outlook), inline styles, max 600px wide, no background images, no
web fonts, alt text on every image, and a design that works with images blocked entirely.
Dark mode: test it — many clients invert your colours whether you like it or not.

Test in Gmail, Outlook, Apple Mail, and Gmail on Android at minimum.

## Copy

Subject: specific, under ~50 characters, no clickbait, front-load the meaningful words
(mobile truncates). Preview text is a real asset — set it, don't let it default to "View in
browser".

One purpose, one primary CTA. Say why they're receiving it. Sign off as a person. See
`09_WRITING_RULES.md`.

## The essential transactional set

```
Welcome / verify email
Password reset
Login from a new device
Order confirmation
Payment receipt
Payment failed / card expiring
Shipping / delivery update
Team invitation
Trial ending (day 12) / trial ended
Subscription renewed / cancelled
Data export ready
```

Each one: queued, idempotent, logged, and tested with a real inbox.

## Bounces and complaints

Handle the provider's webhooks or your reputation degrades silently.

- **Hard bounce** → mark the address invalid, stop sending, flag it in the UI.
- **Soft bounce** → retry a few times, then treat as hard.
- **Spam complaint** → unsubscribe from everything immediately, no exceptions.
- Suppression list is checked before every send.
- Alert if the bounce rate exceeds ~2% or complaints exceed 0.1% — providers will suspend
  you above that.

## Testing

Mailpit in Docker catches all local mail (`23_DOCKER.md`). Never point staging at a real
provider with real addresses. Guard against sending to customers from a non-production
environment:

```ts
if (env.NODE_ENV !== "production" && !to.endsWith("@yourdomain.com")) {
  return { ok: true, data: "skipped-non-prod" };
}
```

That guard has saved more embarrassment than any test.
