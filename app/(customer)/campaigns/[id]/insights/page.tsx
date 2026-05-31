import { Lightbulb } from "lucide-react";
import { makeApi, type VseInsight } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatBand } from "@/components/ui/stat-band";
import { CardGrid } from "@/components/ui/card-grid";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

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
    <div className="surface-bleed">
      <PageHeader
        title="Insights"
        subtitle="VSE-Triaden — Problem · Lösungsidee · Business-Chance — extrahiert aus den abgeschlossenen Interviews."
      />

      {!!error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      <StatBand
        className="mb-8"
        cells={[
          { label: "Probleme", value: counts.total },
          { label: "Mit Lösungsidee", value: counts.withSolution },
          { label: "Mit Business-Chance", value: counts.withOpportunity },
        ]}
      />

      {insights.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Noch keine Insights"
          hint="Insights erscheinen nach dem ersten abgeschlossenen Interview."
        />
      ) : (
        <>
          <SectionHeading title="Insights" count={counts.total} />
          <CardGrid>
            {insights.map((i, idx) => (
              <InsightCard key={i.id} insight={i} index={idx} />
            ))}
          </CardGrid>
        </>
      )}
    </div>
  );
}

function InsightCard({
  insight,
  index,
}: {
  insight: VseInsight;
  index: number;
}) {
  const conf =
    typeof insight.confidence === "number"
      ? `${Math.round(insight.confidence * 100)}%`
      : null;
  const ideaLabel = insight.origin_solution === "AI" ? "Idee (AI)" : "Idee";

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {insight.department && (
            <span className="badge badge--knowledge">{insight.department}</span>
          )}
          {insight.phase && (
            <span className="badge">{insight.phase}</span>
          )}
        </div>
        <span className="text-[length:var(--text-meta)] tabular-nums text-fg-subtle">
          {conf ? `${conf} · ` : ""}#{index + 1}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <TriadCell tone="pain" label="Problem" body={insight.problem_statement} />
        <TriadCell tone="gap" label={ideaLabel} body={insight.human_solution} />
        <TriadCell
          tone="opportunity"
          label="Chance"
          body={insight.business_opportunity}
        />
      </div>
    </Card>
  );
}

const CELL_TONE: Record<"pain" | "gap" | "opportunity", string> = {
  pain: "badge--pain",
  gap: "badge--gap",
  opportunity: "badge--opportunity",
};

function TriadCell({
  label,
  body,
  tone,
}: {
  label: string;
  body?: string | null;
  tone: "pain" | "gap" | "opportunity";
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className={`badge ${CELL_TONE[tone]} w-fit`}>{label}</span>
      <p
        className={
          body
            ? "text-[length:var(--text-body)] leading-relaxed text-fg"
            : "rounded-ui border border-dashed border-line p-3 text-[length:var(--text-body)] italic leading-relaxed text-fg-faint"
        }
      >
        {body ?? "—"}
      </p>
    </div>
  );
}
