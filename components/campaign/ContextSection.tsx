"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";

const COLLAPSE_THRESHOLD = 300; // chars before showing "Mehr lesen"

/**
 * Unternehmenskontext section on the campaign overview.
 *
 * Renders a full-width card grid. Each piece of context (e.g. free-text,
 * future: linked Kontext-Tresor entries) gets its own card. Long text is
 * collapsed with a "Mehr lesen" toggle so the overview stays scannable.
 */
export function ContextSection({
  companyContext,
}: {
  companyContext: string;
}) {
  if (!companyContext?.trim()) return null;

  return (
    <section>
      <SectionHeading title="Unternehmenskontext" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ContextCard
          title="Freitext-Kontext"
          text={companyContext}
          icon={<FileText size={16} className="text-fg-muted" aria-hidden />}
        />
      </div>
    </section>
  );
}

function ContextCard({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: React.ReactNode;
}) {
  const isLong = text.length > COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(false);
  const visible = isLong && !expanded ? text.slice(0, COLLAPSE_THRESHOLD) + "…" : text;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-ui border border-line bg-surface-2">
          {icon}
        </span>
        <p className="text-[length:var(--text-body-sm)] font-semibold text-fg">
          {title}
        </p>
      </div>
      <p className="whitespace-pre-wrap text-[length:var(--text-body)] leading-relaxed text-fg-muted">
        {visible}
      </p>
      {isLong && (
        <Button
          variant="link"
          size="sm"
          className="self-start px-0 text-fg-muted"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Weniger anzeigen" : "Mehr lesen"}
        </Button>
      )}
    </Card>
  );
}
