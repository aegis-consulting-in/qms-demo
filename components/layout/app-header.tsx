import Link from "next/link";
import { ShieldCheckIcon } from "lucide-react";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import { HeaderNav } from "./header-nav";
import type { ModuleDef } from "@/lib/navigation";

type AppHeaderProps = {
  appName: string;
  user: { name: string; email: string; roles: string[] };
  modules: Pick<ModuleDef, "key" | "label" | "href">[];
};

export function AppHeader({ appName, user, modules }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand text-brand-foreground">
      <div className="mx-auto flex h-12 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-1">
          <MobileNav modules={modules} />
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-1 py-1 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
            aria-label={`${appName} home`}
          >
            <span className="flex size-6 items-center justify-center rounded bg-white/15">
              <ShieldCheckIcon className="size-3.5" />
            </span>
            <span className="font-heading text-[15px] font-semibold tracking-tight">{appName}</span>
          </Link>
        </div>

        <HeaderNav modules={modules} />

        <UserMenu name={user.name} email={user.email} roles={user.roles} />
      </div>
    </header>
  );
}
