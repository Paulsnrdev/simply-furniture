# 09 — Writing Rules

Applies to UI copy, error messages, emails, docs, commit messages, PR descriptions, and
anything Claude Code writes back to me.

## Voice

Plain, direct, competent. Like a knowledgeable colleague, not a brand mascot and not a
legal department. Second person ("you"), active voice, present tense.

```
✗ Your submission has been received and is being processed by our system.
✓ We got your order. You'll get a confirmation email in a few minutes.

✗ An error occurred while attempting to process the payment request.
✓ The payment didn't go through. Your card wasn't charged — try again or use another card.
```

## Rules

1. **Cut every word that doesn't change the meaning.** "In order to" → "to". "At this
   point in time" → "now". "Please note that" → delete.
2. **Front-load the point.** First sentence carries the information. No warm-up.
3. **No hedging stacks.** "It seems like it might possibly be" → "It's probably".
4. **Concrete over abstract.** "Takes about 2 minutes" beats "takes a short while".
5. **No exclamation marks** except genuine celebration, max one per screen.
6. **No filler enthusiasm.** "Awesome!", "Great question!", "Let's dive in!" — delete.
7. **Consistent terms.** One name per concept across the whole product. If it's a
   "workspace" in settings, it is not a "team" in billing. Keep `40_GLOSSARY_AND_NAMING.md`
   authoritative.
8. **Sentence case** for titles, buttons, and labels. Not Title Case, not ALL CAPS.
9. **No jargon leakage.** Users don't have "records", "entities", "payloads", or "nulls".
10. **Never blame the user.** "Invalid input" → "That email address is missing an @".

## Buttons and labels

Name the outcome, not the mechanism.

| ✗              | ✓                        |
| -------------- | ------------------------ |
| Submit         | Create account           |
| OK             | Delete 3 products        |
| Yes / No       | Cancel order / Keep it   |
| Click here     | View invoice             |

Confirm dialogs: the title asks the question, the body states the consequence, the buttons
are verbs. Destructive verbs go on the destructive-styled button.

## Error messages

Three parts: **what happened**, **why (if useful)**, **what to do next**.

```
✗ Error 500
✗ Something went wrong.
✓ We couldn't save your changes — the connection dropped. Your edits are still here;
  try again.

✗ Unauthorized
✓ You don't have permission to refund orders. Ask a workspace owner to do it or to
  change your role.
```

Never expose stack traces, SQL, provider names, or internal ids to end users. Do include a
short correlation id when support might need it: "Reference: 7f3a91". Log the full detail
server-side (`35_LOGGING.md`).

## Empty states

Say what goes here, why it's empty, and give the action.

```
No products yet
Add your first product and it'll appear here, ready to sell.
[Add product]
```

## Numbers, money, dates

- Money always shows currency and uses the locale's separators: `₦12,500.00`, `$45.00`.
- Store minor units; format at the edge with `Intl.NumberFormat`.
- Dates: absolute for anything the user may need to reference (`12 Feb 2026, 4:05 PM`),
  relative for recency (`3 minutes ago`) — and always put the absolute value in a tooltip.
- Always state the timezone when it could matter. Users of these products are in WAT.
- Round consistently; never show `₦12,499.999999`.

## Email copy

Subject: specific and scannable, under ~50 characters, no clickbait.
`Your Chunkz order #1042 is on the way` beats `Update on your order`.

Body: one purpose per email, one primary CTA, plain-text fallback that reads fine on its
own. Always identify the sender and give a real reason the person is receiving it. See
`34_EMAIL.md`.

## Commit messages

Conventional Commits. Subject in imperative mood, ≤ 72 chars, no trailing period.

```
feat(orders): add partial refund flow

Refunds previously all-or-nothing. Adds an amount field, validates against
the remaining refundable balance, and records each refund as its own row so
the ledger stays append-only.

Closes #142
```

Explain **why** in the body. The diff already shows what.

Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`.
Breaking changes get `!` and a `BREAKING CHANGE:` footer.

## PR descriptions

```md
## What
One paragraph, plain English.

## Why
The problem or the ticket. Link it.

## How
Notable decisions and anything a reviewer would otherwise have to reverse-engineer.

## Testing
What you ran, what you clicked, what you deliberately didn't cover.

## Risk
Migrations, backfills, feature flags, rollback plan.
```

## Code comments

Comment **why**, never **what**. If the *what* isn't obvious, rename things instead.

```ts
// ✗ increment the retry counter
retries += 1;

// ✓ Paystack occasionally 502s on first attempt during settlement windows;
// retrying once clears it without a duplicate charge because the reference is idempotent.
```

Mark debt explicitly: `// TODO(paul): ...`, `// HACK: ... remove after X`. An untagged
TODO is noise.

## Documentation

Every non-obvious module gets a short header comment: what it's for, who calls it, one
gotcha. Every repo README answers: what is this, how do I run it, how do I deploy it, what
env vars does it need, where do the secrets live.

Prefer a working example over prose. Prefer a table over a paragraph of comparisons.
Prefer deleting stale docs over leaving them wrong — wrong docs cost more than none.

## How Claude Code should write to me

- Lead with the answer or the diff summary. No preamble.
- Flag uncertainty explicitly instead of smoothing it over.
- When you make an assumption, name it in one line.
- Short bullets over paragraphs for status; prose for reasoning.
- Don't restate my request back to me.
- Don't apologize repeatedly — fix it and say what changed.
