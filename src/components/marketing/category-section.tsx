import { CATEGORIES } from "@/lib/catalog";
import { CategoryCard } from "@/components/marketing/category-card";
import { Reveal } from "@/components/ui/reveal";

export function CategorySection() {
  return (
    <section className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="grid gap-8 lg:grid-cols-2 lg:items-end">
          <h2 className="font-display text-4xl leading-tight font-bold text-ink sm:text-5xl">
            Simplifying life with the soft forms
          </h2>
          <div>
            <p className="max-w-prose text-ink/70">
              We create more than just furniture. We create furniture that will make your
              life easier, softer, and more comfortable. Cozy armchairs, soft chairs, and
              sofas you want to fall into, so you can really rest.
            </p>
            <p className="mt-4 text-sm font-medium text-ink/60">
              Explore the most popular furniture categories of the month
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {CATEGORIES.map((category, index) => (
            <Reveal key={category.slug} delayMs={index * 80}>
              <CategoryCard category={category} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
