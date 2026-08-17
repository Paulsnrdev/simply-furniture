import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES, listProductsByCategory, type CategorySlug } from "@/lib/catalog";
import { PageIntro } from "@/components/layout/page-intro";
import { ProductCard } from "@/components/ui/product-card";
import { Reveal } from "@/components/ui/reveal";

type CategoryPageProps = {
  params: Promise<{ category: string }>;
};

function findCategory(slug: string) {
  return CATEGORIES.find((category) => category.slug === slug);
}

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const category = findCategory(slug);
  if (!category) return { title: "Not found" };
  return {
    title: category.name,
    description: category.description,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: slug } = await params;
  const category = findCategory(slug);
  if (!category) notFound();

  const products = listProductsByCategory(category.slug as CategorySlug);

  return (
    <>
      <PageIntro eyebrow="Shop" title={category.name} description={category.description} />

      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <Reveal key={product.slug} delayMs={index * 80}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
