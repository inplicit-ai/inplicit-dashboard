import { getTranslations } from "next-intl/server";
import { Network } from "lucide-react";
import { makeApi, type TwinGraph as TwinGraphData } from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageChrome";
import { ErrorState } from "@/components/ErrorState";
import { Folio } from "@/components/ui/folio";
import { InstrumentBand } from "@/components/ui/instrument-band";
import { DataChip } from "@/components/ui/data-chip";
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
        eyebrow={t("eyebrow")}
        title={t("title")}
        meta={t("meta")}
        actions={
          <Badge variant="outline" className="font-mono text-[11px] tabular-nums">
            {t("simulationBadge")}
          </Badge>
        }
      />

      {error ? (
        <ErrorState error={error} />
      ) : (
        <div className="surface-bleed flex flex-col gap-6">
          {/* One ruled instrument band — the twin coverage readout. */}
          <InstrumentBand
            cells={[
              { label: "Rollen", value: total },
              {
                label: "Validated",
                value: validatedCount,
                delta:
                  total > 0
                    ? { value: `${coverage}%`, dir: "up" }
                    : undefined,
              },
              { label: "Predicted", value: predictedCount },
            ]}
          />

          {/* Section folio + ledger-language legend (square chips, not pills). */}
          <div className="flex flex-col gap-4">
            <Folio
              index="§"
              label="Hierarchie"
              count={total}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDisc state="verified" size="sm" />
                    <DataChip tone="success" mono>
                      {t("legendValidated", { count: validatedCount })}
                    </DataChip>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDisc state="needs-evidence" size="sm" />
                    <DataChip>{t("legendPredicted")}</DataChip>
                  </span>
                </div>
              }
            />

            {graph.nodes.length === 0 ? (
              <div className="card rounded-card border-dashed py-16 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="grid size-12 place-items-center rounded-full border border-line bg-surface-2 text-fg-subtle">
                    <Network className="h-5 w-5" />
                  </div>
                  <p className="max-w-[48ch] text-base leading-relaxed text-fg-muted">
                    {t("empty")}
                  </p>
                </div>
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
