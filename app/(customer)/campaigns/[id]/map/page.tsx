import { makeApi, type Cluster } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageChrome";
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
    <>
      <PageHeader
        title="Knowledge Map"
        meta="Geclusterte Insights, gewichtet nach Signal-Stärke und Abteilungs-Abdeckung."
      />
      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}
      <Card className="overflow-hidden p-0">
        <KnowledgeMap clusters={clusters} />
      </Card>
    </>
  );
}
