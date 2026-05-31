import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { makeApi, ApiError, type TwinDetail, type TwinPain } from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageChrome";
import { ErrorState } from "@/components/ErrorState";
import { Folio } from "@/components/ui/folio";
import { Ledger } from "@/components/ui/ledger";
import { LedgerRow } from "@/components/ui/ledger-row";
import { InstrumentBand } from "@/components/ui/instrument-band";
import { SpecBlock } from "@/components/ui/spec-block";
import { DataChip } from "@/components/ui/data-chip";

// O-9: Digital Twin drill-in (07-digital-twin-ctsim §7). Predicted vs. validated
// rendered as ONE evidence tree on the spine — predicted = needs-evidence disc,
// validated = verified disc, divergence = the surprise branch. Everything carries
// the SIMULATION badge (EU AI Act / honest-AI).
export default async function TwinDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  await requireUser();
  const { roleId } = await params;
  const t = await getTranslations("twin");
  const api = makeApi(await requestCookie());

  let detail: TwinDetail | null = null;
  let error: unknown = null;
  try {
    detail = await api.twin.detail(roleId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    error = e;
  }

  if (error) return <ErrorState error={error} />;
  if (!detail) notFound();

  const predicted: TwinPain[] = detail.model?.predicted_pains ?? [];
  const validated: TwinPain[] = detail.model?.validated_pains ?? [];
  const divergence = detail.model?.divergence ?? [];
  const cold = validated.length === 0;
  const confidencePct = Math.round(detail.confidence * 100);

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={detail.role_name}
        meta={
          cold
            ? t("coldMeta")
            : t("refinedMeta", {
                version: detail.version,
                confidence: confidencePct,
              })
        }
        actions={
          <Badge variant="outline" className="font-mono text-[11px] tabular-nums">
            {t("simulationBadge")}
          </Badge>
        }
      />

      {/* Two-track masthead: sticky SpecBlock rail | the evidence-tree track. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(200px,260px)_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SpecBlock
            rows={[
              { label: t("eyebrow"), value: detail.role_name },
              {
                label: "Twin",
                value: (
                  <span className="font-mono tabular-nums">
                    v{detail.version}
                  </span>
                ),
              },
              {
                label: t("validated"),
                value: (
                  <span className="font-mono tabular-nums">
                    {validated.length}
                  </span>
                ),
              },
              {
                label: t("predicted"),
                value: (
                  <span className="font-mono tabular-nums">
                    {predicted.length}
                  </span>
                ),
              },
              {
                label: "Status",
                value: (
                  <DataChip tone={cold ? "warning" : "success"} mono>
                    {cold ? "COLD" : `${confidencePct}%`}
                  </DataChip>
                ),
              },
            ]}
          />
        </aside>

        <div className="flex flex-col gap-8">
          {/* Confidence instrument band. */}
          <InstrumentBand
            cells={[
              {
                label: t("validated"),
                value: validated.length,
              },
              {
                label: t("predicted"),
                value: predicted.length,
              },
              {
                label: "Confidence",
                value: cold ? "—" : `${confidencePct}%`,
              },
            ]}
          />

          {/* Predicted — needs-evidence discs (simulated, not yet real). */}
          <section className="flex flex-col gap-3">
            <Folio
              index="§"
              label={t("predicted")}
              count={predicted.length}
              tone="subtle"
              action={
                <span className="text-[length:var(--text-eyebrow)] uppercase tracking-[0.1em] text-fg-subtle">
                  {t("predictedCount", { count: predicted.length })}
                </span>
              }
            />
            {predicted.length === 0 ? (
              <PlatePlaceholder>{t("noPredicted")}</PlatePlaceholder>
            ) : (
              <Ledger>
                {predicted.map((p, i) => (
                  <LedgerRow
                    key={i}
                    status="needs-evidence"
                    index={`P-${String(i + 1).padStart(2, "0")}`}
                    title={
                      <span className="text-[length:var(--text-body)] leading-relaxed text-fg-muted">
                        {p.pain}
                      </span>
                    }
                    metric={
                      typeof p.confidence === "number" ? (
                        <span className="font-mono tabular-nums">
                          {Math.round(p.confidence * 100)}%
                        </span>
                      ) : undefined
                    }
                  />
                ))}
              </Ledger>
            )}
          </section>

          {/* Validated — verified discs (real-interview evidence). */}
          <section className="flex flex-col gap-3">
            <Folio
              index="§"
              label={t("validated")}
              count={validated.length}
              tone="subtle"
              action={
                <span className="text-[length:var(--text-eyebrow)] uppercase tracking-[0.1em] text-fg-subtle">
                  {t("validatedCount", { count: validated.length })}
                </span>
              }
            />
            {validated.length === 0 ? (
              <PlatePlaceholder>{t("noValidated")}</PlatePlaceholder>
            ) : (
              <Ledger>
                {validated.map((p, i) => (
                  <LedgerRow
                    key={i}
                    status="verified"
                    index={`V-${String(i + 1).padStart(2, "0")}`}
                    title={
                      <span className="text-[length:var(--text-body)] leading-relaxed text-fg">
                        {p.pain}
                      </span>
                    }
                  />
                ))}
              </Ledger>
            )}
          </section>

          {/* Divergence — the surprise branch (predicted vs. validated gap). */}
          {divergence.length > 0 && (
            <section className="flex flex-col gap-3">
              <Folio
                index="§"
                label={t("divergence")}
                count={divergence.length}
                tone="subtle"
              />
              <Ledger>
                {divergence.map((d, i) => (
                  <LedgerRow
                    key={i}
                    status="contradicted"
                    index={`D-${String(i + 1).padStart(2, "0")}`}
                    title={
                      <span className="text-[length:var(--text-body)] leading-relaxed text-fg-muted">
                        {d.pain}
                      </span>
                    }
                    metric={
                      <DataChip tone="gap" mono>
                        {d.kind}
                      </DataChip>
                    }
                  />
                ))}
              </Ledger>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

/** Printed-plate placeholder — hairline rule + quiet caption. */
function PlatePlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface-2 px-4 py-3">
      <p className="text-[length:var(--text-body)] leading-relaxed text-fg-muted">
        {children}
      </p>
    </div>
  );
}
