import { defineRoute } from "$fresh/server.ts";
import { Cluster, makeApi } from "../../../../lib/api.ts";
import { Layout, PageHeader } from "../../../../components/Layout.tsx";
import { ErrorState } from "../../../../components/ErrorState.tsx";
import KnowledgeMap from "../../../../islands/KnowledgeMap.tsx";

export default defineRoute(async (req, ctx) => {
  const id = ctx.params.id;
  const api = makeApi(req.headers.get("cookie") ?? undefined);
  let clusters: Cluster[] = [];
  let error: unknown = null;

  try {
    clusters = await api.clusters.list(id);
    console.log(`[map:${id.slice(0, 8)}] loaded ${clusters.length} clusters`);
  } catch (e) {
    error = e;
  }

  return (
    <Layout title="Knowledge Map" campaignId={id} activeTab="map">
      <PageHeader title="Knowledge Map" />

      {error && <div class="section"><ErrorState error={error} /></div>}

      <div class="card card--flush">
        <KnowledgeMap clusters={clusters} apiUrl="" />
      </div>
    </Layout>
  );
});
