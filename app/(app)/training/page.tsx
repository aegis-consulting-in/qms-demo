import type { Metadata } from "next";
import {
  BookOpenIcon,
  ClipboardListIcon,
  GraduationCapIcon,
  PlusIcon,
  UserPlusIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { ModuleButton } from "@/components/layout/module-button";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export const metadata: Metadata = { title: "HR" };

type Tile = { label: string; description: string; href: string; icon: LucideIcon; show: boolean };

export default async function TrainingHubPage() {
  const user = await requireUser();

  const tiles: Tile[] = [
    {
      label: "Employee Details",
      description: "People, departments and training history",
      href: "/training/employees",
      icon: UsersIcon,
      show: user.isManager || user.can(PERMISSIONS.employee.view),
    },
    {
      label: "Create Employee Training",
      description: "Assign a training to one or more employees",
      href: "/training/assign",
      icon: UserPlusIcon,
      show: user.canAny([PERMISSIONS.training.assign, PERMISSIONS.training.team]),
    },
    {
      label: "My Trainings",
      description: "Trainings assigned to you",
      href: "/training/my",
      icon: BookOpenIcon,
      show: Boolean(user.employee),
    },
    {
      label: "Create New Training",
      description: "Add a course to the catalogue",
      href: "/training/new",
      icon: PlusIcon,
      show: user.can(PERMISSIONS.training.create),
    },
    {
      label: "Manage Team Trainings",
      description: "Track progress for people who report to you",
      href: "/training/team",
      icon: ClipboardListIcon,
      show: (user.isManager && user.can(PERMISSIONS.training.team)) || user.can(PERMISSIONS.training.assign),
    },
    {
      label: "Training Catalogue",
      description: "Browse and manage courses",
      href: "/training/catalogue",
      icon: GraduationCapIcon,
      show: user.canAny([PERMISSIONS.training.view, PERMISSIONS.training.assign, PERMISSIONS.training.create]),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="HR"
        description="People, training and HR records."
        crumbs={[{ label: "HR" }]}
      />
      <section className="grid gap-3 sm:grid-cols-2" aria-label="HR sections">
        {tiles
          .filter((t) => t.show)
          .map((t) => (
            <ModuleButton key={t.href} label={t.label} description={t.description} href={t.href} icon={t.icon} />
          ))}
      </section>
    </div>
  );
}
