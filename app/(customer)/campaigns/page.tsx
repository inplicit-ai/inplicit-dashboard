import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import type { Campaign } from "@/lib/api";
import { makeApi } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/PageChrome";
import { RagSearch } from "@/components/RagSearch";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { CardGrid } from "@/components/ui/card-grid";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusDisc, toStatusState } from "@/components/ui/status-disc";
import { CampaignActionsMenu } from "@/components/campaign/CampaignActionsMenu";

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
      <PageHeader
        title="Kampagnen"
        subtitle="Stichproben deiner Organisation. Jede Kampagne bündelt eine Runde anonymer Interviews mit ausgewerteten Insights."
        actions={
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus className="h-4 w-4" />
              Neue Kampagne
            </Link>
          </Button>
        }
      />

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
        <EmptyState
          icon={LayoutGrid}
          title="Noch keine Kampagnen"
          hint="Lege deine erste an, lade Teilnehmer ein, sieh dir die Insights an."
          action={
            <Button asChild>
              <Link href="/campaigns/new">
                <Plus className="h-4 w-4" />
                Erste Kampagne erstellen
              </Link>
            </Button>
          }
        />
      ) : (
        campaigns.length > 0 && (
          <>
            <SectionHeading title="Kampagnen" count={campaigns.length} />
            <CardGrid>
              {campaigns.map((c) => (
                <CampaignCard key={c.id} c={c} />
              ))}
            </CardGrid>
          </>
        )
      )}
    </div>
  );
}

function CampaignCard({ c }: { c: Campaign }) {
  const state = toStatusState(c.status);
  const displayName = c.name || "Kampagne";
  return (
    <Card interactive className="group relative p-5">
      {/* 3-dot menu — top-right, above the link layer */}
      <div className="absolute right-3 top-3 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <CampaignActionsMenu campaignId={c.id} currentName={displayName} />
      </div>

      <Link href={`/campaigns/${c.id}`} className="block">
        {/* Title row — no status disc here so it doesn't clash with the 3-dot menu */}
        <h3 className="line-clamp-2 pr-8 font-semibold tracking-[-0.01em] text-fg">
          {displayName}
        </h3>
        <div className="mt-2 text-[length:var(--text-meta)] tabular-nums text-fg-subtle">
          {c.language.toUpperCase()} · {c.interview_length_min} min ·{" "}
          {new Date(c.created_at).toLocaleDateString("de-DE")}
        </div>
        {/* Footer: status badge left, status disc right */}
        <div className="mt-4 flex items-center justify-between border-t border-line-subtle pt-3 text-[length:var(--text-meta)] text-fg-muted">
          <StatusBadge status={c.status} />
          <StatusDisc state={state} pulse={state === "live"} size="sm" className="shrink-0" />
        </div>
      </Link>
    </Card>
  );
}
