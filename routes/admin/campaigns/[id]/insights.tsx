import { defineRoute } from "$fresh/server.ts";
import { makeApi, VseInsight } from "../../../../lib/api.ts";
import {
  Eyebrow,
  Layout,
  PageHeader,
  SemanticBadge,
} from "../../../../components/Layout.tsx";
import { ErrorState } from "../../../../components/ErrorState.tsx";

export default defineRoute(async (req, ctx) => {
  const id = ctx.params.id;
  const url = new URL(req.url);
  const filter = url.searchParams.get("type") ?? undefined;
  const api = makeApi(req.headers.get("cookie") ?? undefined);

  let insights: VseInsight[] = [];
  let error: unknown = null;

  try {
    insights = await api.insights.list(id, { semantic_type: filter, limit: 200 });
    console.log(
      `[insights:${id.slice(0, 8)}] loaded ${insights.length} (filter: ${filter ?? "none"})`,
    );
  } catch (e) {
    error = e;
  }

  const counts = countByType(insights);

  const filters: Array<{ key?: string; label: string; count?: number; emphasis?: boolean }> = [
    { key: undefined, label: "Alle", count: insights.length },
    { key: "pain_point", label: "Schmerzpunkte", count: counts.pain_point, emphasis: true },
    { key: "opportunity", label: "Chancen", count: counts.opportunity, emphasis: true },
    { key: "process_gap", label: "Prozesslücken", count: counts.process_gap },
    { key: "knowledge", label: "Wissen", count: counts.knowledge },
  ];

  return (
    <Layout title="Insights" campaignId={id} activeTab="insights">
      <PageHeader title="Insights" />

      {error && <div class="section"><ErrorState error={error} /></div>}

      {/* Innovation focus strip */}
      <div class="focus-grid section">
        <FocusCard
          tone="pain"
          eyebrow="Schmerzpunkte"
          count={counts.pain_point ?? 0}
          caption="Reibung, Brüche, was Mitarbeitende kostet"
          href={`/admin/campaigns/${id}/insights?type=pain_point`}
        />
        <FocusCard
          tone="opportunity"
          eyebrow="Chancen"
          count={counts.opportunity ?? 0}
          caption="Ideen und ungehobene Potenziale"
          href={`/admin/campaigns/${id}/insights?type=opportunity`}
        />
      </div>

      {/* Filter pills */}
      <div class="cluster section">
        {filters.map((f) => {
          const active = (filter ?? undefined) === f.key;
          const href = f.key
            ? `/admin/campaigns/${id}/insights?type=${f.key}`
            : `/admin/campaigns/${id}/insights`;
          return (
            <a
              key={f.label}
              href={href}
              class={`pill ${active ? "pill--active" : ""} ${f.emphasis ? "pill--emphasis" : ""}`}
            >
              {f.label}
              {typeof f.count === "number" && (
                <span class="pill__count">{f.count}</span>
              )}
            </a>
          );
        })}
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
            {insights.map((i) => <InsightCard key={i.id} insight={i} />)}
          </div>
        )}

      <style>{`
        .focus-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-4);
        }
        @media (max-width: 640px) {
          .focus-grid { grid-template-columns: 1fr; }
        }
        .focus-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding: var(--space-7);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          transition: border-color 0.15s var(--ease-smooth);
        }
        .focus-card:hover {
          border-color: var(--color-text-tertiary);
        }
        .focus-card--pain {
          background: var(--color-pain-soft);
          border-color: var(--color-pain-muted);
        }
        .focus-card--opportunity {
          background: var(--color-accent-soft);
          border-color: var(--color-accent-muted);
        }
        .focus-card__count {
          font-size: 2.25rem;
          font-weight: 400;
          letter-spacing: -0.025em;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .focus-card__caption {
          font-size: var(--text-body-sm);
          color: var(--color-text-secondary);
        }
        .insight-card {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          padding: var(--space-6);
          transition: border-color 0.15s var(--ease-smooth);
        }
        .insight-card:hover {
          border-color: var(--color-text-tertiary);
        }
        .insight-card__head {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-3);
        }
        .insight-card__body {
          font-size: var(--text-body-lg);
          font-weight: 500;
          line-height: 1.5;
          color: var(--color-text-primary);
        }
      `}</style>
    </Layout>
  );
});

function countByType(insights: VseInsight[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of insights) {
    const t = normalize(i.semantic_type);
    out[t] = (out[t] ?? 0) + 1;
  }
  return out;
}

function normalize(t: string): string {
  switch (t) {
    case "pain": return "pain_point";
    case "behavior": return "process_gap";
    case "fact": return "knowledge";
    default: return t;
  }
}

function FocusCard({
  tone, eyebrow, count, caption, href,
}: {
  tone: "pain" | "opportunity";
  eyebrow: string;
  count: number;
  caption: string;
  href: string;
}) {
  return (
    <a class={`focus-card focus-card--${tone}`} href={href}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <span class="focus-card__count">{count}</span>
      <span class="focus-card__caption">{caption}</span>
    </a>
  );
}

function InsightCard({ insight }: { insight: VseInsight }) {
  return (
    <div class="insight-card">
      <div class="insight-card__head">
        <SemanticBadge type={insight.semantic_type} />
        {insight.department && <span class="caption">{insight.department}</span>}
        {insight.phase === "validation" && (
          <span class="badge badge--gap">Validierungsphase</span>
        )}
      </div>
      <p class="insight-card__body">{insight.content}</p>
      {insight.verbatim_quote && (
        <blockquote class="quote">"{insight.verbatim_quote}"</blockquote>
      )}
    </div>
  );
}
