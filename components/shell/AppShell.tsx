"use client";

import { Menu, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { navItems } from "@/lib/navigation";
import { useSession } from "@/lib/store";
import { cx } from "@/lib/utils";
import { IconButton } from "@/components/ui/Button";
import { RoleMenu } from "./RoleMenu";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { role } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role));
  const activeItem =
    visibleItems.find((item) => item.href !== "/" && pathname.startsWith(item.href)) ??
    visibleItems.find((item) => item.href === pathname);

  return (
    <div className="flex min-h-screen bg-slate-100">
      {mobileOpen ? (
        <div
          className="animate-fade-in fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-800 bg-slate-900 transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Northwind QMS</p>
              <p className="text-[11px] text-slate-400">Quality Management System</p>
            </div>
          </div>
          <IconButton
            label="Close navigation"
            icon={<X className="h-4 w-4" />}
            className="text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-2 pb-2 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
            Modules
          </p>
          {visibleItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cx(
                  "group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                <Icon className={cx("mt-0.5 h-4 w-4 shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-white")} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span
                    className={cx(
                      "mt-0.5 block text-[11px] leading-snug",
                      active ? "text-indigo-100" : "text-slate-500",
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-4 py-3">
          <p className="text-[11px] leading-relaxed text-slate-500">
            Standalone demo build. All records, uploads and settings live in your browser only.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <IconButton
            label="Open navigation"
            icon={<Menu className="h-5 w-5" />}
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
              {activeItem?.label ?? "Dashboard"}
            </h1>
            <p className="hidden truncate text-xs text-slate-500 sm:block">
              {activeItem?.description ?? "Compliance overview across every module"}
            </p>
          </div>
          <RoleMenu />
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
