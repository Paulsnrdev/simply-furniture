# 23 — Docker

Next.js apps deploy to Vercel and don't need Docker. Use Docker for: local Postgres/Redis,
Express APIs and workers on Railway/Fly/VPS, and CI test environments.

## Local development stack

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: app_dev
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --save 60 1 --loglevel warning
    volumes: ["redisdata:/data"]

  mailpit:                     # catches all outbound email in dev
    image: axllent/mailpit
    ports: ["1025:1025", "8025:8025"]

volumes:
  pgdata:
  redisdata:
```

`docker compose up -d` and every product on this machine has the same dependencies. Use a
separate compose file (or a different port) per product if their databases must not mix.

## Production Dockerfile (Next.js standalone)

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm prisma generate && pnpm build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -g 1001 nodejs && adduser -S -u 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
```

Requires `output: "standalone"` in `next.config.ts`. This produces an image around
150–200MB instead of 1.5GB.

## Rules

1. **Multi-stage always.** Build tools never ship to production.
2. **Pin base images** to a minor version (`node:20.11-alpine`), not `latest`.
3. **Copy the lockfile first**, install, then copy source — dependency layers cache.
4. **Non-root user.** Every production image.
5. **`.dockerignore`** — this file is why builds are fast or slow:
   ```
   node_modules
   .next
   .git
   .env*
   **/*.test.ts
   coverage
   Dockerfile
   ```
6. **No secrets in the image.** Not in `ENV`, not in a `COPY`ed file, not in a build arg
   that ends up in a layer. Use runtime environment variables or BuildKit secret mounts.
7. **`NEXT_PUBLIC_*` values are baked at build time** — a different value needs a rebuild,
   not a redeploy.

## Worker image

```dockerfile
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
USER node
CMD ["node", "dist/worker.js"]
```

Workers need graceful shutdown (`10_NODEJS.md`) — Docker sends `SIGTERM` and kills after
10s. Handle it or you'll lose in-flight jobs on every deploy.

Use `--init` or `tini` so signals actually reach your process when it isn't PID 1.

## Health checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
```

The health endpoint must be cheap and must not hit the database (`11_EXPRESS.md`).

## Resource limits

Always set them. An unbounded container will happily consume the host.

```yaml
deploy:
  resources:
    limits: { cpus: "1.0", memory: 512M }
```

Node needs `--max-old-space-size` set below the container limit or the OOM killer arrives
before V8 decides to collect garbage.

## Image hygiene

- Scan with Trivy in CI; fail on HIGH/CRITICAL in the base image.
- Rebuild weekly even with no code changes — base images get patches.
- Tag with the git SHA, not just `latest`, so a rollback is a tag change.
- Alpine is small but uses musl; if a native dependency misbehaves (sharp, bcrypt, canvas),
  switch to `-slim` (Debian) rather than fighting it.

## Local workflow

```bash
docker compose up -d                    # deps only; app runs on the host with pnpm dev
docker compose logs -f postgres
docker compose exec postgres psql -U dev app_dev
docker compose down -v                  # ⚠ wipes volumes — resets the database
```

Run the app itself on the host in development. Docker for the app means slow file watching
and a worse debugging experience for no benefit.
