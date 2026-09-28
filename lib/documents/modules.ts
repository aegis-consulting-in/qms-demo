import type { DocumentModule } from "@/lib/types/database";
import { FOLDERS } from "@/lib/navigation";

const ALIASES: Record<string, DocumentModule> = {
  training: "training",
  project: "project",
  projects: "project",
  supplier: "supplier",
  suppliers: "supplier",
  "preventive-maintenance": "preventive-maintenance",
  maintenance: "preventive-maintenance",
  audit: "audit",
  audits: "audit",
  employee: "employee",
  employees: "employee",
};

export function parseDocumentModule(slug: string | undefined): DocumentModule | null {
  if (!slug) return null;
  return ALIASES[slug] ?? null;
}

export function folderForModule(module: DocumentModule) {
  return FOLDERS.find((f) => f.key === module);
}
