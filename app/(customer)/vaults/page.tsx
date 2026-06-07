import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Building2,
  CheckCircle2,
  FolderOpen,
  Network,
  Plug,
  TriangleAlert,
  Upload,
} from "lucide-react";
import {
  makeApi,
  ApiError,
  type Vault,
  type VaultItem,
  type TwinGraph as TwinGraphData,
} from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { CardGrid } from "@/components/ui/card-grid";
import { DataChip } from "@/components/ui/data-chip";
import { Badge } from "@/components/ui/badge";
import { TwinGraph } from "@/components/ctsim/TwinGraph";
import { VaultFolderCard } from "@/components/vault/VaultFolderCard";
import { VaultFolderBreadcrumb } from "@/components/vaults/VaultFolderBreadcrumb";
import { cn } from "@/lib/utils";

type Folder = "org" | "roles" | "integrations" | "uploads";
const FOLDERS: Folder[] = ["org", "roles", "integrations", "uploads"];

interface SearchParams {
  folder?: string;
  vault?: string;
  flash?: string;
  flashType?: "ok" | "err";
}

// WHY-115: Kontext-Vault hub. ONE surface that consolidates Allgemein/
// Unternehmen (org vault items), Rollen (the digital-twin graph), Integrationen
// (folded in, coming-soon here), and Uploads (FILE items). The standalone
// /twin and /integrations routes are kept as deep links. Read = ORG_MEMBER;
// writes = ORG_OWNER (enforced server-side).
export default async function KontextVaultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { me } = await requireUser();
  const sp = await searchParams;
  const t = await getTranslations("vaultHub");
  const tv = await getTranslations("vaults");
  const api = makeApi(await requestCookie());
  const canWrite = me.role === "ORG_OWNER";
  const folder = (FOLDERS as string[]).includes(sp.folder ?? "")
    ? (sp.folder as Folder)
    : null;

  let vaults: Vault[] = [];
  let error: unknown = null;
  try {
    vaults = await api.vaults.list();
  } catch (e) {
    error = e;
  }

  const orgVaults = vaults.filter((v) => (v.scope ?? "ORG") === "ORG");
  const activeId = sp.vault ?? orgVaults[0]?.id ?? null;
  const activeVault = orgVaults.find((v) => v.id === activeId) ?? null;

  let items: VaultItem[] = [];
  if (activeId && (folder === "org" || folder === "uploads")) {
    try {
      items = await api.vaults.listItems(activeId);
    } catch {
      items = [];
    }
  }
  const fileItems = items.filter((it) => it.kind === "FILE");
  const docItems = items.filter((it) => it.kind !== "FILE");

  let graph: TwinGraphData = { nodes: [], edges: [] };
  if (folder === null || folder === "roles") {
    try {
      graph = await api.twin.graph();
    } catch {
      graph = { nodes: [], edges: [] };
    }
  }

  async function createVault(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      redirect(
        `/vaults?folder=org&flashType=err&flash=${encodeURIComponent("Name required")}`,
      );
    }
    const description = String(formData.get("description") ?? "").trim();
    const api = makeApi(await requestCookie());
    try {
      const v = await api.vaults.create({
        name,
        description: description || undefined,
      });
      revalidatePath("/vaults");
      redirect(`/vaults?folder=org&vault=${v.id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(`/vaults?folder=org&flashType=err&flash=${encodeURIComponent(msg)}`);
    }
  }

  async function addItem(formData: FormData) {
    "use server";
    const vaultId = String(formData.get("vault_id") ?? "");
    const kind = String(formData.get("kind") ?? "TEXT") as VaultItem["kind"];
    const content = String(formData.get("content") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    if (!vaultId || !content) {
      redirect(
        `/vaults?folder=org&vault=${vaultId}&flashType=err&flash=${encodeURIComponent("Content required")}`,
      );
    }
    const api = makeApi(await requestCookie());
    try {
      await api.vaults.addItem(vaultId, {
        kind,
        content,
        title: title || undefined,
      });
      revalidatePath("/vaults");
      redirect(`/vaults?folder=org&vault=${vaultId}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(
        `/vaults?folder=org&vault=${vaultId}&flashType=err&flash=${encodeURIComponent(msg)}`,
      );
    }
  }

  async function deleteVault(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const api = makeApi(await requestCookie());
    try {
      await api.vaults.remove(id);
      revalidatePath("/vaults");
      redirect(
        "/vaults?folder=org&flashType=ok&flash=" +
          encodeURIComponent("Vault deleted"),
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(`/vaults?folder=org&flashType=err&flash=${encodeURIComponent(msg)}`);
    }
  }

  // ── Hub landing — the folder grid ──────────────────────────────────────────
  if (folder === null) {
    const orgItemTotal = orgVaults.length;
    const roleCount = graph.nodes.length;
    return (
      <>
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        {error && (
          <div className="mb-6">
            <ErrorState error={error} />
          </div>
        )}
        {sp.flash && <Flash type={sp.flashType ?? "ok"} message={sp.flash} />}
        <CardGrid>
          <VaultFolderCard
            href="/vaults?folder=org"
            icon={Building2}
            title={t("orgTitle")}
            description={t("orgDesc")}
            count={orgItemTotal}
          />
          <VaultFolderCard
            href="/vaults?folder=roles"
            icon={Network}
            title={t("rolesTitle")}
            description={t("rolesDesc")}
            count={roleCount}
          />
          <VaultFolderCard
            href="/vaults?folder=integrations"
            icon={Plug}
            title={t("integrationsTitle")}
            description={t("integrationsDesc")}
            comingSoon
            comingSoonLabel={t("comingSoon")}
          />
          <VaultFolderCard
            href="/vaults?folder=uploads"
            icon={Upload}
            title={t("uploadsTitle")}
            description={t("uploadsDesc")}
          />
        </CardGrid>
      </>
    );
  }

  // ── Folder views ───────────────────────────────────────────────────────────
  const folderTitle = {
    org: t("orgTitle"),
    roles: t("rolesTitle"),
    integrations: t("integrationsTitle"),
    uploads: t("uploadsTitle"),
  }[folder];
  const folderSubtitle = {
    org: t("orgDesc"),
    roles: t("rolesDesc"),
    integrations: t("integrationsDesc"),
    uploads: t("uploadsDesc"),
  }[folder];

  return (
    <>
      {/* Register the folder label in the topbar breadcrumb ("Kontext-Tresor > Rollen") */}
      <VaultFolderBreadcrumb label={folderTitle ?? ""} />
      <PageHeader
        title={folderTitle}
        subtitle={folderSubtitle}
        actions={
          <Button asChild variant="ghost" size="sm">
            <a href="/vaults">{t("backToHub")}</a>
          </Button>
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}
      {sp.flash && <Flash type={sp.flashType ?? "ok"} message={sp.flash} />}

      {folder === "roles" && (
        <div className="flex flex-col gap-4">
          {graph.nodes.length === 0 ? (
            <Card className="p-2">
              <EmptyState icon={Network} title={t("rolesEmpty")} />
            </Card>
          ) : (
            <TwinGraph data={graph} emptyLabel={t("rolesEmpty")} />
          )}
        </div>
      )}

      {folder === "integrations" && (
        <Card className="items-start gap-4 p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-ui border border-line bg-surface-2 text-fg-muted">
            <Plug size={20} aria-hidden />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold tracking-[-0.01em] text-fg">
                {t("integrationsTitle")}
              </h3>
              <Badge variant="secondary">{t("comingSoon")}</Badge>
            </div>
            <p className="mt-1 max-w-prose text-[length:var(--text-body-sm)] leading-relaxed text-fg-muted">
              {t("integrationsHubNote")}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <a href="/integrations">{t("integrationsOpen")}</a>
          </Button>
        </Card>
      )}

      {folder === "uploads" && (
        <UploadsView items={fileItems} emptyLabel={t("uploadsEmpty")} />
      )}

      {folder === "org" && (
        <div className="flex flex-col gap-6">
          {/* Full-width vault overview — each vault is its own card */}
          {orgVaults.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={Building2} title={tv("title")} hint={tv("empty")} />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orgVaults.map((v) => {
                const vaultItems = v.id === activeId ? docItems : [];
                return (
                  <Card key={v.id} className="flex flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-fg">{v.name}</p>
                        {v.description && (
                          <p className="mt-0.5 text-[length:var(--text-caption)] text-fg-muted">
                            {v.description}
                          </p>
                        )}
                      </div>
                      {canWrite && (
                        <form action={deleteVault}>
                          <input type="hidden" name="id" value={v.id} />
                          <button
                            type="submit"
                            className="shrink-0 text-[length:var(--text-meta)] text-fg-subtle transition-colors hover:text-danger"
                          >
                            {tv("delete")}
                          </button>
                        </form>
                      )}
                    </div>
                    {v.id === activeId && docItems.length > 0 && (
                      <ul className="divide-y divide-line-subtle rounded-ui border border-line">
                        {docItems.slice(0, 3).map((it) => (
                          <li key={it.id} className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <DataChip tone="neutral" mono>{it.kind}</DataChip>
                              {it.title && (
                                <span className="text-[length:var(--text-body-sm)] font-medium text-fg">
                                  {it.title}
                                </span>
                              )}
                            </div>
                            {it.content && (
                              <p className="mt-1 line-clamp-2 text-[length:var(--text-body-sm)] leading-relaxed text-fg-muted">
                                {it.content}
                              </p>
                            )}
                          </li>
                        ))}
                        {docItems.length > 3 && (
                          <li className="px-4 py-2 text-[length:var(--text-caption)] text-fg-muted">
                            + {docItems.length - 3} weitere Einträge
                          </li>
                        )}
                      </ul>
                    )}
                    <Button asChild variant="ghost" size="sm" className="self-start text-fg-muted">
                      <a href={`/vaults?folder=org&vault=${v.id}`}>Einträge ansehen</a>
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Add new content — inline form, no separate create-vault panel */}
          {canWrite && activeId && activeVault && (
            <Card variant="ledger" className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-6 py-4">
                <span className="text-[length:var(--text-body-sm)] font-medium text-fg">
                  {activeVault.name} — {tv("entriesCount", { count: docItems.length })}
                </span>
              </div>
              <form
                action={addItem}
                className="space-y-2 px-6 py-4"
              >
                <input type="hidden" name="vault_id" value={activeId} />
                <div className="flex gap-2">
                  <div className="w-32 shrink-0">
                    <Select name="kind" defaultValue="TEXT" size="sm" aria-label={tv("kindText")}>
                      <option value="TEXT">{tv("kindText")}</option>
                      <option value="URL">{tv("kindUrl")}</option>
                    </Select>
                  </div>
                  <Input name="title" placeholder={tv("titlePlaceholder")} className="flex-1" />
                </div>
                <Textarea name="content" placeholder={tv("contentPlaceholder")} rows={3} required />
                <Button type="submit" className="self-start">{tv("addEntry")}</Button>
              </form>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

/** Read-only list of FILE-kind vault items (uploaded documents). */
function UploadsView({
  items,
  emptyLabel,
}: {
  items: VaultItem[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <Card className="p-2">
        <EmptyState icon={Upload} title={emptyLabel} />
      </Card>
    );
  }
  return (
    <Card variant="ledger" className="overflow-hidden">
      <ul className="divide-y divide-line-subtle">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 px-6 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui border border-line bg-surface-2 text-fg-muted">
              <Upload size={16} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[length:var(--text-body-sm)] font-medium text-fg">
                {it.title ?? it.id}
              </p>
              {it.mime && (
                <p className="truncate text-[length:var(--text-caption)] text-fg-subtle">
                  {it.mime}
                </p>
              )}
            </div>
            {typeof it.byte_size === "number" && (
              <span className="shrink-0 text-[length:var(--text-meta)] tabular-nums text-fg-subtle">
                {formatBytes(it.byte_size)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Map known English backend errors to German. */
function translateFlash(msg: string): string {
  const map: Record<string, string> = {
    "content must be a valid URL for URL items": "Der Inhalt muss eine gültige URL sein (z. B. https://example.com).",
    "Name required": "Name ist erforderlich.",
    "Content required": "Inhalt ist erforderlich.",
    "Vault deleted": "Tresor wurde gelöscht.",
  };
  return map[msg] ?? msg;
}

function Flash({ type, message }: { type: "ok" | "err"; message: string }) {
  const Icon = type === "ok" ? CheckCircle2 : TriangleAlert;
  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex items-start gap-3 rounded-ui border px-3.5 py-3 text-[length:var(--text-meta)]",
        type === "ok"
          ? "border-success/20 bg-success-soft text-fg"
          : "border-danger/22 bg-danger-soft text-danger",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          type === "ok" ? "text-success" : "text-danger",
        )}
      />
      <p className="leading-snug">{translateFlash(message)}</p>
    </div>
  );
}
