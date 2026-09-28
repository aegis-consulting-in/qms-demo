"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions/result";

type Options<T> = {
  successMessage?: string | ((data: T) => string);
  onSuccess?: (data: T) => void;
  onError?: (error: string, fieldErrors?: Record<string, string[]>) => void;
  silent?: boolean;
};

/**
 * Runs a server action inside a transition and shows toasts for the outcome.
 * Returns the raw result so callers can also set form errors.
 */
export function useAction<TInput, TData>(action: (input: TInput) => Promise<ActionResult<TData>>, options: Options<TData> = {}) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    (input: TInput) =>
      new Promise<ActionResult<TData>>((resolve) => {
        startTransition(async () => {
          setError(null);
          setFieldErrors({});
          const result = await action(input);
          if (result.ok) {
            if (!options.silent && options.successMessage) {
              toast.success(
                typeof options.successMessage === "function" ? options.successMessage(result.data) : options.successMessage,
              );
            }
            options.onSuccess?.(result.data);
          } else {
            setError(result.error);
            setFieldErrors(result.fieldErrors ?? {});
            if (!options.silent) toast.error(result.error);
            options.onError?.(result.error, result.fieldErrors);
          }
          resolve(result);
        });
      }),
    [action, options],
  );

  return { run, isPending, error, fieldErrors, reset: () => (setError(null), setFieldErrors({})) };
}
