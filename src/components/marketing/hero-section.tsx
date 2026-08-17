import Image from "next/image";
import { Button } from "@/components/ui/button";
import { NewArrivalsPanel } from "@/components/marketing/new-arrivals-panel";
import { HERO_IMAGE } from "@/lib/media";

export function HeroSection() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="relative overflow-hidden rounded-3xl bg-maroon-900 px-6 py-10 text-on-dark sm:px-10 sm:py-12">
            <h1 className="font-display text-[20vw] leading-[0.82] font-extrabold tracking-tight sm:text-[9rem] lg:text-[7.5rem]">
              simply
            </h1>
            <p className="mt-1 font-display text-2xl text-on-dark-muted sm:text-3xl">
              furniture
            </p>

            <div className="mt-10 flex flex-col-reverse items-center justify-between gap-8 sm:flex-row">
              <div className="relative h-52 w-52 shrink-0 overflow-hidden rounded-full sm:h-64 sm:w-64">
                <Image
                  src={HERO_IMAGE.src}
                  alt={HERO_IMAGE.alt}
                  fill
                  sizes="(max-width: 640px) 208px, 256px"
                  priority
                  className="object-cover"
                />
              </div>
              <div className="max-w-xs text-center sm:text-right">
                <p className="text-lg text-on-dark-muted">
                  Simple furniture for a soft life.
                </p>
                <div className="mt-4 flex justify-center sm:justify-end">
                  <Button href="/shop" size="lg">
                    Shop the collection
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <NewArrivalsPanel />
        </div>
      </div>
    </section>
  );
}
