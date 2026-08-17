import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Returns",
  description: "Our return window, process, and refund timelines.",
};

const RETURN_SECTIONS = [
  {
    title: "Return window",
    body: "You can return most pieces within fourteen days of delivery. The item needs to be unused, in its original condition, and free of stains or damage.",
  },
  {
    title: "What cannot be returned",
    body: "Custom fabric or color orders and every piece from the Secret Collection are made specifically for you and are final sale. We will always tell you before you order if a piece falls into this category.",
  },
  {
    title: "How to start a return",
    body: "Email us with your order number and the reason for the return. We will confirm eligibility and arrange pickup, usually within three business days.",
  },
  {
    title: "Refunds",
    body: "Once we receive and inspect the returned piece, we refund your original payment method within five business days. You will get an email when the refund is issued.",
  },
  {
    title: "Damaged on arrival",
    body: "If a piece arrives damaged, email us photos within forty eight hours of delivery. We will send a replacement or issue a full refund at no cost to you.",
  },
];

export default function ReturnsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Returns"
        title="Our return policy"
        description="Straightforward rules, and a real person to help if something is not right."
      />

      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6">
          {RETURN_SECTIONS.map((section, index) => (
            <Reveal key={section.title} delayMs={(index % 3) * 80}>
              <h2 className="font-display text-xl font-semibold text-ink">
                {section.title}
              </h2>
              <p className="mt-2 text-ink/70">{section.body}</p>
            </Reveal>
          ))}

          <Reveal className="mt-4 rounded-3xl bg-cream-100 p-8 text-center">
            <p className="text-ink/70">Ready to start a return</p>
            <div className="mt-4">
              <Button href="/contact">Contact us</Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
