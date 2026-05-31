import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { makeApi, type InterviewDetail } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/PageChrome";
import { StatusDisc, toStatusState } from "@/components/ui/status-disc";
import { SpecBlock, type SpecRow } from "@/components/ui/spec-block";
import { InstrumentBand, type InstrumentCell } from "@/components/ui/instrument-band";
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

          {/* ─── Ledger masthead: two tracks ──────────────────────────────── */}
          <header className="mb-8 grid gap-8 lg:grid-cols-[minmax(220px,260px)_1fr]">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <span className="flex w-7 shrink-0 items-center justify-center pt-1.5">
                  <StatusDisc state={toStatusState(detail.interview.status)} size="lg" />
                </span>
                <div className="flex flex-col gap-1">
                  <span className="eyebrow">Interview</span>
                  <h1 className="title font-mono tabular-nums tracking-[-0.01em]">
                    {detail.interview.anon_id}
                  </h1>
                </div>
              </div>
              <SpecBlock rows={mastheadRows(detail.interview)} />
              <div className="inline-flex flex-wrap gap-2">
                <StatusBadge status={detail.interview.status} />
                {detail.interview.processing_status &&
                  detail.interview.status === "COMPLETED" && (
                    <StatusBadge status={detail.interview.processing_status} />
                  )}
              </div>
            </div>

            <div className="min-w-0">
              <InstrumentBand cells={instrumentCells(detail)} />
            </div>
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

function mastheadRows(iv: InterviewDetail["interview"]): SpecRow[] {
  const rows: SpecRow[] = [];
  if (iv.department) rows.push({ label: "Abteilung", value: iv.department });
  rows.push({ label: "Modus", value: iv.mode === "voice" ? "Voice" : "Chat" });
  if (iv.started_at) rows.push({ label: "Start", value: formatDate(iv.started_at) });
  if (iv.ended_at) rows.push({ label: "Ende", value: formatDate(iv.ended_at) });
  return rows;
}

function instrumentCells(detail: InterviewDetail): InstrumentCell[] {
  const iv = detail.interview;
  return [
    {
      label: "Dauer",
      value: iv.duration_seconds != null ? formatDuration(iv.duration_seconds) : "—",
    },
    { label: "Wortbeiträge", value: detail.utterances.length },
    { label: "Insights", value: detail.insights.length },
    { label: "Modus", value: iv.mode === "voice" ? "VOICE" : "CHAT" },
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
