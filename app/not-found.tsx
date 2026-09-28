import Link from "next/link";
import { FileQuestionIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-full items-center justify-center bg-background p-4">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <FileQuestionIcon className="size-7" />
        </span>
        <h1 className="font-heading text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
        <Button render={<Link href="/" />}>Back to home</Button>
      </div>
    </div>
  );
}
