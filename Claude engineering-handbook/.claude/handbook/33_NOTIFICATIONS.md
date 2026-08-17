# 33 — Notifications

## Principles

1. **Every notification earns its interruption.** If the user wouldn't act on it, it's a
   dashboard item, not a notification.
2. **Right channel for the urgency.** In-app for informational, email for actionable and
   permanent, push/SMS for time-critical only.
3. **The user is in control.** Granular preferences, easy unsubscribe, and a real "off".
4. **Never notify someone about their own action.** They just did it; they know.

## Channel selection

| Urgency                          | Channel                     |
| -------------------------------- | --------------------------- |
| FYI, visible next time they log in | In-app feed                |
| Needs action, no rush             | In-app + daily digest email |
| Needs action today                | Email immediately           |
| Time-critical (payment failed, order received) | Email + push  |
| Security (new login, password changed) | Email always, unconditionally |
| Delivery/OTP in Nigeria          | SMS or WhatsApp             |

Security notifications are the one category users cannot switch off.

## Data model

```prisma
model Notification {
  id          String    @id @default(uuid())
  workspaceId String
  userId      String
  type        String                     // "order.received", "payment.failed"
  title       String
  body        String
  actionUrl   String?
  entityType  String?
  entityId    String?
  readAt      DateTime?
  createdAt   DateTime  @default(now())

  @@index([userId, readAt, createdAt(sort: Desc)])
}

model NotificationPreference {
  userId   String
  type     String
  inApp    Boolean @default(true)
  email    Boolean @default(true)
  push     Boolean @default(false)
  digest   Boolean @default(false)   // batch instead of immediate
  @@id([userId, type])
}
```

Notifications are per-user, not per-workspace — the same event may matter to the owner and
not to a viewer.

## One dispatcher

```ts
export async function notify(input: {
  userId: string; workspaceId: string; type: NotificationType;
  title: string; body: string; actionUrl?: string;
}) {
  const prefs = await getPreferences(input.userId, input.type);

  if (prefs.inApp) {
    await db.notification.create({ data: input });
    await pusher.trigger(`user-${input.userId}`, "notification", input);  // realtime badge
  }
  if (prefs.email && !prefs.digest) await enqueue("email.notification", input);
  if (prefs.digest) await db.digestItem.create({ data: input });
  if (prefs.push && (await hasPushSubscription(input.userId))) {
    await enqueue("push.send", input);
  }
}
```

Features call `notify()`. They never call the email or push provider directly. This is what
makes preferences, digests, and quiet hours possible later without touching every feature.

## Batching and digests

Ten events in a minute should be one notification, not ten.

- Debounce: hold similar events for ~5 minutes, then send one summary
  ("3 new orders" rather than three emails).
- Daily digest at a user-chosen hour in **their** timezone (WAT by default here).
- Weekly summary for low-frequency products.
- Respect quiet hours for push and SMS — nobody wants a 3am order notification.

## In-app notification UI

- Unread count on a bell icon; badge clears on open, individual items mark read on click.
- Grouped by day, newest first, infinite scroll or "load more".
- Every item is a link to the thing it's about — a notification you can't act on is noise.
- "Mark all as read" always available.
- Empty state that explains what will appear here.
- Realtime via Supabase Realtime or Pusher; poll every 60s as a fallback.

## Push (web)

Web Push works on Android Chrome and, since iOS 16.4, on installed PWAs.

- Ask permission **contextually**, after the user does something that implies they'd want
  it — never on first page load. A denied permission is close to permanent.
- Explain the value in your own dialog before triggering the browser prompt.
- Store subscriptions per device; prune on 410/404 responses.
- Payload: short title, short body, an icon, and a URL. Assume the body is truncated.
- Always deep-link to the relevant screen.

## SMS and WhatsApp

Expensive per message and high-friction to opt out of — reserve for OTP, delivery updates,
and payment confirmations. Include the business name, keep it under 160 characters, never
include a login link that also works without a second factor, and honour STOP.

For Nigerian audiences, WhatsApp often beats SMS on both cost and open rate — but it
requires template approval, so plan the message set in advance.

## Preferences UI

A grid: notification type down the side, channel across the top, checkboxes in the cells.
Group by category. Provide a master switch per channel. Save immediately with a toast, no
"Save preferences" button.

Include an unsubscribe link in every non-transactional email that lands directly on this
page, pre-authenticated by a signed token (`34_EMAIL.md`).

## Anti-patterns

- Notifying users about their own actions.
- One notification per item in a bulk operation.
- Marketing content in a transactional channel — it breaks trust and, for email, breaks the
  legal basis for sending it.
- Unread badges that never clear.
- A notification with no action and no link.
- Push permission prompt on page load.
- Notifications that can't be turned off (except security).
