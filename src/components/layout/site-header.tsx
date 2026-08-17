import Link from "next/link";
import { NAV_LINKS } from "@/components/layout/nav-links";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper text-ink">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-extrabold tracking-tight">
            simply
          </span>
          <span className="text-xs tracking-wide text-ink/60 uppercase">
            furniture
          </span>
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-ink/60 transition-colors hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden lg:block">
          <Button href="/shop" size="sm">
            Shop now
          </Button>
        </div>

        <MobileNav links={NAV_LINKS} />
      </div>
    </header>
  );
}
