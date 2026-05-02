import { makeApi, type Cluster } from "@/lib/api";
import { requestCookie } from "@/lib/auth";
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
      <PageHeader title="Knowledge Map" />
      {error && (
        <div className="section">
          <ErrorState error={error} />
        </div>
      )}
      <div className="card card--flush">
        <KnowledgeMap clusters={clusters} />
      </div>
    </>
  );
}
