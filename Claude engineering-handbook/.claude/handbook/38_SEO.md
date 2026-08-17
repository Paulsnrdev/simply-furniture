# 38 — SEO

Matters most for marketing sites, public storefronts, QR menus, and public form/landing
pages. Irrelevant behind a login — mark those `noindex`.

## The order of importance

1. **Indexable, fast, working pages** — everything else is noise if Google can't render it.
2. **One clear topic per URL** with a real title and description.
3. **Content people actually want.**
4. Structured data, internal links, backlinks.

## Metadata

```ts
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: { default: "Chunkz — Streetwear built in Lagos", template: "%s · Chunkz" },
  description: "Tees, hoodies, tracksuits and jerseys. Designed and printed in Nigeria.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Chunkz",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};
```

Per-page, generated from data:

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Not found", robots: { index: false } };

  return {
    title: product.name,
    description: product.summary.slice(0, 155),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { images: [product.image], type: "article" },
  };
}
```

Rules: title 50–60 characters with the important words first, description 140–160 and
written for a human deciding whether to click (it's not a ranking factor, it's a click-rate
factor), a canonical on every page, and unique titles everywhere — duplicate titles across
a catalog is one of the most common real problems.

## Rendering

Static or ISR for anything public. A page that requires JavaScript to show its content
gets indexed inconsistently at best.

```ts
export const revalidate = 3600;

export async function generateStaticParams() {
  const products = await db.product.findMany({ where: { published: true }, select: { slug: true } });
  return products.map(({ slug }) => ({ slug }));
}
```

Content in the initial HTML. Check with `curl` — if the product name isn't in the response
body, neither is it in the index.

## URLs

```
✓ /products/black-oversized-tee
✗ /products?id=8f3a91b2-...
✗ /p/12345
```

Lowercase, hyphenated, descriptive, stable. Slugs are permanent — if one must change, 301
the old one forever. Keep them shallow; avoid dates in URLs unless the content is dated.

## Sitemap and robots

```ts
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.product.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  });
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}

// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard/", "/checkout/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
```

For multi-tenant storefronts, generate a sitemap per tenant domain. Never list a
`noindex`ed URL in the sitemap — it's a contradictory signal.

## Structured data

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.name,
  image: [product.image],
  description: product.summary,
  offers: {
    "@type": "Offer",
    priceCurrency: "NGN",
    price: (Number(product.priceMinor) / 100).toFixed(2),
    availability: product.stock > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
  },
}) }} />
```

Worth doing for: `Product` + `Offer` (price and stock in results), `LocalBusiness`,
`FAQPage`, `Article`, `BreadcrumbList`. Validate with Google's Rich Results Test. Marking up
things that aren't visible on the page is a penalty risk, not a shortcut.

## Core Web Vitals

Google ranks on field data. `22_PERFORMANCE.md` covers the work; for SEO specifically the
big three are: optimize the LCP image, reserve space for everything that loads late (CLS),
and cut third-party scripts (INP).

## Content basics

- One `<h1>` per page, describing the page. Headings in order, no skipping levels.
- Descriptive `alt` on images — accessibility and image search at once.
- Internal links with meaningful anchor text, not "click here".
- Answer the question in the first paragraph.
- Update and consolidate rather than publishing thin near-duplicates.

## Multi-tenant / custom domain SEO

Each storefront on its own domain is its own site: its own sitemap, canonical URLs pointing
at the custom domain (not your platform domain), and a `noindex` on the platform-subdomain
version so the two don't compete. Verify each domain in Search Console — or give tenants
the instructions to.

## Local SEO (Nigeria)

Include the city and country in titles and content where relevant. Register the business on
Google Business Profile. Use `LocalBusiness` structured data with real address and hours.
NGN pricing and local phone formats. `hreflang` only if you genuinely serve multiple
languages.

## Checklist for a new public page

- [ ] Unique title (50–60) and description (140–160)
- [ ] Canonical URL set
- [ ] OG image renders correctly when shared to WhatsApp and X
- [ ] Content present in the server-rendered HTML
- [ ] In the sitemap; not blocked by robots
- [ ] One `<h1>`, ordered headings
- [ ] Images optimized, sized, with alt text
- [ ] Structured data where applicable, validated
- [ ] LCP under 2.5s on mobile
- [ ] Internal links pointing to it from somewhere
