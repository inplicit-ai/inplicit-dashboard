import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import type { Campaign } from "@/lib/api";
import { makeApi } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/PageChrome";
import { RagSearch } from "@/components/RagSearch";
import { StatusDisc, toStatusState } from "@/components/ui/status-disc";

export default async function CampaignsPage() {
  const api = makeApi(await requestCookie());
  let campaigns: Campaign[] = [];
  let error: unknown = null;
  try {
    campaigns = await api.campaigns.list();
  } catch (e) {
    error = e;
  }

  return (
    <div className="surface-bleed">
      <header className="masthead mb-8">
        <div className="masthead__metric">
          <span className="flex items-baseline gap-3">
            <span className="masthead__num" aria-hidden>
              §
            </span>
            <h1 className="masthead__title">Kampagnes</h1>
          </span>
          <span className="flex flex-col items-end">
            <span className="masthead__metric-value">{campaigns.length}</span>
            <span className="masthead__metric-label">Aktiv</span>
          </span>
        </div>
        <p className="masthead__dek">
          Stichproben deiner Organisation. Jede Kampagne bündelt eine Runde
          anonymer Interviews mit ausgewerteten Insights.
        </p>
      </header>

      {/* RAG ask — the org-wide evidence search. */}
      <section className="mb-10 measure-column">
        <RagSearch />
      </section>

      {!!error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      {!error && campaigns.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong bg-surface/40 px-6 py-14">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-4 text-center">
            <p className="font-mono text-[length:var(--text-caps)] uppercase tracking-[0.06em] text-fg-subtle">
              KEINE KAMPAGNES AUF DER PLATTE
            </p>
            <p className="text-sm leading-relaxed text-fg-muted">
              Lege deine erste an, lade Teilnehmer ein, sieh dir die Insights an.
            </p>
            <Button asChild>
              <Link href="/campaigns/new">
                <Plus className="h-4 w-4" />
                Erste Kampagne erstellen
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        campaigns.length > 0 && (
          <>
            <header className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2">
              <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
                § KAMPAGNES
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs tabular-nums text-fg-muted">
                  n={campaigns.length}
                </span>
                <Button asChild size="sm">
                  <Link href="/campaigns/new">
                    <Plus className="h-4 w-4" />
                    Neue Kampagne
                  </Link>
                </Button>
              </div>
            </header>

            <div className="evidence-tree">
              {campaigns.map((c) => (
                <CampaignRow key={c.id} c={c} />
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}

function CampaignRow({ c }: { c: Campaign }) {
  const state = toStatusState(c.status);
  return (
    <div className="tree-node">
      <Link
        href={`/campaigns/${c.id}`}
        className="tree-row tree-row--button tree-row--parent group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="tree-row__lead">
          <StatusDisc state={state} pulse={state === "live"} />
          <span className="tree-row__label">{c.org_name}</span>
        </div>
        <div className="tree-row__meta">
          <span className="register__id text-xs text-fg-muted">
            {c.language.toUpperCase()} · {c.interview_length_min}min ·{" "}
            {new Date(c.created_at).toLocaleDateString("de-DE")}
          </span>
          <StatusBadge status={c.status} />
          <ArrowRight className="h-4 w-4 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
        </div>
      </Link>
    </div>
  );
}
