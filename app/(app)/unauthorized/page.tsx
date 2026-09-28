import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Access denied" };

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <ShieldAlertIcon className="size-6" />
      </span>
      <h1 className="font-heading text-xl font-semibold">You don&apos;t have access to this page</h1>
      <p className="text-sm text-muted-foreground">
        Your account doesn&apos;t include the permission required here. If you believe this is a mistake, ask an
        administrator to review your roles.
      </p>
      <Button render={<Link href="/" />}>Back to home</Button>
    </div>
  );
}
