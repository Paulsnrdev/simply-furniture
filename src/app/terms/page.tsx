import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/page-intro";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms that apply when you order from Simply furniture.",
};

const TERMS_SECTIONS = [
  {
    title: "Orders and pricing",
    body: "Prices shown at checkout are final and include all fees except delivery, which is calculated separately. We reserve the right to correct a listed price if it was clearly a mistake, and will always contact you before charging a corrected amount.",
  },
  {
    title: "Payment",
    body: "Payment is collected in full when you place your order. Made to order pieces, including the Secret Collection, begin production once payment is confirmed.",
  },
  {
    title: "Shipping and delivery",
    body: "Delivery timelines are estimates, not guarantees. See the Shipping page for current timelines by region. We are not responsible for delays caused by the carrier or by incorrect address information.",
  },
  {
    title: "Returns",
    body: "Returns are handled under the policy on our Returns page, which is part of these terms.",
  },
  {
    title: "Product descriptions",
    body: "We describe every material and dimension as accurately as we can. Because fabrics and wood are natural materials, small variations in color and grain between pieces are normal and not considered defects.",
  },
  {
    title: "Intellectual property",
    body: "Every design, photo, and piece of writing on this site belongs to Simply furniture. You may not reproduce our designs for commercial purposes without written permission.",
  },
  {
    title: "Limitation of liability",
    body: "Our liability for any order is limited to the amount you paid for that order. We are not liable for indirect damages such as lost time or inconvenience.",
  },
  {
    title: "Changes to these terms",
    body: "We may update these terms as our business grows. When we do, we update the date below and post the new version here.",
  },
];

export default function TermsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Legal"
        title="Terms of service"
        description="Last updated August 2026."
      />

      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6">
          {TERMS_SECTIONS.map((section, index) => (
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
