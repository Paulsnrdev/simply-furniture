import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/page-intro";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What information Simply furniture collects and how we use it.",
};

const PRIVACY_SECTIONS = [
  {
    title: "What we collect",
    body: "When you place an order or contact us, we collect your name, email, phone number, delivery address, and order details. When you browse the site, we collect basic analytics like which pages you visit and how long you stay.",
  },
  {
    title: "How we use it",
    body: "We use your information to process and deliver orders, respond to questions, and understand which pages and products people find useful. We do not sell your information to anyone.",
  },
  {
    title: "Who we share it with",
    body: "We share delivery details with the carrier partner shipping your order, and payment details with our payment processor. Both are bound to use that information only to complete your order.",
  },
  {
    title: "Cookies",
    body: "We use a small number of cookies to keep your cart working and to understand overall site traffic. You can disable cookies in your browser, though parts of the site may work less smoothly.",
  },
  {
    title: "How long we keep it",
    body: "We keep order records for as long as required for warranty, tax, and accounting purposes, and delete contact form messages after two years if no order follows.",
  },
  {
    title: "Your rights",
    body: "You can ask us what information we hold about you, ask us to correct it, or ask us to delete it, subject to what we are required to keep for legal reasons. Email us to make a request.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageIntro
        eyebrow="Legal"
        title="Privacy policy"
        description="Last updated August 2026."
      />

      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6">
          {PRIVACY_SECTIONS.map((section, index) => (
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
