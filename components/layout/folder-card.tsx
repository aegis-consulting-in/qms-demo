import Link from "next/link";
import { FolderIcon } from "lucide-react";
import { cn } from "cn";

export function FolderCard({
  label,
  href,
  count,
  variant = "row",
}: {
  label: string;
  href: string;
  count: number;
  variant?: "row" | "tile";
}) {
  return (
    <Link
      href={href as never}
      className={cn(
        "group flex items-center gap-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none",
        variant === "tile"
          ? "rounded-lg border bg-card px-3 py-3 hover:bg-muted/60"
          : "rounded-md px-2 py-2.5 hover:bg-muted/80",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-brand">
        <FolderIcon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-foreground">{label}</span>
        <span className="block text-[11px] text-muted-foreground tabular-nums">
          {count} file{count === 1 ? "" : "s"}
        </span>
      </span>
    </Link>
  );
}
