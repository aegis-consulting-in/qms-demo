import "server-only";

import type { CurrentUser } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getAdminStats } from "./admin";
import { getAuditStats } from "./audits";
import { getDocumentStats } from "./documents";
import { getEmployeeStats } from "./employees";
import { getMaintenanceStats } from "./maintenance";
import { getProjectStats } from "./projects";
import { getSupplierStats } from "./suppliers";
import { getMyAssignments, getTrainingStats } from "./training";
import { createClient } from "@/lib/supabase/server";
import { humanize } from "@/lib/format";
import { MODULE_LABELS } from "@/lib/documents/storage";
import type { DocumentModule } from "@/lib/types/database";

export type ChartSlice = { key: string; label: string; value: number };

function tally(values: string[]): ChartSlice[] {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()]
    .map(([key, value]) => ({ key, label: humanize(key), value }))
    .sort((a, b) => b.value - a.value);
}

async function columnTally(
  table: "training_assignments" | "projects" | "suppliers" | "maintenance_records" | "audits",
  column: "status",
  opts?: { notDeleted?: boolean },
): Promise<ChartSlice[]> {
  const supabase = await createClient();
  let q = supabase.from(table).select(column);
  if (opts?.notDeleted) q = q.is("deleted_at", null);
  const { data, error } = await q;
  if (error) throw error;
  return tally((data ?? []).map((row) => String((row as { status: string }).status)));
}

export async function loadDashboard(user: CurrentUser) {
  const orgTraining =
    user.can(PERMISSIONS.training.view) || user.can(PERMISSIONS.training.assign) || user.can(PERMISSIONS.training.team);
  const employees = user.can(PERMISSIONS.employee.view);
  const suppliers = user.can(PERMISSIONS.supplier.view);
  const maintenance = user.can(PERMISSIONS.maintenance.view);
  const documents = user.can(PERMISSIONS.documents.view);
  const admin =
    user.can(PERMISSIONS.admin.users) || user.can(PERMISSIONS.admin.roles) || user.can(PERMISSIONS.admin.auditLogs);
  // Projects and audits are visible to members/auditors via RLS even without *.view.
  const projects = true;
  const audits = true;

  const [
    myAssignments,
    trainingStats,
    assignmentSlices,
    employeeStats,
    projectStats,
    projectSlices,
    supplierStats,
    supplierSlices,
    maintenanceStats,
    maintenanceSlices,
    auditStats,
    auditSlices,
    documentStats,
    adminStats,
  ] = await Promise.all([
    user.employee ? getMyAssignments(user.employee.id) : Promise.resolve(null),
    orgTraining ? getTrainingStats() : Promise.resolve(null),
    orgTraining ? columnTally("training_assignments", "status") : Promise.resolve(null),
    employees ? getEmployeeStats() : Promise.resolve(null),
    projects ? getProjectStats() : Promise.resolve(null),
    projects ? columnTally("projects", "status", { notDeleted: true }) : Promise.resolve(null),
    suppliers ? getSupplierStats() : Promise.resolve(null),
    suppliers ? columnTally("suppliers", "status", { notDeleted: true }) : Promise.resolve(null),
    maintenance ? getMaintenanceStats() : Promise.resolve(null),
    maintenance ? columnTally("maintenance_records", "status", { notDeleted: true }) : Promise.resolve(null),
    audits ? getAuditStats() : Promise.resolve(null),
    audits ? columnTally("audits", "status", { notDeleted: true }) : Promise.resolve(null),
    documents ? getDocumentStats() : Promise.resolve(null),
    admin ? getAdminStats() : Promise.resolve(null),
  ]);

  const mySlices = myAssignments ? tally(myAssignments.map((a) => a.status)) : null;
  const documentSlices: ChartSlice[] | null = documentStats
    ? Object.entries(documentStats.byModule)
        .map(([key, v]) => ({
          key,
          label: MODULE_LABELS[key as DocumentModule] ?? humanize(key),
          value: v.count,
        }))
        .sort((a, b) => b.value - a.value)
    : null;

  return {
    orgTraining,
    myAssignments,
    mySlices,
    trainingStats,
    assignmentSlices,
    employeeStats,
    projectStats,
    projectSlices,
    supplierStats,
    supplierSlices,
    maintenanceStats,
    maintenanceSlices,
    auditStats,
    auditSlices,
    documentStats,
    documentSlices,
    adminStats,
  };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
