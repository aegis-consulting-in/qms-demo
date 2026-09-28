import { z } from "zod";
import { optionalDate, optionalNumber, optionalText, optionalUuid, requiredDate, requiredText, uuid } from "./common";

export const ASSIGNMENT_STATUSES = ["assigned", "in_progress", "completed", "overdue", "cancelled"] as const;

export const trainingSchema = z.object({
  code: optionalText(30),
  name: requiredText("Training name", 200),
  description: optionalText(5000),
  levelId: optionalUuid,
  statusId: optionalUuid,
  durationHours: optionalNumber(0, 10000),
});
export type TrainingInput = z.infer<typeof trainingSchema>;
export const updateTrainingSchema = trainingSchema.extend({ id: uuid });

export const assignTrainingSchema = z
  .object({
    trainingId: uuid,
    employeeIds: z.array(uuid).min(1, "Select at least one employee."),
    assignedDate: requiredDate,
    dueDate: optionalDate,
    notes: optionalText(2000),
  })
  .refine((d) => !d.dueDate || d.dueDate >= d.assignedDate, {
    message: "Due date cannot be before the assigned date.",
    path: ["dueDate"],
  });
export type AssignTrainingInput = z.infer<typeof assignTrainingSchema>;

export const updateAssignmentStatusSchema = z.object({
  id: uuid,
  status: z.enum(ASSIGNMENT_STATUSES),
  completionDate: optionalDate,
  notes: optionalText(2000),
});
export type UpdateAssignmentStatusInput = z.infer<typeof updateAssignmentStatusSchema>;

export const trainingConfigItemSchema = z.object({
  id: uuid.optional(),
  name: requiredText("Name", 80),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().optional(),
});
