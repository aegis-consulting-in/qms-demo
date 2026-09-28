"use client";

import { useEffect } from "react";
import { AlertOctagonIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <AlertOctagonIcon className="size-6" />
      </span>
      <h1 className="font-heading text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        The page could not be loaded. {error.digest ? <span className="font-mono text-xs">Ref: {error.digest}</span> : null}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
