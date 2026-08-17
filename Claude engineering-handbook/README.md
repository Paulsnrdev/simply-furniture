# Engineering Handbook

A 40-document engineering standard set for Claude Code, tuned to a solo
Next.js 15 / TypeScript / Prisma / PostgreSQL stack shipping SaaS products.

## Install

```bash
unzip engineering-handbook.zip -d /path/to/your-project
```

Layout:

```
your-project/
├── CLAUDE.md                 # auto-loaded every session — index + non-negotiables
└── .claude/handbook/
    ├── 01_ENGINEERING_PRINCIPLES.md   …   09_WRITING_RULES.md
    ├── 10_NODEJS.md                   …   19_RATE_LIMITING.md
    ├── 20_SECURITY.md                 …   29_SAAS_BEST_PRACTICES.md
    └── 30_PAYMENTS_STRIPE.md          …   40_GLOSSARY_AND_NAMING.md
```

## Why it's split this way

Only `CLAUDE.md` loads automatically. It stays under ~130 lines and holds the stack,
the non-negotiables, and a table telling Claude which handbook file to open for a
given task. Everything else is pulled in on demand.

That's the whole point: 40 documents of standards are available, but a typical task
costs one or two of them in context instead of all 200KB.

## Using it well

- Reference explicitly when precision matters: `follow .claude/handbook/14_PRISMA.md`
- Put project-specific facts (models, domains, quirks) in section 2 of `CLAUDE.md`
- Keep `CLAUDE.md` short — when it grows, move the detail into a handbook file
- When Claude gets the same thing wrong twice, that's a missing rule, not a bad model.
  Add it and the mistake stops recurring.

## Contents

**Foundations** 01 Principles · 02 Project architecture · 03 Frontend architecture ·
04 Next.js · 05 React · 06 Tailwind · 07 TypeScript · 08 UI/UX · 09 Writing rules

**Backend & data** 10 Node · 11 Express · 12 MongoDB · 13 PostgreSQL · 14 Prisma ·
15 API standards · 16 Authentication · 17 Authorization · 18 JWT · 19 Rate limiting

**Operations** 20 Security · 21 Testing · 22 Performance · 23 Docker · 24 CI/CD ·
25 Deployment · 26 Git workflow · 27 Code review · 28 Definition of done ·
29 SaaS best practices

**SaaS surface** 30 Payments · 31 Multi-tenancy · 32 Background jobs ·
33 Notifications · 34 Email · 35 Logging · 36 Monitoring · 37 Analytics · 38 SEO ·
39 Production checklist · 40 Glossary & naming
