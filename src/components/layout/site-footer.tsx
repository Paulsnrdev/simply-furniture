import Link from "next/link";

type FooterColumn = {
  heading: string;
  links: { label: string; href: string }[];
};

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Shop",
    links: [
      { label: "All furniture", href: "/shop" },
      { label: "Armchairs", href: "/shop/armchairs" },
      { label: "Chairs", href: "/shop/chairs" },
      { label: "Sofas", href: "/shop/sofas" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Shipping", href: "/shipping" },
      { label: "Returns", href: "/returns" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-cream-100 text-ink/70">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-extrabold tracking-tight text-ink">
                simply
              </span>
              <span className="text-xs tracking-wide uppercase">furniture</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm">
              Simple furniture for a softer life. Designed and shipped from Lagos.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h3 className="text-sm font-semibold text-ink">{column.heading}</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-ink/10 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright 2026 Simply furniture. All rights reserved.</p>
          <p>Made for people who want to sit down and stay a while.</p>
        </div>
      </div>
    </footer>
  );
}
