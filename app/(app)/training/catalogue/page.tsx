import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  GraduationCapIcon,
  PlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ClearFilters, FilterSelect, ListToolbar, SearchInput, SortSelect } from "@/components/shared/list-toolbar";
import { PageHeader, Section } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { StatCard, StatGrid } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getTrainingLevels, getTrainingStatuses } from "@/lib/data/master";
import { getTrainingStats, listTrainings } from "@/lib/data/training";
import { paginationSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: "Training catalogue" };

export default async function TrainingCataloguePage({ searchParams }: PageProps<"/training/catalogue">) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = paginationSchema.parse(params);
  const levelId = typeof params.level === "string" ? params.level : undefined;
  const statusId = typeof params.status === "string" ? params.status : undefined;

  const canViewCatalog = user.canAny([PERMISSIONS.training.view, PERMISSIONS.training.assign, PERMISSIONS.training.team]);
  const [{ rows, total }, stats, levels, statuses] = await Promise.all([
    listTrainings({ ...filters, levelId, statusId }),
    canViewCatalog ? getTrainingStats() : Promise.resolve(null),
    getTrainingLevels(),
    getTrainingStatuses(),
  ]);

  type Training = (typeof rows)[number];
  const columns: Column<Training>[] = [
    {
      key: "name",
      header: "Training",
      cell: (t) => (
        <div className="min-w-0">
          <Link href={`/training/${t.id}`} className="font-medium hover:underline">
            {t.name}
          </Link>
          {t.code ? <p className="text-xs text-muted-foreground">{t.code}</p> : null}
        </div>
      ),
    },
    { key: "level", header: "Level", cell: (t) => t.level?.name ?? "—", hideBelow: "md" },
    { key: "hours", header: "Duration", cell: (t) => (t.duration_hours ? `${t.duration_hours} h` : "—"), hideBelow: "lg" },
    { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status?.name} /> },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Training catalogue"
        description="Courses available for assignment."
        crumbs={[{ label: "HR", href: "/training" }, { label: "Catalogue" }]}
        actions={
          user.can(PERMISSIONS.training.create) ? (
            <Button render={<Link href="/training/new" />}>
              <PlusIcon /> New training
            </Button>
          ) : null
        }
      />
      {stats ? (
        <StatGrid>
          <StatCard label="Trainings" value={stats.trainings} icon={GraduationCapIcon} />
          <StatCard label="Assignments" value={stats.assignments} icon={ClipboardListIcon} />
          <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangleIcon} tone={stats.overdue ? "danger" : "default"} />
          <StatCard label="Completed" value={stats.completed} icon={CheckCircle2Icon} tone="success" />
        </StatGrid>
      ) : null}
      <Section>
        <div className="flex flex-col gap-3">
          <ListToolbar>
            <SearchInput placeholder="Search trainings…" className="w-full sm:w-72" />
            <FilterSelect param="level" placeholder="All levels" options={levels.map((l) => ({ value: l.id, label: l.name }))} ariaLabel="Level" />
            <FilterSelect param="status" placeholder="All status" options={statuses.map((s) => ({ value: s.id, label: s.name }))} ariaLabel="Status" />
            <SortSelect
              options={[
                { value: "name", label: "Name" },
                { value: "code", label: "Code" },
                { value: "created", label: "Created" },
                { value: "hours", label: "Duration" },
              ]}
            />
            <ClearFilters keys={["q", "level", "status", "sort", "dir"]} />
          </ListToolbar>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            emptyTitle="No trainings found"
            emptyDescription={canViewCatalog ? "Create a training to get started." : "Trainings appear here once they are assigned to you."}
          />
          <Pagination page={filters.page} pageSize={filters.pageSize} total={total} />
        </div>
      </Section>
    </div>
  );
}
