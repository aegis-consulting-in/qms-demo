import { z } from "zod";
import { checkbox, email, optionalDate, optionalText, optionalUuid, requiredText, uuid } from "./common";

export const employeeSchema = z.object({
  employeeCode: requiredText("Employee code", 30),
  firstName: requiredText("First name", 80),
  lastName: requiredText("Last name", 80),
  email,
  phone: optionalText(40),
  departmentId: optionalUuid,
  jobTitleId: optionalUuid,
  managerId: optionalUuid,
  isManager: checkbox.default(false),
  joiningDate: optionalDate,
  notes: optionalText(2000),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;

export const updateEmployeeSchema = employeeSchema.extend({ id: uuid });

export const setEmployeeActiveSchema = z.object({ id: uuid, isActive: z.boolean() });

/** Admin: create an auth login for an existing employee. */
export const createLoginForEmployeeSchema = z.object({
  employeeId: uuid,
  roleIds: z.array(uuid).min(1, "Select at least one role."),
  sendInvite: z.boolean().default(false),
  temporaryPassword: z.string().min(8, "Temporary password must be at least 8 characters.").max(72).optional(),
});
