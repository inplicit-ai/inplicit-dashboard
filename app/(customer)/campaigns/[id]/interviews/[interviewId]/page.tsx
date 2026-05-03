import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { makeApi, type InterviewDetail } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, StatusBadge } from "@/components/PageChrome";
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
            className="mb-2 px-0 text-fg-muted"
          >
            <Link href={`/campaigns/${campaignId}/interviews`}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Zurück zur Liste
            </Link>
          </Button>

          <PageHeader
            eyebrow={`Interview · ${detail.interview.anon_id}`}
            title="Detailansicht"
            meta={
              <MetaLine
                department={detail.interview.department}
                mode={detail.interview.mode}
                started={detail.interview.started_at}
                ended={detail.interview.ended_at}
                duration={detail.interview.duration_seconds}
              />
            }
            actions={
              <div className="inline-flex flex-wrap gap-2">
                <StatusBadge status={detail.interview.status} />
                {detail.interview.processing_status &&
                  detail.interview.status === "COMPLETED" && (
                    <StatusBadge status={detail.interview.processing_status} />
                  )}
              </div>
            }
          />

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

function MetaLine({
  department,
  mode,
  started,
  ended,
  duration,
}: {
  department?: string;
  mode: string;
  started?: string;
  ended?: string;
  duration?: number;
}) {
  const parts: string[] = [];
  if (department) parts.push(department);
  parts.push(mode === "voice" ? "Voice" : "Chat");
  if (started) parts.push(`Start ${formatDate(started)}`);
  if (ended) parts.push(`Ende ${formatDate(ended)}`);
  if (duration) parts.push(formatDuration(duration));

  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-3">
          {i > 0 && <span aria-hidden className="text-fg-subtle">·</span>}
          {p}
        </span>
      ))}
    </span>
  );
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
  return `${m} min ${s.toString().padStart(2, "0")}s`;
}
