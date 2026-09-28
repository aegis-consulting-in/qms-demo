import Link from "next/link";
import { ChevronRightIcon, type LucideIcon } from "lucide-react";

/** Module entry used on the home page and training hub. */
export function ModuleButton({
  label,
  description,
  href,
  icon: Icon,
}: {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href as never}
      className="group flex items-start gap-3.5 rounded-lg border border-border bg-card px-4 py-3.5 transition-colors hover:border-brand/35 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{description}</span>
      </span>
      <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground/60 group-hover:text-brand" />
    </Link>
  );
}
