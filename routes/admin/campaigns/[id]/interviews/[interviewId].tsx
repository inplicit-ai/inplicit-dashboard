import { defineRoute } from "$fresh/server.ts";
import { InterviewDetail, makeApi } from "../../../../../lib/api.ts";
import {
  Layout,
  PageHeader,
  StatusBadge,
} from "../../../../../components/Layout.tsx";
import { ErrorState } from "../../../../../components/ErrorState.tsx";
import InterviewDetailView from "../../../../../islands/InterviewDetailView.tsx";

export default defineRoute(async (req, ctx) => {
  const campaignId = ctx.params.id;
  const interviewId = ctx.params.interviewId;
  const api = makeApi(req.headers.get("cookie") ?? undefined);

  let detail: InterviewDetail | null = null;
  let error: unknown = null;

  try {
    detail = await api.interviews.detail(interviewId);
  } catch (e) {
    error = e;
  }

  return (
    <Layout
      title="Interview"
      campaignId={campaignId}
      activeTab="interviews"
    >
      {error && (
        <div class="section">
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
              <div class="iv-detail__badges">
                <StatusBadge status={detail.interview.status} />
                {detail.interview.processing_status &&
                  detail.interview.status === "COMPLETED" && (
                  <StatusBadge
                    status={detail.interview.processing_status}
                  />
                )}
              </div>
            }
          />

          <div class="iv-detail__back">
            <a
              href={`/admin/campaigns/${campaignId}/interviews`}
              class="link-back"
            >
              ← Zurück zur Liste
            </a>
          </div>

          <InterviewDetailView
            utterances={detail.utterances}
            insights={detail.insights}
            processingStatus={detail.interview.processing_status ?? undefined}
          />
        </>
      )}

      <style>
        {`
        .iv-detail__back {
          margin: calc(var(--space-6) * -1) 0 var(--space-8) 0;
        }
        .link-back {
          font-size: var(--text-meta);
          color: var(--color-text-secondary);
          border-bottom: 1px solid transparent;
        }
        .link-back:hover { border-bottom-color: var(--color-text-secondary); }

        .iv-detail__badges {
          display: inline-flex;
          gap: var(--space-2);
        }

        .meta-line {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2) var(--space-4);
          font-size: var(--text-meta);
          color: var(--color-text-secondary);
        }
        .meta-line__sep { color: var(--color-text-quaternary); }

        .section-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: var(--space-4);
          margin-bottom: var(--space-5);
        }
        .section-header__title {
          font-size: var(--text-subtitle);
          font-weight: 500;
          letter-spacing: -0.01em;
          color: var(--color-text-primary);
        }
        .section-header__count {
          font-family: var(--font-mono);
          font-size: var(--text-mono);
          color: var(--color-text-tertiary);
          font-variant-numeric: tabular-nums;
        }
        `}
      </style>
    </Layout>
  );
});

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
    <span class="meta-line">
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span class="meta-line__sep">·</span>} {p}
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
