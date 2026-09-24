"use client";

import { ChevronDown, UserCog } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { roleOptions } from "@/lib/navigation";
import { useQms, useSession } from "@/lib/store";
import type { UserRole } from "@/lib/types";
import { cx, initials } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

const roleTones = {
  "Standard Employee": "slate",
  Manager: "indigo",
  "System Admin": "violet",
} as const;

export function RoleMenu() {
  const { state } = useQms();
  const { role, currentUser, setSession } = useSession();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const activeEmployees = state.employees.filter((employee) => employee.status === "Active");

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
          {currentUser ? initials(currentUser.name) : <UserCog className="h-4 w-4" />}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-[10rem] truncate text-xs font-semibold text-slate-900">
            {currentUser?.name ?? "No user"}
          </span>
          <span className="block text-[11px] text-slate-500">{role}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open ? (
        <div className="animate-pop-in absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Simulate role
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Switching the role changes which actions and tabs are available.
            </p>
          </div>
          <div className="space-y-1 p-2">
            {roleOptions.map((option) => (
              <button
                key={option.role}
                type="button"
                onClick={() => setSession({ role: option.role })}
                className={cx(
                  "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                  option.role === role ? "bg-indigo-50" : "hover:bg-slate-50",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{option.role}</span>
                    {option.role === role ? (
                      <Badge tone={roleTones[option.role]}>Active</Badge>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">{option.summary}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-200 px-4 py-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Signed in as
              </span>
              <select
                value={state.session.employeeId}
                onChange={(event) => setSession({ employeeId: event.target.value })}
                className="w-full rounded-lg border-0 bg-white px-2.5 py-1.5 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-500"
              >
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} — {employee.jobRole}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RoleGate({
  allow,
  role,
  children,
  fallback,
}: {
  allow: UserRole[];
  role: UserRole;
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  return allow.includes(role) ? children : fallback;
}
