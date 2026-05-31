import { getTranslations } from "next-intl/server";
import { Network } from "lucide-react";
import { makeApi, type TwinGraph as TwinGraphData } from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ErrorState";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatBand } from "@/components/ui/stat-band";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusDisc } from "@/components/ui/status-disc";
import { TwinGraph } from "@/components/ctsim/TwinGraph";

// O-9: Digital Twin — vertical role-hierarchy graph (07-digital-twin-ctsim §7).
// Read-only predicted-only slice: solid node = role with VALIDATED twin data,
// dashed = predicted-only. Click a node to drill in (predicted vs. validated).
export default async function DigitalTwinPage() {
  await requireUser();
  const t = await getTranslations("twin");
  const api = makeApi(await requestCookie());

  let graph: TwinGraphData = { nodes: [], edges: [] };
  let error: unknown = null;
  try {
    graph = await api.twin.graph();
  } catch (e) {
    error = e;
  }

  const total = graph.nodes.length;
  const validatedCount = graph.nodes.filter(
    (n) => n.kind === "validated",
  ).length;
  const predictedCount = total - validatedCount;
  const coverage = total > 0 ? Math.round((validatedCount / total) * 100) : 0;

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("meta")}
        actions={<Badge variant="outline">{t("simulationBadge")}</Badge>}
      />

      {error ? (
        <ErrorState error={error} />
      ) : (
        <div className="flex flex-col gap-8">
          {/* Twin coverage readout — the clean white stat band. */}
          <StatBand
            cells={[
              { label: "Rollen", value: total },
              {
                label: "Validated",
                value: validatedCount,
                delta:
                  total > 0 ? { dir: "up", value: `${coverage}%` } : undefined,
              },
              { label: "Predicted", value: predictedCount },
            ]}
          />

          {/* Section header + soft legend pills (no glyph, no all-caps). */}
          <div className="flex flex-col gap-4">
            <SectionHeading
              title="Hierarchie"
              count={total}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDisc state="verified" size="sm" />
                    <Badge variant="success">
                      {t("legendValidated", { count: validatedCount })}
                    </Badge>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDisc state="needs-evidence" size="sm" />
                    <Badge variant="secondary">{t("legendPredicted")}</Badge>
                  </span>
                </div>
              }
            />

            {graph.nodes.length === 0 ? (
              <div className="rounded-card border border-line bg-card shadow-card">
                <EmptyState icon={Network} title={t("empty")} />
              </div>
            ) : (
              <TwinGraph data={graph} emptyLabel={t("empty")} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
