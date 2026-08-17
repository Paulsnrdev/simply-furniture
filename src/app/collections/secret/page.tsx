import type { Metadata } from "next";
import { listSecretCollection } from "@/lib/catalog";
import { PageIntro } from "@/components/layout/page-intro";
import { ProductCard } from "@/components/ui/product-card";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Secret collection",
  description:
    "Eight pieces of furniture designed with Eric Lowe for relaxation, tranquility, and comfort.",
};

export default function SecretCollectionPage() {
  const products = listSecretCollection();

  return (
    <>
      <PageIntro
        eyebrow="Limited run"
        title="Sit down. Lie down. Rest now."
        description="Secret collection from Eric Lowe"
      />

      <section className="bg-background py-16 sm:py-20">
        <Reveal className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-lg text-ink/70">
            A collaboration between Simply and Reykjavik based designer Eric Lowe. Eight
            pieces of furniture for relaxation, tranquility, and comfort, available to order
            on our site only in February.
          </p>
          <p className="mt-4 text-ink/70">
            Every piece in this collection is upholstered by hand in a small workshop and
            made in limited numbers. Once a size sells out for the season, it does not come
            back until next year.
          </p>
          <div className="mt-8">
            <Button href="/contact">Ask about availability</Button>
          </div>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-5xl gap-8 px-6 sm:grid-cols-3">
          {products.map((product, index) => (
            <Reveal
              key={product.slug}
              delayMs={index * 80}
              className="flex flex-col items-center gap-3"
            >
              <ProductCard product={product} />
              <p className="max-w-xs text-center text-sm text-ink/60">
                {product.description}
              </p>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
