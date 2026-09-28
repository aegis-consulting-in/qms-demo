import Link from "next/link";
import { cn } from "cn";
import type { PermissionKey } from "@/lib/auth/permissions";
import { ADMIN_SECTIONS } from "@/lib/navigation";

export function AdminNav({ can, current }: { can: (key: PermissionKey) => boolean; current?: string }) {
  const items = ADMIN_SECTIONS.filter((s) => s.permissions.some((p) => can(p)));
  return (
    <nav className="flex gap-1 overflow-x-auto border-b pb-px" aria-label="Admin sections">
      {items.map((s) => (
        <Link
          key={s.key}
          href={s.href as never}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors",
            current === s.key
              ? "border-brand text-foreground"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          {s.label.replace(" Management", "")}
        </Link>
      ))}
    </nav>
  );
}
