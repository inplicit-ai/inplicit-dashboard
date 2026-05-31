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
import { CardGrid, EntityCard } from "@/components/ui/card-grid";
import { EmptyState } from "@/components/ui/empty-state";
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
      <PageHeader
        title="Kampagnes"
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
          title="Noch keine Kampagnes"
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
            <SectionHeading title="Kampagnes" count={campaigns.length} />
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
  return (
    <EntityCard
      href={`/campaigns/${c.id}`}
      title={c.org_name}
      status={<StatusDisc state={state} pulse={state === "live"} size="sm" />}
      meta={
        <>
          {c.language.toUpperCase()} · {c.interview_length_min} min ·{" "}
          {new Date(c.created_at).toLocaleDateString("de-DE")}
        </>
      }
      footer={<StatusBadge status={c.status} />}
    />
  );
}
