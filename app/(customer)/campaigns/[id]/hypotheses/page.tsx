import { makeApi, type Hypothesis } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, StatusBadge } from "@/components/PageChrome";

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
    <>
      <PageHeader title="Cross Validation" />
      {error && (
        <div className="section">
          <ErrorState error={error} />
        </div>
      )}

      {hypotheses.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p className="empty-state__title">Noch keine Hypothesen generiert.</p>
            <p>Sie entstehen, sobald genug Signale aus mehreren Abteilungen vorliegen.</p>
          </div>
        </div>
      ) : (
        <div className="list-stack">
          {hypotheses.map((h) => (
            <HypothesisCard key={h.id} h={h} />
          ))}
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hyp-card {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-card);
          padding: var(--space-6);
          transition: border-color 0.15s var(--ease-smooth);
        }
        .hyp-card:hover { border-color: var(--color-text-tertiary); }
        .hyp-card[data-state="VERIFIED"] { background: var(--color-accent-soft); border-color: var(--color-accent-muted); }
        .hyp-card[data-state="REJECTED"] { background: var(--color-pain-soft); border-color: var(--color-pain-muted); }
        .hyp-card[data-state="EVOLVING"] { background: var(--color-bg-soft); border-color: var(--color-text-tertiary); }
        .hyp-card__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-4);
          margin-bottom: var(--space-4);
        }
        .hyp-card__statement {
          font-size: var(--text-body-lg);
          font-weight: 500;
          line-height: 1.5;
          letter-spacing: -0.005em;
          color: var(--color-text-primary);
          flex: 1;
        }
        .hyp-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
          padding-top: var(--space-4);
          border-top: 1px solid var(--color-border-subtle);
        }
        .hyp-stat__label {
          font-size: var(--text-eyebrow);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-text-tertiary);
        }
        .hyp-stat__value {
          font-size: var(--text-subtitle);
          font-weight: 500;
          margin-top: var(--space-1);
          font-variant-numeric: tabular-nums;
        }
        .hyp-bar {
          height: 4px;
          background: var(--color-pain-soft);
          border-radius: 2px;
          overflow: hidden;
          margin-top: var(--space-4);
        }
        .hyp-bar__fill {
          height: 100%;
          background: var(--color-accent);
          transition: width 0.3s var(--ease-smooth);
        }
        .hyp-depts { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-top: var(--space-4); }
      `,
        }}
      />
    </>
  );
}

function HypothesisCard({ h }: { h: Hypothesis }) {
  const total = h.n_supporting + h.n_contradicting;
  const supportRate = total > 0 ? Math.round((h.n_supporting / total) * 100) : 0;

  return (
    <div className="hyp-card" data-state={h.validation_state}>
      <div className="hyp-card__head">
        <p className="hyp-card__statement">{h.statement}</p>
        <StatusBadge status={h.validation_state} />
      </div>

      <div className="hyp-stats">
        <div>
          <div className="hyp-stat__label">Bestätigend</div>
          <div className="hyp-stat__value" style={{ color: "var(--color-success)" }}>
            {h.n_supporting}
          </div>
        </div>
        <div>
          <div className="hyp-stat__label">Widersprechend</div>
          <div className="hyp-stat__value" style={{ color: "var(--color-pain)" }}>
            {h.n_contradicting}
          </div>
        </div>
        <div>
          <div className="hyp-stat__label">Abteilungen</div>
          <div className="hyp-stat__value">{h.dept_coverage.length}</div>
        </div>
      </div>

      {total > 0 && (
        <>
          <div className="hyp-bar">
            <div className="hyp-bar__fill" style={{ width: `${supportRate}%` }} />
          </div>
          <p className="caption" style={{ marginTop: "var(--space-2)" }}>
            {supportRate}% bestätigend
          </p>
        </>
      )}

      {h.dept_coverage.length > 0 && (
        <div className="hyp-depts">
          {h.dept_coverage.map((d) => (
            <span key={d} className="badge">
              {d}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
