import { Lightbulb } from "lucide-react";
import { makeApi, type VseInsight } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Card } from "@/components/ui/card";
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
    <>
      <PageHeader
        title="Insights"
        meta="VSE-Triaden — Problem · Lösungsidee · Business-Chance — extrahiert aus den abgeschlossenen Interviews."
      />

      {error && (
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
        <Card className="rounded-card border-dashed bg-surface/40 p-10">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
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
        </Card>
      ) : (
        <div className="space-y-3">
          {insights.map((i) => (
            <TriadRow key={i.id} insight={i} />
          ))}
        </div>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-card border-line bg-surface p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
        {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-medium tabular-nums tracking-tight text-fg">
        {value}
      </p>
    </Card>
  );
}

function TriadRow({ insight }: { insight: VseInsight }) {
  return (
    <Card className="rounded-card border-line bg-surface p-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <TriadCell label="Problem" body={insight.problem_statement} />
        <TriadCell
          label={insight.origin_solution === "AI" ? "Idee (AI)" : "Idee"}
          body={insight.human_solution}
        />
        <TriadCell label="Chance" body={insight.business_opportunity} />
      </div>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-line-subtle pt-4 text-xs text-fg-muted">
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
          <span>
            <span className="text-fg-subtle">Konfidenz: </span>
            <span className="font-mono tabular-nums text-fg">
              {Math.round(insight.confidence * 100)}%
            </span>
          </span>
        )}
      </div>
    </Card>
  );
}

function TriadCell({
  label,
  body,
}: {
  label: string;
  body?: string | null;
}) {
  const empty = !body;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
        {label}
      </span>
      <p
        className={cn(
          "text-sm leading-relaxed",
          empty
            ? "rounded-sm border border-dashed border-line p-3 italic text-fg-subtle"
            : "text-fg",
        )}
      >
        {body ?? "—"}
      </p>
    </div>
  );
}
