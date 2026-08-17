import type { Metadata } from "next";
import Image from "next/image";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { HERO_IMAGE } from "@/lib/media";

export const metadata: Metadata = {
  title: "About",
  description: "The story behind Simply furniture and why we build soft, simple pieces.",
};

const VALUES = [
  {
    title: "Comfort first",
    body: "A chair earns its place in your home by how it feels after an hour, not how it looks in a photo. We sit in every prototype for a full week before it goes into production.",
  },
  {
    title: "Fewer, better pieces",
    body: "We would rather sell you one sofa you keep for ten years than five you replace every winter. Every collection stays small on purpose.",
  },
  {
    title: "Made close to home",
    body: "Our frames are built and upholstered in our own workshop in Lagos, by the same small team, so quality never depends on a factory we have never visited.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="About us"
        title="Furniture for a softer life"
        description="Simply furniture started with one question: why does resting at home so often feel like an afterthought?"
      />

      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
          <Reveal className="relative aspect-square overflow-hidden rounded-3xl">
            <Image
              src={HERO_IMAGE.src}
              alt={HERO_IMAGE.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </Reveal>
          <Reveal delayMs={120}>
            <p className="text-lg text-ink/70">
              We started Simply furniture in 2021 with three people, a small workshop, and
              one armchair design. Most furniture we tried felt built for a showroom, not for
              the way people actually spend an evening: curled up, feet tucked under them,
              in no hurry to get up.
            </p>
            <p className="mt-4 text-lg text-ink/70">
              Today we design and build armchairs, chairs, and sofas around the same idea.
              Soft, rounded forms. Fabrics that feel better the longer you own them. Fewer
              sharp edges, fewer reasons to sit up straight.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-cream-100 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal>
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              What we care about
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {VALUES.map((value, index) => (
              <Reveal key={value.title} delayMs={index * 80}>
                <h3 className="font-display text-xl font-semibold text-ink">
                  {value.title}
                </h3>
                <p className="mt-2 text-ink/70">{value.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-16 text-center sm:py-20">
        <Reveal className="mx-auto max-w-xl px-6">
          <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            Want to see the pieces for yourself
          </h2>
          <p className="mt-3 text-ink/70">
            Browse the full catalog or get in touch if you would like to visit the workshop.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/shop">Shop furniture</Button>
            <Button href="/contact" variant="outline" className="text-ink">
              Contact us
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
