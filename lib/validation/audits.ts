import { z } from "zod";
import { optionalDate, optionalText, optionalUuid, requiredText, uuid } from "./common";

export const AUDIT_STATUSES = ["planned", "in_progress", "completed", "closed"] as const;
export const AUDIT_TYPES = ["internal", "external"] as const;
export const FINDING_SEVERITIES = ["observation", "minor", "major", "critical"] as const;
export const FINDING_STATUSES = ["open", "in_progress", "closed"] as const;
export const CORRECTIVE_ACTION_STATUSES = ["open", "in_progress", "completed", "verified", "cancelled"] as const;

export const auditSchema = z.object({
  code: requiredText("Audit code", 30),
  title: requiredText("Title", 200),
  processName: optionalText(200),
  departmentId: optionalUuid,
  auditorId: optionalUuid,
  auditDate: optionalDate,
  auditType: z.enum(AUDIT_TYPES).default("internal"),
  status: z.enum(AUDIT_STATUSES).default("planned"),
  responsibility: optionalText(500),
  applicableClauses: optionalText(500),
  inputs: optionalText(5000),
  activities: optionalText(5000),
  outputs: optionalText(5000),
  interactions: optionalText(5000),
  summary: optionalText(10000),
  notes: optionalText(5000),
});
export type AuditInput = z.infer<typeof auditSchema>;
export const updateAuditSchema = auditSchema.extend({ id: uuid });

export const findingSchema = z.object({
  auditId: uuid,
  title: requiredText("Finding title", 200),
  description: optionalText(5000),
  clause: optionalText(80),
  severity: z.enum(FINDING_SEVERITIES).default("minor"),
  status: z.enum(FINDING_STATUSES).default("open"),
});
export type FindingInput = z.infer<typeof findingSchema>;
export const updateFindingSchema = findingSchema.extend({ id: uuid });

export const correctiveActionSchema = z.object({
  auditId: uuid,
  findingId: optionalUuid,
  description: requiredText("Description", 5000),
  ownerId: optionalUuid,
  dueDate: optionalDate,
  completedDate: optionalDate,
  status: z.enum(CORRECTIVE_ACTION_STATUSES).default("open"),
});
export type CorrectiveActionInput = z.infer<typeof correctiveActionSchema>;
export const updateCorrectiveActionSchema = correctiveActionSchema.extend({ id: uuid });
