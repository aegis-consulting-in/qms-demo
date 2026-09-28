import Link from "next/link";
import { cn } from "cn";

export const SLICE_COLORS = [
  "var(--brand)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
  "oklch(0.55 0.1 300)",
  "oklch(0.48 0.02 255)",
];

export const STATUS_COLOR: Record<string, string> = {
  assigned: "var(--brand)",
  planned: "var(--brand)",
  scheduled: "var(--brand)",
  in_progress: "var(--warning)",
  due: "var(--warning)",
  active: "var(--success)",
  completed: "var(--success)",
  closed: "var(--success)",
  verified: "var(--success)",
  overdue: "var(--destructive)",
  cancelled: "oklch(0.55 0.02 255)",
  inactive: "oklch(0.55 0.02 255)",
  on_hold: "var(--warning)",
  probationary: "var(--warning)",
  blacklisted: "var(--destructive)",
  draft: "oklch(0.55 0.02 255)",
};

export function colorFor(key: string, index: number) {
  return STATUS_COLOR[key] ?? SLICE_COLORS[index % SLICE_COLORS.length];
}

export type Slice = { key: string; label: string; value: number };

export function DonutChart({ items, size = 148 }: { items: Slice[]; size?: number }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const r = 15.9155;
  let offset = 25; // start at top
  return (
    <svg viewBox="0 0 42 42" width={size} height={size} className="shrink-0" role="img" aria-label="Distribution chart">
      <circle cx="21" cy="21" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
      {total === 0 ? null : (
        items.map((item, i) => {
          if (!item.value) return null;
          const pct = (item.value / total) * 100;
          const el = (
            <circle
              key={item.key}
              cx="21"
              cy="21"
              r={r}
              fill="none"
              stroke={colorFor(item.key, i)}
              strokeWidth="4"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeDashoffset={offset}
            />
          );
          offset -= pct;
          return el;
        })
      )}
      <text x="21" y="21.8" textAnchor="middle" className="fill-foreground" style={{ fontSize: "7px", fontWeight: 650 }}>
        {total}
      </text>
    </svg>
  );
}

export function BarChart({ items }: { items: Slice[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex h-44 items-end gap-2" role="img" aria-label="Bar chart">
      {items.map((item, i) => (
        <div key={item.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="text-[11px] font-medium tabular-nums">{item.value}</span>
          <div className="flex h-32 w-full items-end justify-center">
            <div
              className="w-full max-w-10 rounded-t-md"
              style={{
                height: `${Math.max((item.value / max) * 100, item.value ? 6 : 0)}%`,
                background: colorFor(item.key, i),
              }}
              title={`${item.label}: ${item.value}`}
            />
          </div>
          <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function HBarList({ items }: { items: Slice[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li key={item.key} className="min-w-0">
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-muted-foreground">{item.label}</span>
            <span className="tabular-nums font-medium">{item.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.value / max) * 100}%`, background: colorFor(item.key, i) }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Legend({ items }: { items: Slice[] }) {
  return (
    <ul className="flex flex-col gap-1.5 text-xs">
      {items.map((item, i) => (
        <li key={item.key} className="flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-sm" style={{ background: colorFor(item.key, i) }} />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.label}</span>
          <span className="tabular-nums font-medium">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function ChartCard({
  title,
  href,
  children,
  className,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {href ? (
          <Link href={href as never} className="text-xs font-medium text-brand hover:underline">
            Open
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
