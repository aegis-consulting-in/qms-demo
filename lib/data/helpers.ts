/**
 * PostgREST returns a single object for many-to-one embeds, but the TypeScript
 * inference for self-referential foreign keys (employees.manager_id → employees)
 * cannot tell the direction and types it as an array. This normalises either
 * shape to `T | null` so callers get a stable type.
 */
export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Opposite of `one`: nested one-to-many embeds must always be an array for callers. */
export function many<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
