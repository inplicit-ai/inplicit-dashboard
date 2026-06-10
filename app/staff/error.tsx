"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StaffError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[staff] page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
        <TriangleAlert className="h-6 w-6 text-danger" />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-[length:var(--text-title)] font-semibold text-fg">
          Seite konnte nicht geladen werden
        </h2>
        <p className="text-[length:var(--text-body)] text-fg-muted">
          {error.message || "Ein unerwarteter Fehler ist aufgetreten."}
        </p>
        {error.digest && (
          <p className="font-mono text-[length:var(--text-mono)] text-fg-subtle">
            Fehler-ID: {error.digest}
          </p>
        )}
      </div>
      <Button variant="outline" onClick={reset}>
        Erneut versuchen
      </Button>
    </div>
  );
}
