import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, ScrollTextIcon, ShieldIcon, UsersIcon } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard, StatGrid } from "@/components/shared/stat-card";
import { requirePagePermission } from "@/lib/auth/guards";
import { getAdminStats } from "@/lib/data/admin";
import { ADMIN_SECTIONS } from "@/lib/navigation";

export const metadata: Metadata = { title: "Admin Settings" };

export default async function AdminPage() {
  const user = await requirePagePermission(...ADMIN_SECTIONS.flatMap((s) => s.permissions));
  const stats = await getAdminStats();
  const sections = ADMIN_SECTIONS.filter((s) => s.permissions.some((p) => user.can(p)));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Admin Settings" description="Users, roles, master data and system configuration." crumbs={[{ label: "Admin" }]} />
      <AdminNav can={(k) => user.can(k)} current="dashboard" />
      <StatGrid>
        <StatCard label="Users" value={stats.users} icon={UsersIcon} hint={`${stats.activeUsers} active`} />
        <StatCard label="Roles" value={stats.roles} icon={ShieldIcon} />
        <StatCard label="Audit log entries" value={stats.logs} icon={ScrollTextIcon} />
      </StatGrid>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.key}
              href={s.href as never}
              className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-brand/35 hover:bg-muted/40"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-heading text-sm font-semibold">{s.label}</span>
                  <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{s.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
