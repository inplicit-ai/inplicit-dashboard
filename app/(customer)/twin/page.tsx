import { getTranslations } from "next-intl/server";
import { Network } from "lucide-react";
import { makeApi, type TwinGraph as TwinGraphData } from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { Card } from "@/components/ui/card";
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
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 text-sm text-fg-muted">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-5 rounded-sm border border-line bg-surface" />
              {t("legendValidated", { count: validatedCount })}
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-3 w-5 rounded-sm border border-dashed border-line bg-surface"
              />
              {t("legendPredicted")}
            </span>
          </div>

          {graph.nodes.length === 0 ? (
            <Card className="rounded-card border-dashed bg-surface/40 p-12 text-center shadow-none">
              <div className="flex flex-col items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-surface-2 text-fg-muted">
                  <Network className="h-5 w-5" />
                </div>
                <p className="max-w-[48ch] text-sm text-fg-muted">
                  {t("empty")}
                </p>
              </div>
            </Card>
          ) : (
            <TwinGraph data={graph} emptyLabel={t("empty")} />
          )}
        </div>
      )}
    </>
  );
}
