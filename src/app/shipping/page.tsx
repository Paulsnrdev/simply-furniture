import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/page-intro";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Shipping",
  description: "Delivery areas, timelines, and costs for Simply furniture orders.",
};

const SHIPPING_SECTIONS = [
  {
    title: "Delivery areas",
    body: "We deliver across Nigeria. Lagos and Abuja orders go out with our own delivery team. Every other state ships through a trusted carrier partner.",
  },
  {
    title: "Timelines",
    body: "In stock armchairs, chairs, and sofas ship within five business days. Lagos deliveries usually arrive within a week of shipping; other states can take up to two weeks. Secret Collection pieces are made to order and take four to six weeks total.",
  },
  {
    title: "Delivery cost",
    body: "Delivery within Lagos is free on orders over two hundred dollars. Every other order shows its exact delivery cost at checkout based on size and distance, calculated before you pay.",
  },
  {
    title: "Assembly",
    body: "Every armchair and sofa arrives fully assembled. Dining chairs may arrive with legs packed separately and take about ten minutes to attach, with instructions included.",
  },
  {
    title: "Tracking your order",
    body: "Once your order ships, we email you a tracking link. If anything looks off in transit, contact us and we will sort it out before the piece reaches you.",
  },
];

export default function ShippingPage() {
  return (
    <>
      <PageIntro
        eyebrow="Shipping"
        title="How delivery works"
        description="Everything you need to know from checkout to your front door."
      />

      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6">
          {SHIPPING_SECTIONS.map((section, index) => (
            <Reveal key={section.title} delayMs={(index % 3) * 80}>
              <h2 className="font-display text-xl font-semibold text-ink">
                {section.title}
              </h2>
              <p className="mt-2 text-ink/70">{section.body}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
