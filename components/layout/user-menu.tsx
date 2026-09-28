"use client";

import Link from "next/link";
import { KeyRoundIcon, LogOutIcon, UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/lib/actions/auth";
import { initials } from "@/lib/format";

export function UserMenu({ name, email, roles }: { name: string; email: string; roles: string[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-md px-1 py-0.5 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
        aria-label="Open user menu"
      >
        <Avatar className="size-7 border border-white/20">
          <AvatarFallback className="bg-white/15 text-[11px] font-semibold text-white">{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-[13px] font-medium text-white sm:inline">{name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          <span className="truncate text-xs text-muted-foreground">{email}</span>
          {roles.length ? <span className="truncate text-xs text-muted-foreground">{roles.join(" · ")}</span> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" />}>
          <UserIcon /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/profile/change-password" />}>
          <KeyRoundIcon /> Change password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem variant="destructive" render={<button type="submit" className="w-full" />}>
            <LogOutIcon /> Sign out
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
