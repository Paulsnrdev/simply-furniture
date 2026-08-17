# 04 — Next.js 15 Standards (App Router)

## Async request APIs (Next 15 breaking change)

`params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` are **async**.

```tsx
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
}
```

```ts
import { cookies, headers } from "next/headers";
const cookieStore = await cookies();
const session = cookieStore.get("session")?.value;
```

Any `params.slug` without `await` is a Next 14 pattern — fix it.

## Caching model

Next 15 defaults changed: `fetch` is **no longer cached by default**, and GET route
handlers are **not** cached by default. Be explicit rather than relying on defaults.

```ts
// opt in to caching + tagging
const res = await fetch(url, { next: { revalidate: 3600, tags: ["products"] } });

// never cache
const res = await fetch(url, { cache: "no-store" });
```

Segment-level config:

```ts
export const dynamic = "force-dynamic";   // per-request; use for dashboards
export const revalidate = 60;             // ISR, seconds
export const runtime = "nodejs";          // "edge" only if no Node APIs / Prisma
```

**Rule:** authenticated dashboard routes are dynamic and uncached. Marketing pages,
public storefronts, and blog content are static or ISR. Never cache a response whose body
depends on the current user unless the cache key includes the user.

Invalidate after writes:

```ts
revalidateTag("products");                       // preferred: precise
revalidatePath("/dashboard/products");           // path-level
revalidatePath("/store/[slug]", "page");         // dynamic segment
```

Use `unstable_cache` for expensive DB reads that are safe to share:

```ts
export const getPublicStore = unstable_cache(
  async (slug: string) => db.store.findUnique({ where: { slug } }),
  ["public-store"],
  { revalidate: 300, tags: ["store"] },
);
```

Never wrap a tenant-scoped or user-scoped query in a shared cache without the identifier
in the key array. That is how one customer sees another's data.

## Server Actions

Server actions are **public HTTP endpoints**. Anyone can call one with a crafted request.
Treat every action like an API route.

```ts
"use server";
import "server-only";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { requireWorkspace } from "@/server/context";
import { rateLimit } from "@/lib/rate-limit";
import type { Result } from "@/lib/result";

const schema = z.object({
  name: z.string().min(1).max(120),
  priceMinor: z.number().int().positive(),
});

export async function createProduct(raw: unknown): Promise<Result<{ id: string }>> {
  const { workspaceId, userId } = await requireWorkspace();          // 1. authn
  await rateLimit(`create-product:${userId}`, { limit: 20, window: "1m" }); // 2. abuse

  const parsed = schema.safeParse(raw);                              // 3. validate
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  if (!(await can(userId, "product:create", workspaceId))) {         // 4. authz
    return { ok: false, error: "Not allowed" };
  }

  const product = await db.product.create({
    data: { ...parsed.data, workspaceId },                           // 5. tenant scope
  });

  revalidateTag("products");                                         // 6. invalidate
  return { ok: true, data: { id: product.id } };
}
```

Actions **return** typed results; they don't throw for expected failures. Reserve throwing
for genuine bugs so the error boundary and Sentry catch them.

Never pass a raw Prisma object back to the client — map to a DTO with only the fields the
UI needs. `passwordHash` and `stripeCustomerId` do not belong in a payload.

## Route handlers

Use these for webhooks, third-party callbacks, file downloads, cron targets, and anything
consumed by a non-Next client. Not for your own pages' data — call the query directly.

```ts
// src/app/api/webhooks/paystack/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();                      // raw body BEFORE parsing
  const signature = req.headers.get("x-paystack-signature");
  if (!verifyPaystackSignature(raw, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }
  const event = JSON.parse(raw);
  await enqueue("paystack.event", event);            // do work async
  return Response.json({ received: true });          // ack fast
}
```

## Middleware

Middleware runs on the edge for every matched request. Keep it to cheap, universal
concerns: locale, redirects, subdomain → workspace rewriting, and a *cookie-presence*
check. Do the real session verification in the request path, not the edge.

```ts
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
```

No Prisma, no Node APIs, no heavy crypto in middleware.

## Metadata

```ts
export const metadata: Metadata = {
  title: { default: "Chunkz", template: "%s · Chunkz" },
  description: "Streetwear built in Lagos.",
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  openGraph: { type: "website", images: ["/og.png"] },
};

export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Not found" };
  return { title: product.name, description: product.summary };
}
```

See `38_SEO.md` for sitemaps, robots, canonical URLs, and JSON-LD.

## File conventions per route segment

| File            | Purpose                                             |
| --------------- | --------------------------------------------------- |
| `page.tsx`      | The route UI                                        |
| `layout.tsx`    | Persistent shell; does not re-render on navigation  |
| `loading.tsx`   | Suspense fallback for the segment                   |
| `error.tsx`     | `"use client"` error boundary with `reset()`        |
| `not-found.tsx` | Triggered by `notFound()`                           |
| `route.ts`      | HTTP handler (cannot coexist with `page.tsx`)       |
| `template.tsx`  | Like layout but remounts — use rarely               |

## Images, fonts, links

```tsx
<Image src={product.image} alt={product.name} width={600} height={600}
       sizes="(max-width: 768px) 100vw, 33vw" priority={isAboveFold} />
```

Configure `images.remotePatterns` for Supabase/Cloudinary hosts. Use `next/font` with
`display: "swap"`. Use `<Link>` for internal navigation — plain `<a>` kills prefetch.

## Common Next 15 mistakes

- `"use client"` at the top of a layout, dragging the whole tree client-side.
- Reading `process.env.SECRET` inside a client component (undefined, or leaked if public).
- Fetching your own `/api/*` route from a Server Component.
- Forgetting `await` on `params`/`cookies()`.
- Caching a personalized response.
- `useRouter` imported from `next/router` instead of `next/navigation`.
- Mutating without `revalidateTag`/`revalidatePath`, then wondering why the list is stale.
- Prisma in an edge-runtime route without an edge-compatible driver.
