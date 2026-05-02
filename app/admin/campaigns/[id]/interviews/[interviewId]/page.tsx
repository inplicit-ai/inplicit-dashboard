import Link from "next/link";
import { makeApi, type InterviewDetail } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
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
        <div className="section">
          <ErrorState error={error} />
        </div>
      )}

      {detail && (
        <>
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
              <div className="iv-detail__badges">
                <StatusBadge status={detail.interview.status} />
                {detail.interview.processing_status &&
                  detail.interview.status === "COMPLETED" && (
                    <StatusBadge status={detail.interview.processing_status} />
                  )}
              </div>
            }
          />

          <div className="iv-detail__back">
            <Link
              href={`/admin/campaigns/${campaignId}/interviews`}
              className="link-back"
            >
              ← Zurück zur Liste
            </Link>
          </div>

          <InterviewDetailView
            utterances={detail.utterances}
            insights={detail.insights}
            processingStatus={detail.interview.processing_status ?? undefined}
          />
        </>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .iv-detail__back { margin: calc(var(--space-6) * -1) 0 var(--space-8) 0; }
        .link-back {
          font-size: var(--text-meta);
          color: var(--color-text-secondary);
          border-bottom: 1px solid transparent;
        }
        .link-back:hover { border-bottom-color: var(--color-text-secondary); }
        .iv-detail__badges { display: inline-flex; gap: var(--space-2); }
        .meta-line {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2) var(--space-4);
          font-size: var(--text-meta);
          color: var(--color-text-secondary);
        }
        .meta-line__sep { color: var(--color-text-quaternary); }
      `,
        }}
      />
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
    <span className="meta-line">
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span className="meta-line__sep">·</span>} {p}
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
