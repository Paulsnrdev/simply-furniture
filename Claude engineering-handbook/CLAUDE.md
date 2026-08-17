# CLAUDE.md — Engineering Handbook Index

> This file is the entry point. Keep it short. Detailed rules live in `.claude/handbook/`.
> Read only the documents relevant to the current task. Do not load all of them.

---

## 1. Who I am building for

Solo full-stack developer shipping **production SaaS products** and **client work**.
Constraints that shape every decision:

- One developer. No team to absorb complexity. **Boring beats clever.**
- Products must be **monetizable and maintainable**, not portfolio pieces.
- Primary market includes **Nigeria / West Africa** — assume slow networks, mobile-first users, Naira pricing, local payment rails.
- Multiple products share the same stack on purpose. Consistency is a feature.

## 2. Default stack

| Layer | Default | Notes |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Server Components by default |
| Language | **TypeScript (strict)** | No `any` in committed code |
| Styling | **Tailwind CSS** + shadcn/ui | No CSS-in-JS |
| ORM | **Prisma** | Migrations committed, always |
| Database | **PostgreSQL** (Supabase) | Supabase = Postgres host + storage + auth (optional) |
| Auth | Auth.js / Supabase Auth | Pick one per product; never both |
| Payments | **Paystack / Flutterwave** (NGN), Stripe (USD) | See `.claude/handbook/30_PAYMENTS_STRIPE.md` |
| Email | **Brevo / AWS SES** transactional | Resend only for prototypes |
| Jobs | Vercel Cron → QStash → BullMQ (in that order of escalation) | |
| Hosting | Vercel | Cloudflare Workers for edge/webhook workloads |
| Errors | Sentry | Wired before first paying user |

Legacy / client work may use **Node + Express + MongoDB** — see docs 10–12.

## 3. Non-negotiables

These apply to every task, without being asked:

1. **Never** commit secrets. `.env.example` stays in sync with `.env`.
2. **Every** database query that touches user data is scoped by owner/tenant ID. No exceptions. See `.claude/handbook/31_MULTI_TENANCY.md`.
3. **Every** mutation validates input with Zod at the server boundary — client validation is UX only.
4. **Never** trust `role`, `price`, `userId`, or `tenantId` sent from the client.
5. TypeScript errors and ESLint errors block the commit. Warnings do not.
6. If a change touches auth, payments, or tenancy → stop and state the risk before writing code.
7. Prefer deleting code over adding a flag.

## 4. Document map

Read the file that matches the task. Do not load the whole handbook.
All paths are relative to this file.

**Foundations (01–09)**
| File | Read it when |
|---|---|
| `.claude/handbook/01_ENGINEERING_PRINCIPLES.md` | A trade-off needs settling |
| `.claude/handbook/02_PROJECT_ARCHITECTURE.md` | Deciding where code belongs |
| `.claude/handbook/03_FRONTEND_ARCHITECTURE.md` | State, data flow, component layers |
| `.claude/handbook/04_NEXTJS_STANDARDS.md` | Routes, Server Actions, caching |
| `.claude/handbook/05_REACT_STANDARDS.md` | Writing or refactoring a component |
| `.claude/handbook/06_TAILWIND_CSS.md` | Styling, tokens, responsive work |
| `.claude/handbook/07_TYPESCRIPT.md` | Types, generics, validation |
| `.claude/handbook/08_UI_UX.md` | Before calling a screen finished |
| `.claude/handbook/09_WRITING_RULES.md` | Any user-facing text or commit |

**Backend & data (10–19)**
| File | Read it when |
|---|---|
| `.claude/handbook/10_NODEJS.md` | Node runtime, scripts, tooling |
| `.claude/handbook/11_EXPRESS.md` | Legacy/client Express services |
| `.claude/handbook/12_MONGODB.md` | MERN client work |
| `.claude/handbook/13_POSTGRESQL.md` | Schema design, indexes, queries |
| `.claude/handbook/14_PRISMA.md` | Models, migrations, transactions |
| `.claude/handbook/15_API_STANDARDS.md` | Designing an endpoint or contract |
| `.claude/handbook/16_AUTHENTICATION.md` | Sessions, login, password flows |
| `.claude/handbook/17_AUTHORIZATION.md` | Roles, permissions, ownership |
| `.claude/handbook/18_JWT.md` | Token issuing, rotation, storage |
| `.claude/handbook/19_RATE_LIMITING.md` | Abuse, quotas, throttling |

**Operations (20–29)**
| File | Read it when |
|---|---|
| `.claude/handbook/20_SECURITY.md` | Anything touching trust boundaries |
| `.claude/handbook/21_TESTING.md` | Deciding what to test and how |
| `.claude/handbook/22_PERFORMANCE.md` | Something is slow |
| `.claude/handbook/23_DOCKER.md` | Containerising a service |
| `.claude/handbook/24_CI_CD.md` | Pipelines, checks, automation |
| `.claude/handbook/25_DEPLOYMENT.md` | Shipping to production |
| `.claude/handbook/26_GIT_WORKFLOW.md` | Branching, commits, releases |
| `.claude/handbook/27_CODE_REVIEW.md` | Reviewing a diff |
| `.claude/handbook/28_DEFINITION_OF_DONE.md` | Before marking anything complete |
| `.claude/handbook/29_SAAS_BEST_PRACTICES.md` | Product-level SaaS decisions |

**SaaS surface (30–40)**
| File | Read it when |
|---|---|
| `.claude/handbook/30_PAYMENTS_STRIPE.md` | Checkout, subscriptions, webhooks |
| `.claude/handbook/31_MULTI_TENANCY.md` | Any query touching tenant data |
| `.claude/handbook/32_BACKGROUND_JOBS.md` | Cron, queues, async work |
| `.claude/handbook/33_NOTIFICATIONS.md` | In-app, push, SMS |
| `.claude/handbook/34_EMAIL.md` | Transactional email, deliverability |
| `.claude/handbook/35_LOGGING.md` | Structured logs, what never to log |
| `.claude/handbook/36_MONITORING.md` | Sentry, alerts, uptime |
| `.claude/handbook/37_ANALYTICS.md` | Events, funnels, product metrics |
| `.claude/handbook/38_SEO.md` | Public pages, metadata, sitemaps |
| `.claude/handbook/39_PRODUCTION_CHECKLIST.md` | Before any launch |
| `.claude/handbook/40_GLOSSARY_AND_NAMING.md` | Naming anything |

## 5. How to work on this codebase

1. **Read before writing.** Find the existing pattern; match it. A second pattern for the same problem is a bug.
2. **Smallest change that fully solves it.** No speculative abstraction, no "while I'm here" refactors.
3. **State assumptions out loud** when the request is ambiguous — then proceed with the most conservative one.
4. **Show the plan for anything touching >3 files** before editing.
5. **Never invent** an API, env var, package, or DB column. Grep for it. If absent, say so.
6. After a change, name what could break and how it was checked.

## 6. Anti-patterns — do not do these

- Adding a package for something 20 lines of code solves.
- `useEffect` for data that a Server Component can fetch.
- `any`, `@ts-ignore`, `!` non-null assertions to silence the compiler.
- Business logic inside React components.
- Catching an error and returning `null` with no log.
- Console-logging user data, tokens, or payment payloads.
- Writing a migration by hand instead of `prisma migrate dev`.
- Rewriting a working module because the style is unfamiliar.
