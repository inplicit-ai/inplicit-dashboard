import { FlaskConical } from "lucide-react";
import { makeApi, type Hypothesis } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/PageChrome";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatBand } from "@/components/ui/stat-band";
import { CardGrid } from "@/components/ui/card-grid";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Scorecard } from "@/components/ui/scorecard";
import { StatusDisc, toStatusState, type StatusState } from "@/components/ui/status-disc";

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

  return (
    <div className="surface-bleed">
      {/* WHY-95: subtitle removed to declutter the tab. */}
      <PageHeader title="Cross Validation" />

      {!!error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      <StatBand
        className="mb-8"
        cells={[
          { label: "Verifiziert", value: verified },
          { label: "In Validierung", value: open },
          { label: "Verworfen", value: rejected },
        ]}
      />

      {hypotheses.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="Noch keine Hypothesen"
          hint="Hypothesen entstehen, sobald genug Signale aus mehreren Abteilungen vorliegen."
        />
      ) : (
        <>
          <SectionHeading title="Hypothesen" count={hypotheses.length} />
          <CardGrid>
            {hypotheses.map((h) => (
              <HypothesisCard key={h.id} h={h} />
            ))}
          </CardGrid>
        </>
      )}
    </div>
  );
}

function HypothesisCard({ h }: { h: Hypothesis }) {
  const status: StatusState =
    h.validation_state === "VERIFIED"
      ? "verified"
      : h.validation_state === "REJECTED"
        ? "contradicted"
        : h.validation_state === "PENDING" || h.validation_state === "EVOLVING"
          ? "pending"
          : toStatusState(h.validation_state);

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug tracking-[-0.01em] text-fg">
          {h.statement}
        </h3>
        <StatusDisc state={status} size="sm" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={h.validation_state} />
        {typeof h.confidence_score === "number" && (
          <span className="text-[length:var(--text-caption)] tabular-nums text-fg-subtle">
            {Math.round(h.confidence_score * 100)}% Konfidenz
          </span>
        )}
      </div>

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

      {h.dept_coverage.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-line-subtle pt-3">
          {h.dept_coverage.map((d) => (
            <span key={d} className="badge badge--knowledge">
              {d}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
