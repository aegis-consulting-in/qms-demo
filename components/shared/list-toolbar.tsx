"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const set = useCallback(
    (updates: Record<string, string | null | undefined>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === undefined || v === "") params.delete(k);
        else params.set(k, v);
      }
      if (resetPage) params.delete("page");
      const qs = params.toString();
      router.replace((qs ? `${pathname}?${qs}` : pathname) as never, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return { searchParams, set };
}

export function SearchInput({ placeholder = "Search…", param = "q", className }: { placeholder?: string; param?: string; className?: string }) {
  const { searchParams, set } = useUrlParams();
  const current = searchParams.get(param) ?? "";
  // Derived-state pattern: when the URL value changes from elsewhere (e.g. "Clear"),
  // resync the input during render instead of in an effect.
  const [state, setState] = useState({ value: current, synced: current });
  if (state.synced !== current) setState({ value: current, synced: current });
  const value = state.value;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = (next: string) => {
    setState((s) => ({ ...s, value: next }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => set({ [param]: next }), 300);
  };

  return (
    <div className={cn("relative", className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
        aria-label={placeholder}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <XIcon className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export function FilterSelect({
  param,
  options,
  placeholder = "All",
  className,
  ariaLabel,
}: {
  param: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const { searchParams, set } = useUrlParams();
  return (
    <NativeSelect
      value={searchParams.get(param) ?? ""}
      onChange={(e) => set({ [param]: e.target.value })}
      className={cn("w-auto min-w-36", className)}
      aria-label={ariaLabel ?? param}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}

export function SortSelect({ options, className }: { options: { value: string; label: string }[]; className?: string }) {
  const { searchParams, set } = useUrlParams();
  const sort = searchParams.get("sort") ?? options[0]?.value ?? "";
  const dir = searchParams.get("dir") ?? "asc";
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <NativeSelect value={sort} onChange={(e) => set({ sort: e.target.value }, false)} className="w-auto min-w-32" aria-label="Sort by">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => set({ dir: dir === "asc" ? "desc" : "asc" }, false)}
        aria-label={`Sort ${dir === "asc" ? "descending" : "ascending"}`}
      >
        {dir === "asc" ? "A→Z" : "Z→A"}
      </Button>
    </div>
  );
}

export function ClearFilters({ keys }: { keys: string[] }) {
  const { searchParams, set } = useUrlParams();
  const active = keys.some((k) => searchParams.get(k));
  if (!active) return null;
  return (
    <Button type="button" variant="ghost" size="sm" onClick={() => set(Object.fromEntries(keys.map((k) => [k, null])))}>
      <XIcon /> Clear
    </Button>
  );
}

export function ListToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}
