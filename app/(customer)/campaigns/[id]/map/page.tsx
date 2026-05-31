import { makeApi, type Cluster } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/ui/page-header";
import { KnowledgeMap } from "@/components/KnowledgeMap";

export default async function MapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = makeApi(await requestCookie());
  let clusters: Cluster[] = [];
  let error: unknown = null;
  try {
    clusters = await api.clusters.list(id);
  } catch (e) {
    error = e;
  }

  return (
    // surface-bleed gives the D3 canvas the full gutter width (contract §7).
    <div className="surface-bleed">
      <PageHeader
        title="Knowledge Map"
        subtitle="Geclusterte Insights, gewichtet nach Signal-Stärke und Abteilungs-Abdeckung."
      />
      {!!error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}
      {/* KnowledgeMap owns its own single-border card container. */}
      <KnowledgeMap clusters={clusters} />
    </div>
  );
}
