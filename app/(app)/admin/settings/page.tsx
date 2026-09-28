import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { SystemSettingsForm } from "@/components/admin/settings-form";
import { PageHeader, Section } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getAllSettings } from "@/lib/data/admin";

export const metadata: Metadata = { title: "System settings" };

function asString(value: unknown, fallback: string) {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  return String(value);
}

export default async function AdminSettingsPage() {
  const user = await requirePagePermission(PERMISSIONS.admin.settings);
  const rows = await getAllSettings();
  const map: Record<string, unknown> = {};
  for (const r of rows) map[r.key] = r.value;

  const dueDays = map["reminders.training_due_days"];
  const trainingDueDays = Array.isArray(dueDays) ? dueDays.join(", ") : asString(dueDays, "14, 7");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="System Settings"
        description="Application identity and reminder mailboxes. Additional keys can be added later without changing the page layout."
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Settings" }]}
      />
      <AdminNav can={(k) => user.can(k)} current="settings" />
      <Section>
        <SystemSettingsForm
          defaults={{
            appName: asString(map["app.name"], "SkillHub"),
            organisation: asString(map["app.organisation"], "Northwind Labs"),
            equipmentReminderEmail: asString(map["reminders.equipment_email"], "maintenance@example.com"),
            supplierReminderEmail: asString(map["reminders.supplier_email"], "procurement@example.com"),
            trainingDueDays,
          }}
        />
      </Section>
    </div>
  );
}
