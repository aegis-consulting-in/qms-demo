import { z } from "zod";
import { AuthError } from "@/lib/auth/guards";

/**
 * Uniform return type for every server action so forms can render errors
 * without try/catch gymnastics on the client.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]>; status?: number };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string, extra?: { fieldErrors?: Record<string, string[]>; status?: number }): ActionResult<never> {
  return { ok: false, error, ...extra };
}

/** Converts Zod issues into { field: [messages] }. */
export function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/**
 * Wraps an action body: validates input, maps known errors to ActionResult and
 * never leaks stack traces or Postgres internals to the browser.
 */
export async function runAction<S extends z.ZodTypeAny, T>(
  schema: S,
  rawInput: unknown,
  body: (input: z.output<S>) => Promise<T>,
): Promise<ActionResult<T>> {
  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) {
    return fail("Please correct the highlighted fields.", { fieldErrors: zodFieldErrors(parsed.error), status: 400 });
  }
  try {
    return ok(await body(parsed.data));
  } catch (err) {
    return mapError(err);
  }
}

export function mapError(err: unknown): ActionResult<never> {
  if (err instanceof AuthError) return fail(err.message, { status: err.status });

  // PostgREST / Postgres errors
  const pg = err as { code?: string; message?: string; details?: string } | null;
  if (pg && typeof pg === "object" && typeof pg.code === "string") {
    switch (pg.code) {
      case "23505":
        return fail(friendlyUnique(pg.details ?? pg.message ?? ""), { status: 409 });
      case "23503":
        return fail("This record is referenced by other data and cannot be changed in that way.", { status: 409 });
      case "23514":
        return fail("The data violates a validation rule.", { status: 400 });
      case "42501":
        return fail("You do not have permission to perform this action.", { status: 403 });
      case "PGRST116":
        return fail("Record not found or you do not have access to it.", { status: 404 });
      default:
        break;
    }
  }

  if (err instanceof Error) {
    console.error("[action]", err);
    return fail(err.message || "Something went wrong.", { status: 500 });
  }
  console.error("[action] unknown error", err);
  return fail("Something went wrong.", { status: 500 });
}

function friendlyUnique(details: string): string {
  if (/email/i.test(details)) return "That email address is already in use.";
  if (/code/i.test(details)) return "That code is already in use.";
  if (/name/i.test(details)) return "That name is already in use.";
  if (/training_assignments_active_unique/i.test(details)) {
    return "This employee already has an active assignment for this training.";
  }
  return "A record with the same unique value already exists.";
}
