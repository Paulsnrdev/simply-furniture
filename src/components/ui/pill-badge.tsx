import { cn } from "@/lib/utils";

type PillBadgeProps = {
  children: React.ReactNode;
  tone?: "dark" | "light";
  className?: string;
};

export function PillBadge({ children, tone = "dark", className }: PillBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase",
        tone === "dark"
          ? "bg-maroon-950 text-on-dark"
          : "bg-paper text-maroon-950",
        className,
      )}
    >
      {children}
    </span>
  );
}
