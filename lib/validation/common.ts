import { z } from "zod";

export const uuid = z.uuid({ message: "Invalid identifier." });

/** Empty strings from HTML forms become null. */
export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be ${max} characters or fewer.`);

/** yyyy-mm-dd or empty. */
export const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.union([z.iso.date({ message: "Enter a valid date." }), z.null()]))
  .nullable()
  .optional();

export const requiredDate = z.iso.date({ message: "Enter a valid date." });

export const optionalUuid = z
  .string()
  .trim()
  .transform((v) => (v === "" || v === "none" ? null : v))
  .pipe(z.union([uuid, z.null()]))
  .nullable()
  .optional();

export const optionalEmail = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v.toLowerCase()))
  .pipe(
    z.union([
      z
        .string()
        .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."),
      z.null(),
    ]),
  )
  .nullable()
  .optional();

export const email = z
  .string()
  .trim()
  .min(3, "Enter a valid email address.")
  .max(200, "Enter a valid email address.")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address.")
  .transform((v) => v.toLowerCase());

export const checkbox = z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean());

export const optionalNumber = (min?: number, max?: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z
      .number({ message: "Enter a number." })
      .refine((n) => min === undefined || n >= min, { message: `Must be at least ${min}.` })
      .refine((n) => max === undefined || n <= max, { message: `Must be at most ${max}.` })
      .nullable(),
  );

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
  q: z.string().trim().max(200).optional().default(""),
  sort: z.string().trim().max(50).optional(),
  dir: z.enum(["asc", "desc"]).optional().default("asc"),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

export const idSchema = z.object({ id: uuid });
