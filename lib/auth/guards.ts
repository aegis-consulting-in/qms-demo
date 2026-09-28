import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./session";
import type { PermissionKey } from "./permissions";

export class AuthError extends Error {
  constructor(
    message = "You must be signed in.",
    readonly status: 401 | 403 = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

// ---------------------------------------------------------------------------
// Page guards: redirect (used in Server Components)
// ---------------------------------------------------------------------------
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePagePermission(...keys: PermissionKey[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (keys.length && !user.canAny(keys)) redirect("/unauthorized");
  return user;
}

// ---------------------------------------------------------------------------
// Action guards: throw (used in Server Actions and Route Handlers)
// ---------------------------------------------------------------------------
export async function requireActionUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}

/** Requires ALL of the given permissions. */
export async function requirePermission(...keys: PermissionKey[]): Promise<CurrentUser> {
  const user = await requireActionUser();
  const missing = keys.filter((k) => !user.can(k));
  if (missing.length) throw new ForbiddenError(`Missing permission: ${missing.join(", ")}`);
  return user;
}

/** Requires ANY of the given permissions. */
export async function requireAnyPermission(...keys: PermissionKey[]): Promise<CurrentUser> {
  const user = await requireActionUser();
  if (keys.length && !user.canAny(keys)) throw new ForbiddenError();
  return user;
}
