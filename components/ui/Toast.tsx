"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createId } from "@/lib/utils";

type ToastTone = "success" | "info" | "warning" | "error";

interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<{ push: (message: string, tone?: ToastTone) => void } | null>(null);

const toneStyles: Record<ToastTone, { ring: string; icon: ReactNode }> = {
  success: { ring: "ring-emerald-200", icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" /> },
  info: { ring: "ring-sky-200", icon: <Info className="h-4 w-4 text-sky-600" /> },
  warning: { ring: "ring-amber-200", icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
  error: { ring: "ring-rose-200", icon: <AlertTriangle className="h-4 w-4 text-rose-600" /> },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const toast = { id: createId("toast"), message, tone };
      setToasts((current) => [...current, toast].slice(-4));
      window.setTimeout(() => dismiss(toast.id), 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-pop-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl bg-white px-3.5 py-3 shadow-lg ring-1 ${toneStyles[toast.tone].ring}`}
          >
            <span className="mt-0.5 shrink-0">{toneStyles[toast.tone].icon}</span>
            <p className="flex-1 text-sm text-slate-700">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
