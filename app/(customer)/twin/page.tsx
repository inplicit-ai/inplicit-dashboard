import { getTranslations } from "next-intl/server";
import { Network } from "lucide-react";
import { makeApi, type TwinGraph as TwinGraphData } from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageChrome";
import { ErrorState } from "@/components/ErrorState";
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

  const validatedCount = graph.nodes.filter((n) => n.kind === "validated").length;

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        meta={t("meta")}
        actions={
          <Badge variant="outline" className="font-mono text-[10px]">
            {t("simulationBadge")}
          </Badge>
        }
      />

      {error ? (
        <ErrorState error={error} />
      ) : (
        <div className="surface-bleed flex flex-col gap-6">
          {/* Legend — chips describing the two node treatments. */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-fg-muted">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1">
              <span className="inline-block h-3 w-5 rounded-sm border border-line-strong bg-surface-2" />
              {t("legendValidated", { count: validatedCount })}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1">
              <span className="inline-block h-3 w-5 rounded-sm border border-dashed border-line-strong bg-surface-2" />
              {t("legendPredicted")}
            </span>
          </div>

          {graph.nodes.length === 0 ? (
            <div className="card rounded-card border-dashed py-16 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="grid size-12 place-items-center rounded-full border border-line bg-surface-2 text-fg-subtle">
                  <Network className="h-5 w-5" />
                </div>
                <p className="max-w-[48ch] text-sm leading-relaxed text-fg-muted">
                  {t("empty")}
                </p>
              </div>
            </div>
          ) : (
            <TwinGraph data={graph} emptyLabel={t("empty")} />
          )}
        </div>
      )}
    </>
  );
}
