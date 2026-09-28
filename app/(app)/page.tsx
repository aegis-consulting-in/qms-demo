import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";
import { FolderCard } from "@/components/layout/folder-card";
import { ModuleButton } from "@/components/layout/module-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getModuleFolders } from "@/lib/data/documents";
import { getMyAssignments } from "@/lib/data/training";
import { FOLDERS, MODULES } from "@/lib/navigation";
import { formatDate, isOverdue } from "@/lib/format";

export default async function HomePage() {
  const user = await requireUser();
  const canSeeDocs = user.can(PERMISSIONS.documents.view);

  const [folderCounts, myAssignments] = await Promise.all([
    canSeeDocs
      ? Promise.all(
          FOLDERS.filter((f) => f.home).map(
            async (f) => [f.key, (await getModuleFolders(f.key)).reduce((n, x) => n + x.count, 0)] as const,
          ),
        )
      : Promise.resolve([]),
    user.employee ? getMyAssignments(user.employee.id) : Promise.resolve([]),
  ]);
  const counts = Object.fromEntries(folderCounts) as Record<string, number>;

  const modules = MODULES.filter((m) => m.permissions.length === 0 || user.canAny(m.permissions));
  const attention = myAssignments.filter(
    (a) => a.status === "overdue" || (a.status !== "completed" && a.status !== "cancelled" && isOverdue(a.due_date)),
  );
  const upcoming = myAssignments.filter((a) => a.status === "assigned" || a.status === "in_progress").slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Overview</p>
        <h1 className="font-heading mt-1 text-xl font-semibold tracking-tight">{user.profile.full_name ?? user.email}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {[user.employee?.employee_code, user.roles.map((r) => r.name).join(", ")].filter(Boolean).join(" · ")}
        </p>
      </div>

      {canSeeDocs ? (
        <section className="rounded-lg border bg-card px-1 py-0.5 sm:px-2" aria-label="Document folders">
          <div className="grid grid-cols-2 sm:grid-cols-4 sm:divide-x">
            {FOLDERS.filter((f) => f.home).map((f) => (
              <FolderCard key={f.key} label={f.label} href={f.href} count={counts[f.key] ?? 0} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]">
        <section className="grid gap-3 sm:grid-cols-2" aria-label="Modules">
          {modules.map((m) => (
            <ModuleButton key={m.key} label={m.label} description={m.description} href={m.href} icon={m.icon} />
          ))}
        </section>

        {user.employee ? (
          <aside className="flex flex-col gap-3">
            {attention.length ? (
              <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-3.5">
                <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangleIcon className="size-4" />
                  {attention.length} overdue
                </p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {attention.slice(0, 3).map((a) => (
                    <li key={a.id}>
                      <Link href={`/training/${a.training_id}`} className="font-medium hover:underline">
                        {a.training?.name ?? "Training"}
                      </Link>
                      <span className="block text-xs text-muted-foreground">Due {formatDate(a.due_date)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="rounded-lg border bg-card p-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">My trainings</h2>
                <Link href="/training/my" className="text-xs font-medium text-brand hover:underline">
                  View all
                </Link>
              </div>
              {upcoming.length ? (
                <ul className="mt-3 divide-y">
                  {upcoming.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <Link href={`/training/${a.training_id}`} className="block truncate text-sm font-medium hover:underline">
                          {a.training?.name ?? "Training"}
                        </Link>
                        <span className="text-xs text-muted-foreground">Due {formatDate(a.due_date)}</span>
                      </div>
                      <StatusBadge status={a.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">No open assignments.</p>
              )}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
