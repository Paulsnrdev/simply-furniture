const REPEAT_COUNT = 6;

export function MarqueeBanner() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden border-y border-white/10 bg-maroon-950 py-3"
    >
      <div className="animate-marquee flex w-max gap-6">
        {[0, 1].map((group) => (
          <div key={group} className="flex shrink-0 gap-6">
            {Array.from({ length: REPEAT_COUNT }).map((_, i) => (
              <span
                key={i}
                className="flex items-center gap-6 text-sm font-semibold tracking-wide text-on-dark-muted uppercase"
              >
                Secret collection. Quantity limited.
                <span aria-hidden="true">{"•"}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
