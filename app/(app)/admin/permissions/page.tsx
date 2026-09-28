import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPermissions } from "@/lib/data/master";
import { humanize } from "@/lib/format";

export const metadata: Metadata = { title: "Permissions" };

export default async function AdminPermissionsPage() {
  const user = await requirePagePermission(PERMISSIONS.admin.permissions);
  const permissions = await getPermissions();
  const grouped = new Map<string, typeof permissions>();
  for (const p of permissions) {
    const list = grouped.get(p.module) ?? [];
    list.push(p);
    grouped.set(p.module, list);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Permission Management"
        description="Permissions are granted to roles. This catalogue is seeded with the application and is not edited by hand."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Permissions" }]}
      />
      <AdminNav can={(k) => user.can(k)} current="permissions" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[...grouped.entries()].map(([module, perms]) => (
          <Section key={module} title={humanize(module)}>
            <ul className="flex flex-col gap-2">
              {perms.map((p) => (
                <li key={p.id} className="rounded-lg border px-3 py-2">
                  <p className="text-sm font-medium">{humanize(p.action)}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{p.key}</p>
                  {p.description ? <p className="mt-0.5 text-xs text-muted-foreground">{p.description}</p> : null}
                </li>
              ))}
            </ul>
          </Section>
        ))}
      </div>
    </div>
  );
}
