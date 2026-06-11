import { PageHeader } from "@/components/ui/page-header";
import { requireOrgOwner } from "@/lib/auth";
import { McpKeysPanel } from "@/components/mcp/McpKeysPanel";

// MCP hub: connect Claude & other MCP hosts to this org's research data
// (campaigns, insights, hypotheses, transcripts, vault search) via the
// backend's MCP server (POST /api/mcp, Bearer ipk_… keys). ORG_OWNER only.
export default async function McpPage() {
  await requireOrgOwner();

  // The public backend base the MCP host must reach directly (not the /dapi
  // proxy — MCP hosts are not browsers with a session cookie).
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "";
  const endpoint = apiBase ? `${apiBase.replace(/\/$/, "")}/api/mcp` : "/api/mcp";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="MCP"
        subtitle="Verbinde Claude & andere MCP-Hosts mit deinen Inplicit-Daten — Kampagnen, Insights, Hypothesen, Transkripte und Kontext-Suche, nur lesend."
      />
      <McpKeysPanel endpoint={endpoint} />
    </div>
  );
}
