import Image from "next/image";
import { listSecretCollection } from "@/lib/catalog";
import { ProductCard } from "@/components/ui/product-card";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SECRET_COLLECTION_LIFESTYLE_IMAGE } from "@/lib/media";

export function SecretCollectionSection() {
  const products = listSecretCollection();

  return (
    <section className="bg-maroon-950 py-16 text-on-dark sm:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal className="relative aspect-4/3 overflow-hidden rounded-3xl">
            <Image
              src={SECRET_COLLECTION_LIFESTYLE_IMAGE.src}
              alt={SECRET_COLLECTION_LIFESTYLE_IMAGE.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </Reveal>

          <Reveal delayMs={120}>
            <h2 className="font-display text-3xl leading-tight font-bold sm:text-4xl">
              Sit down. Lie down. Rest now.
            </h2>
            <p className="mt-2 font-display text-xl text-on-dark-muted">
              Secret collection from Eric Lowe
            </p>
            <p className="mt-4 max-w-prose text-on-dark-muted">
              A collaboration between Simply and Reykjavik based designer Eric Lowe. Eight
              pieces of furniture for relaxation, tranquility, and comfort, available to
              order on our site only in February.
            </p>
            <div className="mt-6">
              <Button href="/collections/secret" variant="inverse">
                Shop the collection
              </Button>
            </div>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {products.map((product, index) => (
            <Reveal key={product.slug} delayMs={index * 80}>
              <ProductCard product={product} variant="dark" showPrice={false} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
