import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { makeApi, type InterviewDetail } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/PageChrome";
import { StatusDisc, toStatusState } from "@/components/ui/status-disc";
import { StatBand, type StatBandCell } from "@/components/ui/stat-band";
import { InterviewDetailView } from "@/components/InterviewDetailView";

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ id: string; interviewId: string }>;
}) {
  const { id: campaignId, interviewId } = await params;
  const api = makeApi(await requestCookie());

  let detail: InterviewDetail | null = null;
  let error: unknown = null;
  try {
    detail = await api.interviews.detail(interviewId);
  } catch (e) {
    error = e;
  }

  return (
    <>
      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      {detail && (
        <>
          <Button
            asChild
            variant="link"
            size="sm"
            className="mb-4 px-0 text-fg-muted"
          >
            <Link href={`/campaigns/${campaignId}/interviews`}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Zurück zur Liste
            </Link>
          </Button>

          {/* ─── Clean page header: ID + status + meta ─────────────────────── */}
          <header className="mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <StatusDisc
                    state={toStatusState(detail.interview.status)}
                    size="md"
                  />
                  <span className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
                    Interview
                  </span>
                </div>
                <h1 className="mt-2 font-mono text-[length:var(--text-display)] font-semibold tracking-[-0.01em] tabular-nums text-fg">
                  {detail.interview.anon_id}
                </h1>
                <p className="mt-2 text-[length:var(--text-meta)] text-fg-muted">
                  {metaLine(detail.interview)}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <StatusBadge status={detail.interview.status} />
                {detail.interview.processing_status &&
                  detail.interview.status === "COMPLETED" && (
                    <StatusBadge status={detail.interview.processing_status} />
                  )}
              </div>
            </div>

            <StatBand cells={statCells(detail)} className="mt-6" />
          </header>

          <InterviewDetailView
            utterances={detail.utterances}
            insights={detail.insights}
            processingStatus={detail.interview.processing_status ?? undefined}
          />
        </>
      )}
    </>
  );
}

function metaLine(iv: InterviewDetail["interview"]): string {
  const parts: string[] = [];
  if (iv.department) parts.push(iv.department);
  parts.push(iv.mode === "voice" ? "Voice" : "Chat");
  if (iv.started_at) parts.push(`Start ${formatDate(iv.started_at)}`);
  if (iv.ended_at) parts.push(`Ende ${formatDate(iv.ended_at)}`);
  return parts.join(" · ");
}

function statCells(detail: InterviewDetail): StatBandCell[] {
  const iv = detail.interview;
  return [
    {
      label: "Dauer",
      value: iv.duration_seconds != null ? formatDuration(iv.duration_seconds) : "—",
    },
    { label: "Wortbeiträge", value: detail.utterances.length },
    { label: "Insights", value: detail.insights.length },
    { label: "Modus", value: iv.mode === "voice" ? "Voice" : "Chat" },
  ];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
