import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Simply furniture by email or phone.",
};

const CONTACT_METHODS = [
  {
    label: "Email",
    value: "hello@simplyfurniture.com",
    href: "mailto:hello@simplyfurniture.com",
    note: "We reply within one business day.",
  },
  {
    label: "Phone",
    value: "+234 701 555 0134",
    href: "tel:+2347015550134",
    note: "Monday to Friday, 9am to 5pm WAT.",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title="Talk to a real person"
        description="Questions about an order, a custom piece, or visiting the workshop all go to the same small team."
      />

      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto grid max-w-4xl gap-8 px-6 sm:grid-cols-2">
          {CONTACT_METHODS.map((method, index) => (
            <Reveal
              key={method.label}
              delayMs={index * 80}
              className="rounded-3xl bg-cream-100 p-8 text-center"
            >
              <p className="text-sm font-semibold tracking-wide text-ink/60 uppercase">
                {method.label}
              </p>
              <p className="mt-3 font-display text-xl font-semibold text-ink">
                {method.value}
              </p>
              <p className="mt-2 text-sm text-ink/60">{method.note}</p>
              <div className="mt-5">
                <Button href={method.href}>{method.label === "Email" ? "Send an email" : "Call us"}</Button>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-4xl px-6">
          <Reveal className="rounded-3xl bg-maroon-950 p-8 text-center text-on-dark">
            <p className="text-sm font-semibold tracking-wide text-on-dark-muted uppercase">
              Workshop
            </p>
            <p className="mt-2 text-lg">14 Adeola Street, Yaba, Lagos, Nigeria</p>
            <p className="mt-1 text-on-dark-muted">
              Visits are by appointment. Email us to arrange a time.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
