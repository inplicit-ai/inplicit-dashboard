import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { makeApi, ApiError, type TwinDetail, type TwinPain } from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
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
          <Badge variant="outline" className="font-mono text-[11px] tabular-nums">
            {t("simulationBadge")}
          </Badge>
        }
      />

      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {/* Predicted — hairline / muted (dashed accent = simulated, not yet real). */}
        <section className="card card--compact card--opportunity flex flex-col gap-5 border-dashed">
          <header className="flex items-center justify-between gap-3">
            <span className="label-eyebrow text-accent">{t("predicted")}</span>
            <span className="text-xs text-fg-subtle">
              {t("predictedCount", { count: predicted.length })}
            </span>
          </header>
          {predicted.length === 0 ? (
            <p className="text-base leading-relaxed text-fg-muted">
              {t("noPredicted")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {predicted.map((p, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 border-t border-line-subtle pt-3 first:border-t-0 first:pt-0"
                >
                  <span className="text-base leading-relaxed text-fg-muted">
                    {p.pain}
                  </span>
                  {typeof p.confidence === "number" && (
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-fg-subtle">
                      {Math.round(p.confidence * 100)}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Validated — solid (real-interview evidence). */}
        <section className="card card--compact flex flex-col gap-5">
          <header className="flex items-center justify-between gap-3">
            <span className="label-eyebrow text-fg">{t("validated")}</span>
            <span className="text-xs text-fg-subtle">
              {t("validatedCount", { count: validated.length })}
            </span>
          </header>
          {validated.length === 0 ? (
            <p className="text-base leading-relaxed text-fg-muted">
              {t("noValidated")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {validated.map((p, i) => (
                <li
                  key={i}
                  className="border-t border-line-subtle pt-3 text-base leading-relaxed text-fg first:border-t-0 first:pt-0"
                >
                  {p.pain}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Divergence — the most valuable signal (predicted vs. validated surprise). */}
      {divergence.length > 0 && (
        <section className="card card--compact mt-6 flex flex-col gap-4">
          <span className="label-eyebrow">{t("divergence")}</span>
          <ul className="flex flex-col gap-3">
            {divergence.map((d, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="badge badge--knowledge mt-0.5 shrink-0 font-mono text-[11px] uppercase tabular-nums">
                  {d.kind}
                </span>
                <span className="text-base leading-relaxed text-fg-muted">
                  {d.pain}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
