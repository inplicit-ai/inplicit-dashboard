import { defineRoute } from "$fresh/server.ts";
import { makeApi, VseInsight } from "../../../../lib/api.ts";
import { Layout, PageHeader } from "../../../../components/Layout.tsx";
import { ErrorState } from "../../../../components/ErrorState.tsx";

// Phase-1 transitional view of the Triad model. Phase-5 replaces this with
// the Vertical Flow List + Evolution Tree detail panel described in the
// master plan §5.

export default defineRoute(async (req, ctx) => {
  const id = ctx.params.id;
  const api = makeApi(req.headers.get("cookie") ?? undefined);

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
    <Layout title="Insights" campaignId={id} activeTab="insights">
      <PageHeader title="Insights" />

      {error && (
        <div class="section">
          <ErrorState error={error} />
        </div>
      )}

      <div class="metrics-row section">
        <Metric label="Probleme" value={counts.total} />
        <Metric label="Mit Lösungsidee" value={counts.withSolution} />
        <Metric label="Mit Business-Chance" value={counts.withOpportunity} />
      </div>

      {insights.length === 0
        ? (
          <div class="card">
            <div class="empty-state">
              <p class="empty-state__title">Noch keine Insights extrahiert.</p>
              <p>Sie erscheinen hier nach abgeschlossenen Interviews.</p>
            </div>
          </div>
        )
        : (
          <div class="list-stack">
            {insights.map((i) => <TriadRow key={i.id} insight={i} />)}
          </div>
        )}

      <style>{`
        .metrics-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
        }
        @media (max-width: 640px) {
          .metrics-row { grid-template-columns: 1fr; }
        }
        .metric {
          padding: var(--space-5) var(--space-6);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .metric__value {
          font-size: 2rem;
          font-weight: 400;
          letter-spacing: -0.025em;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .metric__label {
          font-size: var(--text-body-sm);
          color: var(--color-text-secondary);
        }
        .triad-row {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          padding: var(--space-6);
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: var(--space-5);
          align-items: stretch;
        }
        @media (max-width: 900px) {
          .triad-row { grid-template-columns: 1fr; }
        }
        .triad-cell {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .triad-cell__label {
          font-size: var(--text-eyebrow);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-text-tertiary);
        }
        .triad-cell__body {
          font-size: var(--text-body);
          line-height: 1.5;
          color: var(--color-text-primary);
        }
        .triad-cell--empty .triad-cell__body {
          color: var(--color-text-tertiary);
          font-style: italic;
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-3);
        }
        .triad-meta {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
          margin-top: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--color-border);
          font-size: var(--text-body-sm);
          color: var(--color-text-secondary);
        }
        .triad-meta > span {
          display: inline-flex;
          gap: var(--space-1);
        }
      `}</style>
    </Layout>
  );
});

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div class="metric">
      <span class="metric__value">{value}</span>
      <span class="metric__label">{label}</span>
    </div>
  );
}

function TriadRow({ insight }: { insight: VseInsight }) {
  return (
    <div class="triad-row">
      <TriadCell label="Problem" body={insight.problem_statement} />
      <TriadCell
        label={insight.origin_solution === "AI" ? "Idee (AI)" : "Idee"}
        body={insight.human_solution}
      />
      <TriadCell label="Chance" body={insight.business_opportunity} />
      <div
        class="triad-meta"
        style="grid-column: 1 / -1"
      >
        {insight.department && <span>Department: {insight.department}</span>}
        {insight.phase && <span>Phase: {insight.phase}</span>}
        {typeof insight.confidence === "number" && (
          <span>Konfidenz: {Math.round(insight.confidence * 100)}%</span>
        )}
      </div>
    </div>
  );
}

function TriadCell(
  { label, body }: { label: string; body?: string | null },
) {
  const empty = !body;
  return (
    <div class={`triad-cell${empty ? " triad-cell--empty" : ""}`}>
      <span class="triad-cell__label">{label}</span>
      <p class="triad-cell__body">{body ?? "—"}</p>
    </div>
  );
}
