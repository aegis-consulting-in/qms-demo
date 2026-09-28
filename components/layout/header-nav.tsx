"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderIcon } from "lucide-react";
import { cn } from "cn";
import type { ModuleDef } from "@/lib/navigation";

function shortLabel(label: string) {
  return label.replace(" Management", "").replace(" Settings", "").replace(" Process", "");
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNav({ modules }: { modules: Pick<ModuleDef, "key" | "label" | "href">[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
      {modules.slice(0, 6).map((m) => (
        <Link
          key={m.key}
          href={m.href as never}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
            isActive(pathname, m.href) ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
          )}
        >
          {shortLabel(m.label)}
        </Link>
      ))}
      <Link
        href={"/documents" as never}
        className={cn(
          "ml-1 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
          isActive(pathname, "/documents") ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
        )}
      >
        <FolderIcon className="size-3.5" />
        Documents
      </Link>
    </nav>
  );
}
