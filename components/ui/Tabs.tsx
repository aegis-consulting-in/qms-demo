"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
  count?: number;
  badge?: ReactNode;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: Array<TabItem<T>>;
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div className={cx("-mx-1 overflow-x-auto px-1 pb-1", className)}>
      <div role="tablist" className="flex min-w-max items-center gap-1 rounded-xl bg-slate-100 p-1">
        {items.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onChange(item.id)}
              className={cx(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                active
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900",
              )}
            >
              {item.icon}
              {item.label}
              {typeof item.count === "number" ? (
                <span
                  className={cx(
                    "rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold",
                    active ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
              {item.badge}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type StatusFilterValue = "All" | "Active" | "Inactive";

export function StatusFilterTabs({
  value,
  onChange,
  counts,
}: {
  value: StatusFilterValue;
  onChange: (next: StatusFilterValue) => void;
  counts: Record<StatusFilterValue, number>;
}) {
  const options: StatusFilterValue[] = ["All", "Active", "Inactive"];
  return (
    <div className="inline-flex items-center rounded-lg ring-1 ring-inset ring-slate-300">
      {options.map((option, index) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cx(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors",
              index === 0 ? "rounded-l-lg" : undefined,
              index === options.length - 1 ? "rounded-r-lg" : "border-r border-slate-200",
              active ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {option}
            <span className={cx("text-[10px]", active ? "text-slate-300" : "text-slate-400")}>
              {counts[option]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search records…",
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cx("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border-0 bg-white py-2 pr-9 pl-9 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 transition placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
