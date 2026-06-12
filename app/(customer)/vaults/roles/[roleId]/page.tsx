import { notFound } from "next/navigation";
import { ArrowLeft, FileStack, MessageSquare, Plug, Sparkles } from "lucide-react";
import {
  makeApi,
  type VaultItem,
  type VaultSection,
  type TwinRole,
  type Campaign,
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
  let roleSection: VaultSection | null = null;
  let items: VaultItem[] = [];
  let campaigns: Campaign[] = [];
  let error: unknown = null;

  try {
    const [roles, vault, camps] = await Promise.all([
      api.twin.listRoles(),
      api.vault.get(),
      api.campaigns.list().catch(() => [] as Campaign[]),
    ]);
    role = roles.find((r) => r.id === roleId);
    // The role's ROLE section is created lazily (on first add). Find it if it
    // already exists; otherwise the add path resolves-or-creates it on demand.
    roleSection =
      vault.sections.find((s) => s.kind === "ROLE" && s.role_id === roleId) ??
      null;
    if (role && roleSection) {
      items = await api.vault.items.list(roleSection.id);
    }
    campaigns = camps;
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
          <Badge variant="secondary" className="text-[10px]">Bestätigt</Badge>
        )}
        {role.has_validated && (
          <Badge variant="secondary" className="text-[10px] text-success">Validiert</Badge>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        {/* Left: context items + campaigns */}
        <div className="min-w-0 space-y-8">

          {/* Role context items */}
          <div>
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
                    <li key={it.id}>
                      <VaultItemRow item={it} sectionId={roleSection!.id} />
                      {/* Text preview for TEXT items */}
                      {it.kind === "TEXT" && it.content && (
                        <div className="border-t border-line-subtle bg-surface-2 px-4 py-2.5">
                          <p className="line-clamp-3 text-[12px] leading-relaxed text-fg-muted">
                            {it.content}
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* All org campaigns */}
          <div>
            <SectionHeading title="Kampagnen" count={campaigns.length || undefined} />
            {campaigns.length === 0 ? (
              <Card className="p-8">
                <EmptyState
                  icon={MessageSquare}
                  title="Noch keine Kampagnen"
                  hint="Diese Rolle hat noch an keiner Kampagne teilgenommen."
                />
              </Card>
            ) : (
              <Card variant="ledger" className="overflow-hidden">
                <ul className="divide-y divide-line-subtle">
                  {campaigns.map((c) => (
                    <li key={c.id}>
                      <a
                        href={`/campaigns/${c.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                      >
                        <MessageSquare size={14} className="shrink-0 text-fg-faint" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-fg">
                          {c.name ?? c.org_name}
                        </span>
                        <span className="shrink-0 text-[11px] capitalize text-fg-subtle">{c.status}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* Integrations — coming soon */}
          <div>
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
                    Confluence, Notion, Google Drive & mehr — automatisch als Rollen-Kontext.
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px]">Bald</Badge>
              </div>
            </Card>
          </div>
        </div>

        {/* Right: add rail */}
        {canWrite && (
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="mb-3 space-y-1">
              <h2 className="text-[length:var(--text-subtitle)] font-semibold tracking-[-0.015em] text-fg">
                Kontext hinzufügen
              </h2>
              <p className="text-xs leading-relaxed text-fg-muted">
                Maßgeschneidertes Wissen für diese Rolle. Wird extrahiert, indexiert und dem
                Interview-Agent als Rollen-Kontext mitgegeben.
              </p>
            </div>
            <RoleContextManager
              roleId={role.id}
              sectionId={roleSection?.id ?? null}
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
