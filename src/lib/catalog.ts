export type CategorySlug = "armchairs" | "chairs" | "sofas";

export type Category = {
  slug: CategorySlug;
  name: string;
  tagline: string;
  description: string;
  image: string;
  imageAlt: string;
};

export type Product = {
  slug: string;
  name: string;
  category: CategorySlug;
  image: string;
  imageAlt: string;
  priceMinor: number;
  isNew?: boolean;
  description: string;
};

export const CATEGORIES: Category[] = [
  {
    slug: "armchairs",
    name: "Armchairs",
    tagline: "Sink in and stay a while",
    description:
      "Deep seats and rounded backs built for the end of a long day, when all you want is somewhere soft to land.",
    image:
      "https://images.unsplash.com/photo-1572534382971-f8ff4d4cb1c1?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "A pair of brown leather armchairs beside a fireplace",
  },
  {
    slug: "chairs",
    name: "Chairs",
    tagline: "Everyday seats with soft edges",
    description:
      "Dining and side chairs with clean lines and a padded seat, so a family dinner feels as easy as it looks.",
    image:
      "https://images.unsplash.com/photo-1773847521422-77ff84e29353?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "A round wooden dining table and chairs in a sunlit room",
  },
  {
    slug: "sofas",
    name: "Sofas",
    tagline: "Low, wide, and made for lounging",
    description:
      "Curved frames and oversized cushions built for stretching out, whether you are alone with a book or hosting the whole family.",
    image:
      "https://images.unsplash.com/photo-1759722668253-1767030ad9b2?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "A modern grey sectional sofa in an empty room",
  },
];

export const PRODUCTS: Product[] = [
  {
    slug: "koda",
    name: "Koda",
    category: "armchairs",
    image:
      "https://images.unsplash.com/photo-1759722666941-a90d5a15b1d7?auto=format&fit=crop&w=800&q=80",
    imageAlt: "A beige recliner chair with a striped weave",
    priceMinor: 64000,
    isNew: true,
    description:
      "A soft beige recliner with a woven texture and a wide seat, built for kicking back at the end of the day.",
  },
  {
    slug: "diana",
    name: "Diana",
    category: "armchairs",
    image:
      "https://images.unsplash.com/photo-1572534382971-f8ff4d4cb1c1?auto=format&fit=crop&w=800&q=80",
    imageAlt: "A brown leather armchair beside a fireplace",
    priceMinor: 58000,
    isNew: true,
    description:
      "A rich brown leather armchair with a rounded back and a dark wood frame, built for a spot next to the fire.",
  },
  {
    slug: "verta",
    name: "Verta",
    category: "armchairs",
    image:
      "https://images.unsplash.com/photo-1775494108186-8d7354660c64?auto=format&fit=crop&w=800&q=80",
    imageAlt: "A bright green chair in a colorful room",
    priceMinor: 52000,
    isNew: true,
    description:
      "A bright green lounge chair that adds a fresh accent to a reading corner or sunny window.",
  },
  {
    slug: "cresta",
    name: "Cresta",
    category: "armchairs",
    image:
      "https://images.unsplash.com/photo-1617104424032-b9bd6972d0e4?auto=format&fit=crop&w=800&q=80",
    imageAlt: "A brown wood framed padded armchair",
    priceMinor: 69000,
    description:
      "A brown wood framed armchair with padded upholstery and a classic, rounded silhouette.",
  },
  {
    slug: "perra",
    name: "Perra",
    category: "armchairs",
    image:
      "https://images.unsplash.com/photo-1587055838950-474b4ddab1fd?auto=format&fit=crop&w=800&q=80",
    imageAlt: "A pink velvet chair beside a round table",
    priceMinor: 61000,
    description:
      "A soft pink velvet chair with clean lines, at home beside a window or in a reading nook.",
  },
  {
    slug: "nima",
    name: "Nima",
    category: "chairs",
    image:
      "https://images.unsplash.com/photo-1758977404607-9d6217cad08a?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Upholstered dining chairs at a wooden table",
    priceMinor: 18500,
    description:
      "An upholstered dining chair with a curved back, shown here around a sunlit dining table.",
  },
  {
    slug: "sona",
    name: "Sona",
    category: "chairs",
    image:
      "https://images.unsplash.com/photo-1758977403403-c51ef509e788?auto=format&fit=crop&w=800&q=80",
    imageAlt: "A wooden dining table with six upholstered chairs",
    priceMinor: 21000,
    description:
      "A padded dining chair over a solid wood frame, part of a set built for family dinners.",
  },
  {
    slug: "talo",
    name: "Talo",
    category: "chairs",
    image:
      "https://images.unsplash.com/photo-1733076939837-eb7463329163?auto=format&fit=crop&w=800&q=80",
    imageAlt: "A dining chair in a cozy home setting",
    priceMinor: 19500,
    description:
      "A slim dining chair with a relaxed, understated silhouette for everyday meals.",
  },
  {
    slug: "duna",
    name: "Duna",
    category: "sofas",
    image:
      "https://images.unsplash.com/photo-1759722668253-1767030ad9b2?auto=format&fit=crop&w=800&q=80",
    imageAlt: "A modern grey sectional sofa in an empty room",
    priceMinor: 189000,
    description:
      "A modern sectional sofa in a soft neutral tone, with clean lines built for stretching out.",
  },
  {
    slug: "wela",
    name: "Wela",
    category: "sofas",
    image:
      "https://images.unsplash.com/photo-1768609239321-1cfe14893e80?auto=format&fit=crop&w=800&q=80",
    imageAlt: "A low sofa in a minimalist living room",
    priceMinor: 164000,
    description:
      "A low, wide sofa in a soft neutral tone with oversized cushions built for sinking into.",
  },
  {
    slug: "bram",
    name: "Bram",
    category: "sofas",
    image:
      "https://images.unsplash.com/photo-1748050868813-18553aaa8cc5?auto=format&fit=crop&w=800&q=80",
    imageAlt: "A bold terracotta orange couch in a modern living room",
    priceMinor: 172000,
    description:
      "A modular sofa in a bold terracotta tone, built to anchor a room and be rearranged as it changes.",
  },
];

export const SECRET_COLLECTION_SLUGS = ["verta", "cresta", "perra"] as const;

export function getCategory(slug: CategorySlug): Category {
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) throw new Error(`Unknown category: ${slug}`);
  return category;
}

export function listProductsByCategory(slug: CategorySlug): Product[] {
  return PRODUCTS.filter((product) => product.category === slug);
}

export function listNewProducts(): Product[] {
  return PRODUCTS.filter((product) => product.isNew);
}

export function listSecretCollection(): Product[] {
  return SECRET_COLLECTION_SLUGS.map((slug) => {
    const product = PRODUCTS.find((p) => p.slug === slug);
    if (!product) throw new Error(`Unknown product: ${slug}`);
    return product;
  });
}

export function formatPrice(priceMinor: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(priceMinor / 100);
}
