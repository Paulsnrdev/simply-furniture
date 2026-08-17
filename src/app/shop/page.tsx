import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, listProductsByCategory } from "@/lib/catalog";
import { PageIntro } from "@/components/layout/page-intro";
import { CategoryCard } from "@/components/marketing/category-card";
import { ProductCard } from "@/components/ui/product-card";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse every armchair, chair, and sofa Simply furniture makes.",
};

export default function ShopPage() {
  return (
    <>
      <PageIntro
        eyebrow="Shop"
        title="Every piece we make"
        description="Browse by room, or scroll through the full catalog below."
      />

      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {CATEGORIES.map((category, index) => (
              <Reveal key={category.slug} delayMs={index * 80}>
                <CategoryCard category={category} />
              </Reveal>
            ))}
          </div>

          {CATEGORIES.map((category) => (
            <div key={category.slug} className="mt-16">
              <Reveal className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-ink">
                    {category.name}
                  </h2>
                  <p className="mt-1 text-sm text-ink/60">{category.tagline}</p>
                </div>
                <Link
                  href={`/shop/${category.slug}`}
                  className="shrink-0 text-sm font-medium text-accent hover:text-accent-hover"
                >
                  View all
                </Link>
              </Reveal>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {listProductsByCategory(category.slug).map((product, index) => (
                  <Reveal key={product.slug} delayMs={index * 80}>
                    <ProductCard product={product} />
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
