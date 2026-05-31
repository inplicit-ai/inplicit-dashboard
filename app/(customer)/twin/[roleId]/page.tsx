import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { makeApi, ApiError, type TwinDetail, type TwinPain } from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ErrorState";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatBand } from "@/components/ui/stat-band";
import { Card } from "@/components/ui/card";
import { StatusDisc, type StatusState } from "@/components/ui/status-disc";

// O-9: Digital Twin drill-in (07-digital-twin-ctsim §7). Predicted vs. validated
// rendered as calm white cards — predicted = needs-evidence disc, validated =
// verified disc, divergence = the surprise branch. Everything carries the
// SIMULATION badge (EU AI Act / honest-AI).
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
        title={detail.role_name}
        subtitle={
          cold
            ? t("coldMeta")
            : t("refinedMeta", {
                version: detail.version,
                confidence: confidencePct,
              })
        }
        actions={<Badge variant="outline">{t("simulationBadge")}</Badge>}
      />

      <div className="flex flex-col gap-8">
        {/* Confidence readout — clean white stat band. */}
        <StatBand
          cells={[
            { label: t("validated"), value: validated.length },
            { label: t("predicted"), value: predicted.length },
            {
              label: "Confidence",
              value: cold ? "—" : `${confidencePct}%`,
            },
            {
              label: "Twin",
              value: `v${detail.version}`,
            },
          ]}
        />

        {/* Predicted — needs-evidence discs (simulated, not yet real). */}
        <section className="flex flex-col gap-4">
          <SectionHeading
            title={t("predicted")}
            count={predicted.length}
            action={
              <span className="text-[length:var(--text-meta)] text-fg-subtle">
                {t("predictedCount", { count: predicted.length })}
              </span>
            }
          />
          {predicted.length === 0 ? (
            <PlatePlaceholder>{t("noPredicted")}</PlatePlaceholder>
          ) : (
            <div className="flex flex-col gap-3">
              {predicted.map((p, i) => (
                <PainCard
                  key={i}
                  status="needs-evidence"
                  index={`P-${String(i + 1).padStart(2, "0")}`}
                  pain={p.pain}
                  muted
                  metric={
                    typeof p.confidence === "number"
                      ? `${Math.round(p.confidence * 100)}%`
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Validated — verified discs (real-interview evidence). */}
        <section className="flex flex-col gap-4">
          <SectionHeading
            title={t("validated")}
            count={validated.length}
            action={
              <span className="text-[length:var(--text-meta)] text-fg-subtle">
                {t("validatedCount", { count: validated.length })}
              </span>
            }
          />
          {validated.length === 0 ? (
            <PlatePlaceholder>{t("noValidated")}</PlatePlaceholder>
          ) : (
            <div className="flex flex-col gap-3">
              {validated.map((p, i) => (
                <PainCard
                  key={i}
                  status="verified"
                  index={`V-${String(i + 1).padStart(2, "0")}`}
                  pain={p.pain}
                />
              ))}
            </div>
          )}
        </section>

        {/* Divergence — the surprise branch (predicted vs. validated gap). */}
        {divergence.length > 0 && (
          <section className="flex flex-col gap-4">
            <SectionHeading title={t("divergence")} count={divergence.length} />
            <div className="flex flex-col gap-3">
              {divergence.map((d, i) => (
                <PainCard
                  key={i}
                  status="contradicted"
                  index={`D-${String(i + 1).padStart(2, "0")}`}
                  pain={d.pain}
                  muted
                  badge={d.kind}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

/** A single pain row — clean white card with a status disc + sans index. */
function PainCard({
  status,
  index,
  pain,
  muted = false,
  metric,
  badge,
}: {
  status: StatusState;
  index: string;
  pain: string;
  muted?: boolean;
  metric?: string;
  badge?: string;
}) {
  return (
    <Card className="flex-row items-start gap-4 px-5 py-4">
      <span className="flex shrink-0 items-center gap-3 pt-0.5">
        <StatusDisc state={status} size="sm" />
        <span className="font-mono text-[length:var(--text-caption)] tabular-nums text-fg-subtle">
          {index}
        </span>
      </span>
      <p
        className={
          muted
            ? "min-w-0 flex-1 text-[length:var(--text-body)] leading-relaxed text-fg-muted"
            : "min-w-0 flex-1 text-[length:var(--text-body)] leading-relaxed text-fg"
        }
      >
        {pain}
      </p>
      {metric && (
        <span className="shrink-0 text-[length:var(--text-meta)] tabular-nums text-fg-subtle">
          {metric}
        </span>
      )}
      {badge && (
        <Badge variant="secondary" className="shrink-0">
          {badge}
        </Badge>
      )}
    </Card>
  );
}

/** Quiet placeholder card for an empty pain list. */
function PlatePlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface-2 px-5 py-4">
      <p className="text-[length:var(--text-body)] leading-relaxed text-fg-muted">
        {children}
      </p>
    </div>
  );
}
