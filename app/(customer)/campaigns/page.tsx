import Link from "next/link";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import type { Campaign } from "@/lib/api";
import { makeApi } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, StatusBadge } from "@/components/PageChrome";
import { RagSearch } from "@/components/RagSearch";

export default async function CampaignsPage() {
  const api = makeApi(await requestCookie());
  let campaigns: Campaign[] = [];
  let error: unknown = null;
  try {
    campaigns = await api.campaigns.list();
  } catch (e) {
    error = e;
  }

  // Campaign list is a dense work surface → full available width
  // (`.surface-bleed` opts out of the `.app-work > *` 1280px cap, §7).
  return (
    <div className="surface-bleed">
      <PageHeader
        title="Kampagnes"
        meta="Stichproben deiner Organisation. Jede Kampagne bündelt eine Runde anonymer Interviews mit ausgewerteten Insights."
        actions={
          <Button asChild size="sm">
            <Link href="/campaigns/new">
              <Plus className="h-4 w-4" />
              Neue Kampagne
            </Link>
          </Button>
        }
      />

      <section className="mb-8">
        <RagSearch />
      </section>

      {!!error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      {!error && campaigns.length === 0 && (
        <div className="rounded-card border border-dashed border-line-strong bg-surface/40 p-10">
          <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-3 text-center">
            <div className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-fg">
                Noch keine Kampagnes.
              </p>
              <p className="text-sm leading-relaxed text-fg-muted">
                Lege deinen ersten an, lade Teilnehmer ein, sieh dir die
                Insights an.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/campaigns/new">
                <Plus className="h-4 w-4" />
                Erste Kampagne erstellen
              </Link>
            </Button>
          </div>
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({ c }: { c: Campaign }) {
  return (
    <Link
      href={`/campaigns/${c.id}`}
      className="group card card--compact flex flex-col justify-between gap-5 transition-[border-color,background-color] hover:border-line-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-base font-medium text-fg">
          {c.org_name}
        </p>
        <StatusBadge status={c.status} className="shrink-0" />
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-xs text-fg-muted">
          {c.language.toUpperCase()} · {c.interview_length_min} Min ·{" "}
          {new Date(c.created_at).toLocaleDateString("de-DE")}
        </p>
        <ArrowRight className="h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
      </div>
    </Link>
  );
}
