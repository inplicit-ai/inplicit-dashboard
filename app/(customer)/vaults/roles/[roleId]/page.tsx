import { notFound } from "next/navigation";
import { ArrowLeft, FileStack, Plug, Sparkles } from "lucide-react";
import {
  makeApi,
  type Vault,
  type VaultItem,
  type TwinRole,
} from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ErrorState";
import { VaultItemRow } from "@/components/vaults/VaultItemRow";
import { RoleContextManager } from "@/components/vaults/RoleContextManager";
import { RoleCrumbRegistrar } from "@/components/vaults/RoleCrumbRegistrar";

/**
 * Per-role context page (WHY-115 hub sub-page). Lets an org owner give a single
 * role tailored, anonymous interview context — uploaded texts/files now,
 * integrations later. The context lives in the role's ROLE-scoped vault and is
 * folded into the interviewer's system prompt at interview time, so the agent
 * works with role-specific knowledge without ever seeing per-person PII.
 */
export default async function RoleContextPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { me } = await requireUser();
  const { roleId } = await params;
  const api = makeApi(await requestCookie());
  const canWrite = me.role === "ORG_OWNER";

  let role: TwinRole | undefined;
  let roleVault: Vault | null = null;
  let items: VaultItem[] = [];
  let error: unknown = null;

  try {
    const [roles, vaults] = await Promise.all([
      api.twin.listRoles(),
      api.vaults.list(),
    ]);
    role = roles.find((r) => r.id === roleId);
    // notFound() throws — call it AFTER the try so the catch can't swallow it.
    roleVault =
      vaults.find((v) => v.scope === "ROLE" && v.role_id === roleId) ?? null;
    if (role && roleVault) {
      items = await api.vaults.listItems(roleVault.id);
    }
  } catch (e) {
    error = e;
  }

  if (error) {
    return (
      <>
        <BackLink />
        <ErrorState error={error} />
      </>
    );
  }
  if (!role) notFound();

  return (
    <>
      <RoleCrumbRegistrar name={role.name} />
      <BackLink />

      <PageHeader
        title={role.name}
        subtitle={
          role.description ??
          "Kontext für diese Rolle. Texte und Dateien hier fließen anonym in jedes Interview dieser Rolle ein."
        }
        actions={
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={`/twin/${role.id}`}>
              <Sparkles size={14} aria-hidden />
              Digital Twin
            </a>
          </Button>
        }
      />

      <div className="mb-6 flex items-center gap-2">
        {role.confirmed && (
          <Badge variant="secondary" className="text-[10px]">
            Bestätigt
          </Badge>
        )}
        {role.has_validated && (
          <Badge variant="secondary" className="text-[10px] text-success">
            Validiert
          </Badge>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        {/* Context items */}
        <div className="min-w-0">
          <SectionHeading title="Rollen-Kontext" count={items.length || undefined} />
          {items.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={FileStack}
                title="Noch kein Kontext"
                hint={
                  canWrite
                    ? "Füge Texte oder Dateien hinzu — der Interview-Agent nutzt sie für diese Rolle."
                    : "Für diese Rolle wurde noch kein Kontext hinterlegt."
                }
              />
            </Card>
          ) : (
            <Card variant="ledger" className="overflow-hidden">
              <ul className="divide-y divide-line-subtle">
                {items.map((it) => (
                  <VaultItemRow key={it.id} item={it} vaultId={roleVault!.id} />
                ))}
              </ul>
            </Card>
          )}

          {/* Integrations — coming soon */}
          <div className="mt-8">
            <SectionHeading title="Integrationen" />
            <Card className="p-5 opacity-80">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ui border border-line bg-surface-2 text-fg-muted">
                  <Plug size={18} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[length:var(--text-body-sm)] font-medium text-fg">
                    Quellen pro Rolle verbinden
                  </p>
                  <p className="text-[length:var(--text-caption)] text-fg-muted">
                    Confluence, Notion, Google Drive & mehr — automatisch als
                    Rollen-Kontext.
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  Bald
                </Badge>
              </div>
            </Card>
          </div>
        </div>

        {/* Add rail */}
        {canWrite && (
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="mb-3 space-y-1">
              <h2 className="text-[length:var(--text-subtitle)] font-semibold tracking-[-0.015em] text-fg">
                Kontext hinzufügen
              </h2>
              <p className="text-xs leading-relaxed text-fg-muted">
                Maßgeschneidertes Wissen für diese Rolle. Wird extrahiert,
                indexiert und dem Interview-Agent als Rollen-Kontext mitgegeben.
              </p>
            </div>
            <RoleContextManager
              roleId={role.id}
              roleName={role.name}
              vaultId={roleVault?.id ?? null}
            />
          </aside>
        )}
      </div>
    </>
  );
}

function BackLink() {
  return (
    <a
      href="/vaults?folder=roles"
      className="mb-4 inline-flex items-center gap-1.5 text-[length:var(--text-meta)] text-fg-muted transition-colors hover:text-fg"
    >
      <ArrowLeft size={14} aria-hidden />
      Zurück zu Rollen
    </a>
  );
}
