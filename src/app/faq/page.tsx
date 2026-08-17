import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/page-intro";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about ordering, delivery, and care.",
};

const FAQS = [
  {
    question: "How long does an order take to arrive",
    answer:
      "Most in stock pieces ship within five business days and arrive within two weeks inside Nigeria. The Secret Collection is made to order and takes four to six weeks, since each piece is upholstered by hand after you order it.",
  },
  {
    question: "Do you deliver outside Lagos",
    answer:
      "Yes. We deliver across Nigeria through a small network of trusted carriers. See the Shipping page for costs and timelines by region.",
  },
  {
    question: "What are your frames and cushions made from",
    answer:
      "Frames are solid oak or walnut. Cushions use high density foam wrapped in fiber for a seat that holds its shape for years instead of flattening after a few months.",
  },
  {
    question: "Can I order a custom fabric or color",
    answer:
      "For most armchairs and sofas, yes. Email us with the piece you want and the fabric or color in mind, and we will confirm price and lead time before you order.",
  },
  {
    question: "How do I clean and care for my furniture",
    answer:
      "Vacuum fabric surfaces weekly with a soft brush attachment and blot spills immediately rather than rubbing them in. Every order ships with a care card specific to its fabric.",
  },
  {
    question: "What is your return policy",
    answer:
      "Most pieces can be returned within fourteen days of delivery if unused and in original condition. Custom orders and the Secret Collection are final sale. Full details are on the Returns page.",
  },
];

export default function FaqPage() {
  return (
    <>
      <PageIntro
        eyebrow="FAQ"
        title="Common questions"
        description="If your question is not here, email us and a real person will answer."
      />

      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <dl className="flex flex-col gap-8">
            {FAQS.map((faq, index) => (
              <Reveal key={faq.question} delayMs={(index % 3) * 80}>
                <dt className="font-display text-lg font-semibold text-ink">
                  {faq.question}
                </dt>
                <dd className="mt-2 text-ink/70">{faq.answer}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
