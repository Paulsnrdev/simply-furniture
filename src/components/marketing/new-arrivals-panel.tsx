import Link from "next/link";
import Image from "next/image";
import { listNewProducts } from "@/lib/catalog";
import { PillBadge } from "@/components/ui/pill-badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export function NewArrivalsPanel() {
  const newProducts = listNewProducts();

  return (
    <aside aria-label="New arrivals" className="flex flex-col gap-3">
      {newProducts.map((product, index) => (
        <Reveal key={product.slug} delayMs={index * 80}>
          <Link
            href={`/shop/${product.category}`}
            className="flex items-center gap-3 rounded-2xl bg-maroon-900 p-3 transition-colors hover:bg-maroon-800"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
              <Image
                src={product.image}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div>
              <PillBadge tone="light" className="mb-1">
                New
              </PillBadge>
              <p className="text-sm font-medium text-on-dark">{product.name}</p>
            </div>
          </Link>
        </Reveal>
      ))}

      <Reveal delayMs={newProducts.length * 80}>
        <div className="rounded-2xl bg-maroon-900 p-4 text-center">
          <p className="text-sm text-on-dark-muted">We are hiring</p>
          <Button href="/careers" variant="inverse" size="sm" className="mt-2 w-full">
            More positions
          </Button>
        </div>
      </Reveal>
    </aside>
  );
}
