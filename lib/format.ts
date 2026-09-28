import { format, formatDistanceToNow, isPast, parseISO } from "date-fns";

export function formatDate(value: string | null | undefined, pattern = "dd MMM yyyy"): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), pattern);
  } catch {
    return value;
  }
}

export function formatDateTime(value: string | null | undefined): string {
  return formatDate(value, "dd MMM yyyy, HH:mm");
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return formatDistanceToNow(parseISO(value), { addSuffix: true });
  } catch {
    return value;
  }
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  try {
    return isPast(parseISO(`${dueDate}T23:59:59`));
  } catch {
    return false;
  }
}

export function fullName(p: { first_name?: string | null; last_name?: string | null } | null | undefined): string {
  if (!p) return "—";
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || "—";
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
}

/** "in_progress" → "In progress" */
export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  const s = value.replace(/[_-]+/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
