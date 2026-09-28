import { z } from "zod";
import { checkbox, optionalDate, optionalEmail, optionalNumber, optionalText, optionalUuid, requiredText, uuid } from "./common";

export const SUPPLIER_STATUSES = ["active", "inactive", "probationary", "blacklisted"] as const;

export const supplierSchema = z.object({
  code: requiredText("Supplier code", 30),
  name: requiredText("Supplier name", 200),
  contactPerson: optionalText(120),
  email: optionalEmail,
  phone: optionalText(40),
  address: optionalText(500),
  category: optionalText(80),
  departmentId: optionalUuid,
  serviceSupplied: optionalText(500),
  status: z.enum(SUPPLIER_STATUSES).default("active"),
  evaluationComplete: checkbox.default(false),
  reviewDueDate: optionalDate,
  rating: optionalNumber(0, 5),
  notes: optionalText(5000),
});
export type SupplierInput = z.infer<typeof supplierSchema>;
export const updateSupplierSchema = supplierSchema.extend({ id: uuid });
