import { z } from "zod";
import { email, optionalText, requiredText, uuid } from "./common";
import { passwordSchema } from "./auth";

export const roleSchema = z.object({
  name: requiredText("Role name", 60),
  description: optionalText(500),
});
export const updateRoleSchema = roleSchema.extend({ id: uuid });
export const setRolePermissionsSchema = z.object({
  roleId: uuid,
  permissionIds: z.array(uuid),
});

export const createUserSchema = z.object({
  email,
  fullName: requiredText("Full name", 120),
  password: passwordSchema,
  roleIds: z.array(uuid).min(1, "Select at least one role."),
  employeeId: z.union([uuid, z.literal("")]).optional(),
  mustChangePassword: z.boolean().default(true),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const setUserRolesSchema = z.object({
  userId: uuid,
  roleIds: z.array(uuid),
});

export const setUserActiveSchema = z.object({ userId: uuid, isActive: z.boolean() });

export const adminResetPasswordSchema = z.object({
  userId: uuid,
  newPassword: passwordSchema,
});

export const departmentSchema = z.object({
  name: requiredText("Department name", 100),
  code: optionalText(20),
  description: optionalText(500),
  isActive: z.boolean().default(true),
});
export const updateDepartmentSchema = departmentSchema.extend({ id: uuid });

export const jobTitleSchema = z.object({
  name: requiredText("Job title", 100),
  description: optionalText(500),
  isActive: z.boolean().default(true),
});
export const updateJobTitleSchema = jobTitleSchema.extend({ id: uuid });

export const systemSettingsSchema = z.object({
  appName: requiredText("Application name", 60),
  organisation: requiredText("Organisation", 120),
  equipmentReminderEmail: email,
  supplierReminderEmail: email,
  trainingDueDays: z
    .string()
    .trim()
    .min(1, "Enter at least one reminder day.")
    .refine((s) => s.split(",").every((x) => /^\s*\d{1,3}\s*$/.test(x)), "Enter comma-separated numbers, e.g. 14, 7"),
});
export type SystemSettingsInput = z.infer<typeof systemSettingsSchema>;

export const auditLogFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  action: z.string().trim().max(100).optional().default(""),
  entityType: z.string().trim().max(50).optional().default(""),
  actor: z.string().trim().max(200).optional().default(""),
});
