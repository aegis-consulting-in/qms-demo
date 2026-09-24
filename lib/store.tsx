"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createInitialState } from "./fixtures";
import type { CollectionItem, CollectionKey, QmsState, Session } from "./types";

const STORAGE_KEY = "qms.local.state";
const STORAGE_VERSION = 1;

interface Persisted {
  version: number;
  state: QmsState;
}

function readStorage(): QmsState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (parsed.version !== STORAGE_VERSION || !parsed.state) return null;
    return { ...createInitialState(), ...parsed.state };
  } catch {
    return null;
  }
}

function writeStorage(state: QmsState) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, state } satisfies Persisted),
    );
  } catch {
    // Quota or private-mode failures are non-fatal: the session simply stays in memory.
  }
}

interface QmsContextValue {
  state: QmsState;
  add: <K extends CollectionKey>(key: K, item: CollectionItem<K>) => void;
  update: <K extends CollectionKey>(
    key: K,
    id: string,
    patch: Partial<CollectionItem<K>> | ((current: CollectionItem<K>) => Partial<CollectionItem<K>>),
  ) => void;
  remove: <K extends CollectionKey>(key: K, id: string) => void;
  replace: <K extends CollectionKey>(key: K, items: Array<CollectionItem<K>>) => void;
  setSession: (patch: Partial<Session>) => void;
  resetData: () => void;
}

const QmsContext = createContext<QmsContextValue | null>(null);

const subscribeToNothing = () => () => {};

/** False during SSR and the hydration render, true from the first client commit onwards. */
function useIsHydrated() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

export function QmsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QmsState>(() =>
    typeof window === "undefined" ? createInitialState() : (readStorage() ?? createInitialState()),
  );
  const hydrated = useIsHydrated();

  useEffect(() => {
    if (hydrated) writeStorage(state);
  }, [state, hydrated]);

  const add = useCallback<QmsContextValue["add"]>((key, item) => {
    setState((current) => ({
      ...current,
      [key]: [item, ...(current[key] as unknown[])],
    }));
  }, []);

  const update = useCallback<QmsContextValue["update"]>((key, id, patch) => {
    setState((current) => {
      const list = current[key] as Array<{ id: string }>;
      return {
        ...current,
        [key]: list.map((item) => {
          if (item.id !== id) return item;
          const next = typeof patch === "function" ? patch(item as CollectionItem<typeof key>) : patch;
          return { ...item, ...next };
        }),
      };
    });
  }, []);

  const remove = useCallback<QmsContextValue["remove"]>((key, id) => {
    setState((current) => ({
      ...current,
      [key]: (current[key] as Array<{ id: string }>).filter((item) => item.id !== id),
    }));
  }, []);

  const replace = useCallback<QmsContextValue["replace"]>((key, items) => {
    setState((current) => ({ ...current, [key]: items }));
  }, []);

  const setSession = useCallback((patch: Partial<Session>) => {
    setState((current) => ({ ...current, session: { ...current.session, ...patch } }));
  }, []);

  const resetData = useCallback(() => {
    const fresh = createInitialState();
    setState(fresh);
    writeStorage(fresh);
  }, []);

  const value = useMemo<QmsContextValue>(
    () => ({ state, add, update, remove, replace, setSession, resetData }),
    [state, add, update, remove, replace, setSession, resetData],
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-500">Loading local QMS data…</p>
        </div>
      </div>
    );
  }

  return <QmsContext.Provider value={value}>{children}</QmsContext.Provider>;
}

export function useQms() {
  const context = useContext(QmsContext);
  if (!context) throw new Error("useQms must be used inside <QmsProvider>");
  return context;
}

export function useSession() {
  const { state, setSession } = useQms();
  const currentUser = state.employees.find((employee) => employee.id === state.session.employeeId);
  const { role } = state.session;
  return {
    role,
    currentUser,
    setSession,
    isManager: role === "Manager" || role === "System Admin",
    isAdmin: role === "System Admin",
    actorName: currentUser?.name ?? "Unknown user",
  };
}
