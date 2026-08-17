import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Careers",
  description: "Open roles at Simply furniture, a small furniture workshop in Lagos.",
};

const OPEN_ROLES = [
  {
    title: "Furniture designer",
    location: "Lagos, onsite",
    type: "Full time",
    description:
      "Design new armchairs, chairs, and sofas from sketch through prototype, and sit in every version yourself before it ships.",
  },
  {
    title: "Workshop upholsterer",
    location: "Lagos, onsite",
    type: "Full time",
    description:
      "Cut, sew, and fit fabric on frames by hand, working closely with the design team to keep every piece consistent.",
  },
  {
    title: "Customer happiness specialist",
    location: "Remote",
    type: "Full time",
    description:
      "Answer questions about orders, care, and delivery, and pass along what customers tell you so the team can keep improving.",
  },
];

export default function CareersPage() {
  return (
    <>
      <PageIntro
        eyebrow="Careers"
        title="Build furniture people actually rest in"
        description="We are a small team in Lagos. Every hire changes how the workshop feels, so we take hiring slowly and seriously."
      />

      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex flex-col gap-6">
            {OPEN_ROLES.map((role, index) => (
              <Reveal
                key={role.title}
                delayMs={index * 80}
                className="flex flex-col gap-3 rounded-3xl bg-cream-100 p-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">
                    {role.title}
                  </h2>
                  <p className="mt-1 text-sm text-ink/60">
                    {role.location} · {role.type}
                  </p>
                  <p className="mt-2 max-w-md text-ink/70">{role.description}</p>
                </div>
                <Button href="/contact" size="sm" className="shrink-0">
                  Apply
                </Button>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 rounded-3xl bg-maroon-950 p-8 text-center text-on-dark">
            <h2 className="font-display text-2xl font-bold">Do not see the right role</h2>
            <p className="mt-2 text-on-dark-muted">
              We are a small team and roles open up as we grow. Reach out and tell us what
              you would want to work on.
            </p>
            <div className="mt-5">
              <Button href="/contact" variant="inverse">
                Get in touch
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
