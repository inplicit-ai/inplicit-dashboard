import { makeApi, type VseInsight } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { SpecStrip } from "@/components/ui/spec-strip";
import { EvidenceTree, type EvidenceNode } from "@/components/ui/agent-list";

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

  const nodes: EvidenceNode[] = insights.map((i, idx) => buildNode(i, idx));

  return (
    <div className="surface-bleed">
      <header className="masthead mb-8">
        <div className="masthead__metric">
          <span className="flex items-baseline gap-3">
            <span className="masthead__num" aria-hidden>
              §
            </span>
            <h1 className="masthead__title">Insights</h1>
          </span>
          <span className="flex flex-col items-end">
            <span className="masthead__metric-value">{counts.total}</span>
            <span className="masthead__metric-label">VSE-Triaden</span>
          </span>
        </div>
        <p className="masthead__dek">
          VSE-Triaden — Problem · Lösungsidee · Business-Chance — extrahiert aus
          den abgeschlossenen Interviews. Aufklappen für die volle Triade.
        </p>
      </header>

      {!!error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      <SpecStrip
        cells={[
          { label: "Probleme", value: counts.total },
          { label: "Mit Lösungsidee", value: counts.withSolution },
          { label: "Mit Business-Chance", value: counts.withOpportunity },
        ]}
      />

      <div className="mt-8">
        {insights.length === 0 ? (
          <Plate caption="KEINE INSIGHTS AUF DER PLATTE — erscheinen nach dem ersten abgeschlossenen Interview." />
        ) : (
          <>
            <header className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2">
              <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
                § INSIGHTS
              </span>
              <span className="font-mono text-xs tabular-nums text-fg-muted">
                n={counts.total}
              </span>
            </header>
            <EvidenceTree nodes={nodes} defaultExpandedDepth={0} />
          </>
        )}
      </div>
    </div>
  );
}

function buildNode(insight: VseInsight, idx: number): EvidenceNode {
  const conf =
    typeof insight.confidence === "number"
      ? `${Math.round(insight.confidence * 100)}%`
      : null;

  const ideaLabel = insight.origin_solution === "AI" ? "Idee (AI)" : "Idee";

  // The full triad is revealed in the `body` slot (no clipping), set off only by
  // indent + the dashed connector — never re-wrapped in a nested card.
  const body = (
    <div className="grid grid-cols-1 gap-5 pr-4 md:grid-cols-3">
      <TriadCell tone="pain" label="Problem" body={insight.problem_statement} />
      <TriadCell tone="gap" label={ideaLabel} body={insight.human_solution} />
      <TriadCell
        tone="opportunity"
        label="Chance"
        body={insight.business_opportunity}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:col-span-3">
        {insight.phase && (
          <span className="font-mono text-[length:var(--text-caps)] uppercase tracking-[0.06em] text-fg-subtle">
            phase={insight.phase}
          </span>
        )}
      </div>
    </div>
  );

  return {
    id: insight.id,
    kind: "insight",
    status: "done",
    label: insight.problem_statement,
    meta: (
      <span className="inline-flex items-center gap-2">
        {insight.department && (
          <span className="badge badge--knowledge">{insight.department}</span>
        )}
        {conf && (
          <span className="font-mono tabular-nums text-fg-muted">{conf}</span>
        )}
        <span className="font-mono tabular-nums text-fg-subtle">
          #{idx + 1}
        </span>
      </span>
    ),
    body,
  };
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
            ? "text-sm leading-relaxed text-fg"
            : "rounded-ui border border-dashed border-line p-3 text-sm italic leading-relaxed text-fg-faint"
        }
      >
        {body ?? "—"}
      </p>
    </div>
  );
}

function Plate({ caption }: { caption: string }) {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-surface/40 px-6 py-14">
      <p className="text-center font-mono text-[length:var(--text-caps)] uppercase tracking-[0.06em] text-fg-subtle">
        {caption}
      </p>
    </div>
  );
}
