import { Lightbulb } from "lucide-react";
import { makeApi, type VseInsight } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageChrome";
import { cn } from "@/lib/utils";

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = makeApi(await requestCookie());
  let insights: VseInsight[] = [];
  let error: unknown = null;
  try {
    insights = await api.insights.list(id, { limit: 200 });
  } catch (e) {
    error = e;
  }

  const counts = {
    total: insights.length,
    withSolution: insights.filter((i) => i.human_solution).length,
    withOpportunity: insights.filter((i) => i.business_opportunity).length,
  };

  return (
    // surface-bleed opts this work surface into the full gutter width (contract §7).
    <div className="surface-bleed">
      <PageHeader
        title="Insights"
        meta="VSE-Triaden — Problem · Lösungsidee · Business-Chance — extrahiert aus den abgeschlossenen Interviews."
      />

      {!!error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label="Probleme" value={counts.total} />
        <Metric label="Mit Lösungsidee" value={counts.withSolution} />
        <Metric label="Mit Business-Chance" value={counts.withOpportunity} />
      </div>

      {insights.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 border-dashed py-16 text-center">
          <div className="grid size-11 place-items-center rounded-full bg-surface-2 text-fg-muted">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-fg">
              Noch keine Insights extrahiert.
            </p>
            <p className="text-sm text-fg-muted">
              Sie erscheinen hier nach abgeschlossenen Interviews.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((i) => (
            <TriadRow key={i.id} insight={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="card card--compact">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
        {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-medium tabular-nums tracking-tight text-fg">
        {value}
      </p>
    </div>
  );
}

function TriadRow({ insight }: { insight: VseInsight }) {
  return (
    <div className="card card--compact transition-colors hover:border-line-strong">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <TriadCell tone="pain" label="Problem" body={insight.problem_statement} />
        <TriadCell
          tone="accent"
          label={insight.origin_solution === "AI" ? "Idee (AI)" : "Idee"}
          body={insight.human_solution}
        />
        <TriadCell tone="gap" label="Chance" body={insight.business_opportunity} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-subtle pt-4 text-xs text-fg-muted">
        {insight.department && (
          <span>
            <span className="text-fg-subtle">Department: </span>
            <span className="text-fg">{insight.department}</span>
          </span>
        )}
        {insight.phase && (
          <span>
            <span className="text-fg-subtle">Phase: </span>
            <span className="text-fg">{insight.phase}</span>
          </span>
        )}
        {typeof insight.confidence === "number" && (
          <span className="badge badge--knowledge ml-auto font-medium">
            {Math.round(insight.confidence * 100)}% Konfidenz
          </span>
        )}
      </div>
    </div>
  );
}

const CELL_LABEL_TONE: Record<"pain" | "accent" | "gap", string> = {
  pain: "text-pain",
  accent: "text-accent",
  gap: "text-gap",
};

function TriadCell({
  label,
  body,
  tone,
}: {
  label: string;
  body?: string | null;
  tone: "pain" | "accent" | "gap";
}) {
  const empty = !body;
  return (
    <div className="flex flex-col gap-2">
      <span
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.12em]",
          CELL_LABEL_TONE[tone],
        )}
      >
        {label}
      </span>
      <p
        className={cn(
          "text-sm leading-relaxed",
          empty
            ? "rounded-ui border border-dashed border-line p-3 italic text-fg-faint"
            : "text-fg",
        )}
      >
        {body ?? "—"}
      </p>
    </div>
  );
}
