/**
 * Permission keys. These MUST match rows in public.permissions (supabase/seed.sql).
 * Keeping them as a const object gives autocompletion and catches typos at build time.
 */
export const PERMISSIONS = {
  training: {
    view: "training.view",
    create: "training.create",
    edit: "training.edit",
    delete: "training.delete",
    assign: "training.assign",
    team: "training.team",
  },
  employee: {
    view: "employee.view",
    create: "employee.create",
    edit: "employee.edit",
    delete: "employee.delete",
  },
  project: {
    view: "project.view",
    create: "project.create",
    edit: "project.edit",
    delete: "project.delete",
  },
  supplier: {
    view: "supplier.view",
    create: "supplier.create",
    edit: "supplier.edit",
    delete: "supplier.delete",
  },
  maintenance: {
    view: "maintenance.view",
    create: "maintenance.create",
    edit: "maintenance.edit",
    delete: "maintenance.delete",
  },
  audit: {
    view: "audit.view",
    create: "audit.create",
    edit: "audit.edit",
    delete: "audit.delete",
  },
  documents: {
    view: "documents.view",
    upload: "documents.upload",
    download: "documents.download",
    delete: "documents.delete",
  },
  admin: {
    users: "admin.users",
    roles: "admin.roles",
    permissions: "admin.permissions",
    settings: "admin.settings",
    documents: "admin.documents",
    auditLogs: "admin.audit_logs",
  },
} as const;

type Leaves<T> = T extends string ? T : { [K in keyof T]: Leaves<T[K]> }[keyof T];
export type PermissionKey = Leaves<typeof PERMISSIONS>;

export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(PERMISSIONS).flatMap((group) =>
  Object.values(group),
) as PermissionKey[];

/** Any-of check used for module entry points. */
export const MODULE_ACCESS: Record<string, PermissionKey[]> = {
  training: [PERMISSIONS.training.view, PERMISSIONS.training.team, PERMISSIONS.training.assign],
  employees: [PERMISSIONS.employee.view],
  projects: [PERMISSIONS.project.view],
  suppliers: [PERMISSIONS.supplier.view],
  maintenance: [PERMISSIONS.maintenance.view],
  audits: [PERMISSIONS.audit.view],
  documents: [PERMISSIONS.documents.view],
  admin: [
    PERMISSIONS.admin.users,
    PERMISSIONS.admin.roles,
    PERMISSIONS.admin.permissions,
    PERMISSIONS.admin.settings,
    PERMISSIONS.admin.documents,
    PERMISSIONS.admin.auditLogs,
  ],
};

export function hasPermission(granted: ReadonlySet<string> | readonly string[], key: PermissionKey): boolean {
  if (granted instanceof Set) return granted.has(key);
  return (granted as readonly string[]).includes(key);
}

export function hasAnyPermission(granted: ReadonlySet<string> | readonly string[], keys: readonly PermissionKey[]) {
  return keys.some((k) => hasPermission(granted, k));
}
