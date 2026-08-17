# 11 — Express

Used for client projects and standalone APIs. Next.js route handlers cover in-app needs;
reach for Express when you need a long-running process, websockets, or a non-Next consumer.

## Application layout

```
src/
├─ app.ts             # express app: middleware + routes (no listen)
├─ server.ts          # http server, graceful shutdown
├─ config/env.ts
├─ modules/
│  └─ orders/
│     ├─ orders.routes.ts
│     ├─ orders.controller.ts
│     ├─ orders.service.ts       # business logic — no req/res in here
│     ├─ orders.schema.ts        # Zod
│     └─ orders.repository.ts    # DB access only
├─ middleware/
│  ├─ auth.ts  error-handler.ts  validate.ts  rate-limit.ts  request-id.ts
└─ lib/
```

Separating `app.ts` from `server.ts` makes the app importable in tests without binding a
port.

**Layer rule:** controllers translate HTTP ↔ domain. Services hold logic and know nothing
about `req`/`res`. Repositories touch the database. A service that reads `req.user` is
wrong — pass the user in.

## Middleware order (this order, always)

```ts
app.set("trust proxy", 1);              // behind Vercel/NGINX/Cloudflare
app.use(requestId);                     // correlation id first
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors({ origin: env.ALLOWED_ORIGINS.split(","), credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(globalRateLimit);
app.use("/api/v1", routes);
app.use(notFoundHandler);
app.use(errorHandler);                  // MUST be last, MUST have 4 args
```

Webhook routes need the **raw body** for signature verification — mount
`express.raw({ type: "application/json" })` on that path *before* the JSON parser.

## Validation middleware

```ts
export const validate =
  (schema: { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema }) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schema.body) req.body = schema.body.parse(req.body);
      if (schema.query) req.query = schema.query.parse(req.query) as never;
      if (schema.params) req.params = schema.params.parse(req.params) as never;
      next();
    } catch (error) {
      next(new ValidationError(error));
    }
  };

router.post("/orders", requireAuth, validate({ body: createOrderSchema }), createOrder);
```

After this middleware, `req.body` is typed and trusted. Nothing downstream re-validates.

## Async errors

Express 4 does not catch rejected promises. Wrap every async handler:

```ts
export const asyncHandler =
  <T extends RequestHandler>(fn: T): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get("/orders/:id", asyncHandler(getOrder));
```

(Express 5 handles this natively — if you're on 5, drop the wrapper.)

## Central error handler

```ts
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.id;

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: { code: "VALIDATION_ERROR", message: "Invalid request", requestId,
               details: err.flatten().fieldErrors },
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, requestId } });
  }

  logger.error({ err, requestId, path: req.path }, "unhandled error");
  Sentry.captureException(err, { tags: { requestId } });
  res.status(500).json({
    error: { code: "INTERNAL", message: "Something went wrong on our side.", requestId },
  });
}
```

Never leak `err.message` from an unknown error to the client — it may contain a connection
string. Always return the `requestId` so support can find the log line.

## Controllers stay thin

```ts
export const createOrder = asyncHandler(async (req, res) => {
  const order = await ordersService.create({
    ...req.body,
    userId: req.user.id,
    workspaceId: req.user.workspaceId,
  });
  res.status(201).json({ data: toOrderDto(order) });
});
```

No business rules, no Prisma calls, no conditional logic beyond translating results.

## Routing conventions

- Version the base path: `/api/v1`.
- Plural nouns, no verbs: `POST /orders`, not `/createOrder`.
- Nest at most one level: `/orders/:orderId/items`.
- Everything else in `15_API_STANDARDS.md`.

## Security defaults

```ts
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: isProd ? undefined : false }));
app.use(rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: "draft-7" }));
```

- CORS with an explicit allow-list. Never `origin: "*"` with `credentials: true`.
- Auth cookies: `httpOnly`, `secure`, `sameSite: "lax"`, `path: "/"`.
- Body-size caps on every parser; stricter caps on upload routes.
- No stack traces in production responses.
- Apply auth middleware at the router level so a new route can't accidentally be public:
  `router.use(requireAuth)` at the top of protected routers.

## Health and readiness

```ts
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));
app.get("/ready", asyncHandler(async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ status: "ready" });
}));
```

`/health` must never touch the database (load balancers hit it constantly). `/ready` may.

## Testing

Import `app` (not `server`) into Supertest. Hit real routes against a test database in
Docker or Testcontainers rather than mocking Prisma. See `21_TESTING.md`.

```ts
const res = await request(app)
  .post("/api/v1/orders")
  .set("Authorization", `Bearer ${token}`)
  .send({ items: [{ productId, quantity: 2 }] });

expect(res.status).toBe(201);
```
