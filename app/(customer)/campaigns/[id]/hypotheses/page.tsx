import { makeApi, type Hypothesis } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/PageChrome";
import { SpecStrip } from "@/components/ui/spec-strip";
import { EvidenceTree, type EvidenceNode } from "@/components/ui/agent-list";
import { Scorecard } from "@/components/ui/scorecard";
import { toStatusState, type StatusState } from "@/components/ui/status-disc";

export default async function HypothesesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = makeApi(await requestCookie());
  let hypotheses: Hypothesis[] = [];
  let error: unknown = null;
  try {
    hypotheses = await api.hypotheses.list(id);
  } catch (e) {
    error = e;
  }

  const verified = hypotheses.filter(
    (h) => h.validation_state === "VERIFIED",
  ).length;
  const rejected = hypotheses.filter(
    (h) => h.validation_state === "REJECTED",
  ).length;
  const open = hypotheses.length - verified - rejected;

  const nodes: EvidenceNode[] = hypotheses.map((h) => buildNode(h));

  return (
    <div className="surface-bleed">
      <header className="masthead mb-8">
        <div className="masthead__metric">
          <span className="flex items-baseline gap-3">
            <span className="masthead__num" aria-hidden>
              §
            </span>
            <h1 className="masthead__title">Cross Validation</h1>
          </span>
          <span className="flex flex-col items-end">
            <span className="masthead__metric-value">{hypotheses.length}</span>
            <span className="masthead__metric-label">Hypothesen</span>
          </span>
        </div>
        <p className="masthead__dek">
          Hypothesen werden generiert, sobald genug Signale aus mehreren
          Abteilungen vorliegen, und gegen widersprechende Stimmen geprüft —
          ≥5 bestätigend, ≤1 widersprechend, ≥2 Abteilungen.
        </p>
      </header>

      {!!error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      <SpecStrip
        cells={[
          { label: "Verifiziert", value: verified },
          { label: "In Validierung", value: open },
          { label: "Verworfen", value: rejected },
        ]}
      />

      <div className="mt-8">
        {hypotheses.length === 0 ? (
          <div className="rounded-card border border-dashed border-line-strong bg-surface/40 px-6 py-14">
            <p className="text-center font-mono text-[length:var(--text-caps)] uppercase tracking-[0.06em] text-fg-subtle">
              KEINE HYPOTHESEN AUF DER PLATTE — entstehen, sobald genug Signale
              aus mehreren Abteilungen vorliegen.
            </p>
          </div>
        ) : (
          <>
            <header className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2">
              <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
                § HYPOTHESEN
              </span>
              <span className="font-mono text-xs tabular-nums text-fg-muted">
                n={hypotheses.length}
              </span>
            </header>
            <EvidenceTree nodes={nodes} defaultExpandedDepth={0} />
          </>
        )}
      </div>
    </div>
  );
}

function buildNode(h: Hypothesis): EvidenceNode {
  const status: StatusState =
    h.validation_state === "VERIFIED"
      ? "verified"
      : h.validation_state === "REJECTED"
        ? "contradicted"
        : h.validation_state === "PENDING" || h.validation_state === "EVOLVING"
          ? "pending"
          : toStatusState(h.validation_state);

  const body = (
    <div className="space-y-4 pr-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={h.validation_state} />
        {typeof h.confidence_score === "number" && (
          <span className="font-mono text-[length:var(--text-caps)] uppercase tracking-[0.06em] text-fg-subtle">
            conf={Math.round(h.confidence_score * 100)}%
          </span>
        )}
      </div>
      {h.dept_coverage.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {h.dept_coverage.map((d) => (
            <span key={d} className="badge badge--knowledge">
              {d}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return {
    id: h.id,
    kind: "hypothesis",
    status,
    label: h.statement,
    extra: (
      <Scorecard
        supporting={h.n_supporting}
        contradicting={h.n_contradicting}
        deptCoverage={h.dept_coverage.length}
        labels={{
          supporting: "Stütze",
          contradicting: "Wider",
          depts: "Abt.",
        }}
      />
    ),
    body,
  };
}
