import { Reveal } from "@/components/ui/reveal";

type PageIntroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <section className="bg-background py-14 sm:py-20">
      <Reveal className="mx-auto max-w-3xl px-6 text-center">
        {eyebrow && (
          <p className="text-sm font-semibold tracking-wide text-accent uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 font-display text-4xl font-bold text-ink sm:text-5xl">
          {title}
        </h1>
        {description && <p className="mt-4 text-lg text-ink/70">{description}</p>}
      </Reveal>
    </section>
  );
}
