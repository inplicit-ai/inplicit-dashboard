import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { makeApi, ApiError, type TwinDetail, type TwinPain } from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageChrome";
import { ErrorState } from "@/components/ErrorState";

// O-9: Digital Twin drill-in (07-digital-twin-ctsim §7). Predicted vs. validated
// side-by-side + divergence. Predicted = hairline/muted; validated = solid.
// Everything carries the SIMULATION badge (EU AI Act / honest-AI).
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
                confidence: Math.round(detail.confidence * 100),
              })
        }
        actions={
          <Badge variant="outline" className="font-mono text-[10px]">
            {t("simulationBadge")}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Predicted — hairline / muted (dashed accent). */}
        <Card className="rounded-card border-dashed p-5 shadow-none">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
              {t("predicted")}
            </span>
            <span className="text-xs text-fg-subtle">
              {t("predictedCount", { count: predicted.length })}
            </span>
          </div>
          {predicted.length === 0 ? (
            <p className="text-sm text-fg-muted">{t("noPredicted")}</p>
          ) : (
            <ul className="space-y-3">
              {predicted.map((p, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <span className="text-sm text-fg-muted">{p.pain}</span>
                  {typeof p.confidence === "number" && (
                    <span className="shrink-0 font-mono text-[11px] text-fg-subtle">
                      {Math.round(p.confidence * 100)}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Validated — solid (real-interview evidence). */}
        <Card className="rounded-card p-5 shadow-none">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg">
              {t("validated")}
            </span>
            <span className="text-xs text-fg-subtle">
              {t("validatedCount", { count: validated.length })}
            </span>
          </div>
          {validated.length === 0 ? (
            <p className="text-sm text-fg-muted">{t("noValidated")}</p>
          ) : (
            <ul className="space-y-3">
              {validated.map((p, i) => (
                <li key={i} className="text-sm text-fg">
                  {p.pain}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Divergence — the most valuable signal (surprise). */}
      {divergence.length > 0 && (
        <Card className="mt-6 rounded-card p-5 shadow-none">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
            {t("divergence")}
          </div>
          <ul className="space-y-2">
            {divergence.map((d, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="font-mono text-[10px]">
                  {d.kind}
                </Badge>
                <span className="text-fg-muted">{d.pain}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
