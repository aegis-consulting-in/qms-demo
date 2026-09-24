import {
  ClipboardCheck,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "./types";

export interface NavItem {
  href: "/" | "/training" | "/maintenance" | "/suppliers" | "/projects" | "/audits" | "/admin";
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

export const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    shortLabel: "Dashboard",
    description: "Compliance overview across every module",
    icon: LayoutDashboard,
  },
  {
    href: "/training",
    label: "Training Management",
    shortLabel: "Training",
    description: "Employees, course registry, assignments and approvals",
    icon: GraduationCap,
  },
  {
    href: "/maintenance",
    label: "Preventive Maintenance",
    shortLabel: "PPM",
    description: "Asset registry, maintenance logs and document index",
    icon: Wrench,
  },
  {
    href: "/suppliers",
    label: "Supplier Management",
    shortLabel: "Suppliers",
    description: "Vendor registry and re-qualification tracking",
    icon: Truck,
  },
  {
    href: "/projects",
    label: "Project Management",
    shortLabel: "Projects",
    description: "Projects, phases, milestones and tasks",
    icon: FolderKanban,
  },
  {
    href: "/audits",
    label: "Audit Process",
    shortLabel: "Audits",
    description: "Process audits, sub-processes, KPIs and evidence",
    icon: ClipboardCheck,
  },
  {
    href: "/admin",
    label: "Admin Settings",
    shortLabel: "Admin",
    description: "Role simulation and reminder configuration",
    icon: Settings,
    roles: ["System Admin"],
  },
];

export const roleOptions: Array<{ role: UserRole; summary: string; capabilities: string[] }> = [
  {
    role: "Standard Employee",
    summary: "Can complete their own training and raise maintenance requests.",
    capabilities: [
      "My Training: start, attach evidence, submit for review",
      "Read-only access to registries",
      "Cannot approve submissions or edit master data",
    ],
  },
  {
    role: "Manager",
    summary: "Reviews submissions and owns module master data.",
    capabilities: [
      "Approve or reject training submissions with comments",
      "Create and edit employees, courses, assets, suppliers, projects, audits",
      "Cannot change platform settings",
    ],
  },
  {
    role: "System Admin",
    summary: "Full platform control including settings and reminders.",
    capabilities: [
      "Everything a Manager can do",
      "Admin Settings, role simulation, reminder rules",
      "Reset the local demo data set",
    ],
  },
];
