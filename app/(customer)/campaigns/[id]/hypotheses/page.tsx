import { Microscope } from "lucide-react";
import { makeApi, type Hypothesis } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, StatusBadge } from "@/components/PageChrome";
import { cn } from "@/lib/utils";

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

  return (
    // surface-bleed opts this work surface into the full gutter width (contract §7).
    <div className="surface-bleed">
      <PageHeader
        title="Cross Validation"
        meta="Hypothesen werden generiert, sobald genug Signale aus mehreren Abteilungen vorliegen, und gegen widersprechende Stimmen geprüft."
      />

      {!!error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}

      {hypotheses.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 border-dashed py-16 text-center">
          <div className="grid size-11 place-items-center rounded-full bg-surface-2 text-fg-muted">
            <Microscope className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-fg">
              Noch keine Hypothesen generiert.
            </p>
            <p className="text-sm text-fg-muted">
              Sie entstehen, sobald genug Signale aus mehreren Abteilungen
              vorliegen.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {hypotheses.map((h) => (
            <HypothesisCard key={h.id} h={h} />
          ))}
        </div>
      )}
    </div>
  );
}

// Tinted semantic panels per validation state. Uses the design.css `.card--*`
// modifiers so light/dark border + fill alphas are pre-tuned (one border/edge).
const STATE_CARD: Record<string, string> = {
  VERIFIED: "card--opportunity",
  REJECTED: "card--pain",
};

function HypothesisCard({ h }: { h: Hypothesis }) {
  const total = h.n_supporting + h.n_contradicting;
  const supportRate = total > 0 ? Math.round((h.n_supporting / total) * 100) : 0;
  const stateCard = STATE_CARD[h.validation_state] ?? "";

  return (
    <div
      className={cn(
        "card card--compact transition-colors hover:border-line-strong",
        stateCard,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="flex-1 text-base font-medium leading-relaxed tracking-tight text-fg">
          {h.statement}
        </p>
        <StatusBadge status={h.validation_state} />
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-line-subtle pt-4">
        <HypStat label="Bestätigend" value={h.n_supporting} tone="success" />
        <HypStat label="Widersprechend" value={h.n_contradicting} tone="danger" />
        <HypStat label="Abteilungen" value={h.dept_coverage.length} />
      </div>

      {total > 0 && (
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-pain-soft">
            <div
              className="h-full rounded-full bg-success transition-[width] duration-500"
              style={{ width: `${supportRate}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-fg-muted">
            <span className="font-mono tabular-nums">{supportRate}%</span>{" "}
            bestätigend
          </p>
        </div>
      )}

      {h.dept_coverage.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {h.dept_coverage.map((d) => (
            <span key={d} className="badge badge--knowledge">
              {d}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function HypStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "danger";
}) {
  const valueColor =
    tone === "success"
      ? "text-success"
      : tone === "danger"
      ? "text-danger"
      : "text-fg";
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
        {label}
      </p>
      <p
        className={cn(
          "font-mono text-xl font-semibold tabular-nums tracking-tight",
          valueColor,
        )}
      >
        {value}
      </p>
    </div>
  );
}
