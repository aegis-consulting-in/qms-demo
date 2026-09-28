/** Hide children when the caller is not allowed to see them. Server-side
 *  authorization still applies — this is only for UI. */
export function PermissionGate({ allowed, children }: { allowed: boolean; children: React.ReactNode }) {
  if (!allowed) return null;
  return children;
}
