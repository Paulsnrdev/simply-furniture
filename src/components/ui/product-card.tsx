import Image from "next/image";
import { formatPrice, type Product } from "@/lib/catalog";
import { PillBadge } from "@/components/ui/pill-badge";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  product: Product;
  showPrice?: boolean;
  variant?: "light" | "dark";
  className?: string;
};

export function ProductCard({
  product,
  showPrice = true,
  variant = "light",
  className,
}: ProductCardProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 overflow-hidden rounded-3xl",
        isDark ? "bg-maroon-900" : "bg-paper shadow-sm",
        className,
      )}
    >
      <div className="relative aspect-square">
        {product.isNew && (
          <PillBadge tone={isDark ? "light" : "dark"} className="absolute top-3 left-3 z-10">
            New
          </PillBadge>
        )}
        <Image
          src={product.image}
          alt={product.imageAlt}
          fill
          sizes="(max-width: 640px) 100vw, 25vw"
          className="object-cover"
        />
      </div>
      <div className="px-4 pb-4 text-center">
        <p
          className={cn(
            "font-display text-lg font-semibold",
            isDark ? "text-on-dark" : "text-ink",
          )}
        >
          {product.name}
        </p>
        {showPrice && (
          <p className={cn("text-sm", isDark ? "text-on-dark-muted" : "text-ink/60")}>
            {formatPrice(product.priceMinor)}
          </p>
        )}
      </div>
    </div>
  );
}
