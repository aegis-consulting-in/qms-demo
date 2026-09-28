"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FOLDERS } from "@/lib/navigation";
import { cn } from "cn";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav({ modules }: { modules: { key: string; label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="flex size-8 items-center justify-center rounded-md text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none lg:hidden"
        aria-label="Open navigation"
      >
        <MenuIcon className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-sm">Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-5 overflow-y-auto p-3" aria-label="Mobile navigation">
          <div>
            <p className="px-2 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Modules</p>
            {modules.map((m) => (
              <Link
                key={m.key}
                href={m.href as never}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-md px-2 py-2 text-sm font-medium",
                  isActive(pathname, m.href) ? "bg-muted text-foreground" : "hover:bg-muted",
                )}
              >
                {m.label}
              </Link>
            ))}
          </div>
          <div>
            <p className="px-2 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Documents</p>
            {FOLDERS.map((f) => (
              <Link
                key={f.key}
                href={f.href as never}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-md px-2 py-2 text-sm",
                  isActive(pathname, f.href) ? "bg-muted text-foreground" : "hover:bg-muted",
                )}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
