import { z } from "zod";
import { optionalDate, optionalText, optionalUuid, requiredText, uuid } from "./common";

export const PROJECT_STATUSES = ["planning", "active", "on_hold", "completed", "cancelled"] as const;
export const PROJECT_PRIORITIES = ["low", "medium", "high", "critical"] as const;

export const projectSchema = z
  .object({
    code: requiredText("Project code", 30),
    name: requiredText("Project name", 200),
    description: optionalText(5000),
    managerId: optionalUuid,
    startDate: optionalDate,
    expectedEndDate: optionalDate,
    actualEndDate: optionalDate,
    status: z.enum(PROJECT_STATUSES).default("planning"),
    priority: z.enum(PROJECT_PRIORITIES).default("medium"),
    notes: optionalText(5000),
  })
  .refine((d) => !d.startDate || !d.expectedEndDate || d.expectedEndDate >= d.startDate, {
    message: "Expected end date cannot be before the start date.",
    path: ["expectedEndDate"],
  });
export type ProjectInput = z.infer<typeof projectSchema>;
export const updateProjectSchema = z.object({ id: uuid }).and(projectSchema);

export const projectMemberSchema = z.object({
  projectId: uuid,
  employeeId: uuid,
  roleInProject: optionalText(80),
});
export const removeProjectMemberSchema = z.object({ projectId: uuid, employeeId: uuid });
