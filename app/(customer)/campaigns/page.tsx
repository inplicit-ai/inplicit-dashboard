import Link from "next/link";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import type { Campaign } from "@/lib/api";
import { makeApi } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <>
      <PageHeader
        title="Audits"
        meta="Stichproben deiner Organisation. Jeder Audit bündelt eine Runde anonymer Interviews mit ausgewerteten Insights."
        actions={
          <Button asChild size="sm">
            <Link href="/campaigns/new">
              <Plus className="h-4 w-4" />
              Neuer Audit
            </Link>
          </Button>
        }
      />

      <section className="mb-8">
        <RagSearch />
      </section>

      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      {!error && campaigns.length === 0 && (
        <Card className="rounded-card border-dashed bg-surface/40 p-10">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-fg">
                Noch keine Audits.
              </p>
              <p className="text-sm text-fg-muted">
                Lege deinen ersten an, lade Teilnehmer ein, sieh dir die
                Insights an.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/campaigns/new">
                <Plus className="h-4 w-4" />
                Ersten Audit erstellen
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {campaigns.length > 0 && (
        <div className="space-y-2.5">
          {campaigns.map((c) => (
            <CampaignRow key={c.id} c={c} />
          ))}
        </div>
      )}
    </>
  );
}

function CampaignRow({ c }: { c: Campaign }) {
  return (
    <Link
      href={`/campaigns/${c.id}`}
      className="group flex items-center justify-between gap-4 rounded-card border border-line bg-surface p-5 shadow-sm transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="min-w-0 space-y-1.5">
        <p className="truncate text-base font-medium text-fg">{c.org_name}</p>
        <p className="text-xs text-fg-muted">
          {c.language.toUpperCase()} · {c.interview_length_min} Min ·{" "}
          {new Date(c.created_at).toLocaleDateString("de-DE")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge status={c.status} />
        <ArrowRight className="h-4 w-4 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
      </div>
    </Link>
  );
}
