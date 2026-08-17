import Image from "next/image";
import type { Category } from "@/lib/catalog";
import { Button } from "@/components/ui/button";

type CategoryCardProps = {
  category: Category;
};

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <div className="overflow-hidden rounded-3xl bg-cream-100">
      <div className="relative aspect-4/3">
        <Image
          src={category.image}
          alt={category.imageAlt}
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className="object-cover"
        />
      </div>
      <div className="flex items-center justify-between gap-4 p-5">
        <p className="font-display text-lg font-semibold text-ink">{category.name}</p>
        <Button href={`/shop/${category.slug}`} size="sm">
          Shop
        </Button>
      </div>
    </div>
  );
}
