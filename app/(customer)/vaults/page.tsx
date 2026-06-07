import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Building2,
  CheckCircle2,
  Network,
  Plug,
  Search,
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
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TwinGraph } from "@/components/ctsim/TwinGraph";
import { VaultFolderBreadcrumb } from "@/components/vaults/VaultFolderBreadcrumb";
import { VaultAddButton } from "@/components/vaults/VaultAddButton";
import { cn } from "@/lib/utils";

type Folder = "org" | "roles" | "integrations" | "uploads";
const FOLDERS: Folder[] = ["org", "roles", "integrations", "uploads"];

interface SearchParams {
  folder?: string;
  vault?: string;
  flash?: string;
  flashType?: "ok" | "err";
}

// WHY-115: Kontext-Vault hub. Single tabbed page — tabs at TOP.
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

  // Default to "org" tab when no folder param given.
  const folder: Folder = (FOLDERS as string[]).includes(sp.folder ?? "")
    ? (sp.folder as Folder)
    : "org";

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
  if (folder === "roles") {
    try {
      graph = await api.twin.graph();
    } catch {
      graph = { nodes: [], edges: [] };
    }
  }

  // ── Server actions ──────────────────────────────────────────────────────────
  async function deleteVault(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const api = makeApi(await requestCookie());
    try {
      await api.vaults.remove(id);
      revalidatePath("/vaults");
      redirect("/vaults?folder=org&flashType=ok&flash=" + encodeURIComponent("Vault gelöscht"));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(`/vaults?folder=org&flashType=err&flash=${encodeURIComponent(msg)}`);
    }
  }

  // ── Tab labels + counts ─────────────────────────────────────────────────────
  const tabs: { id: Folder; label: string; count?: number; comingSoon?: boolean }[] = [
    { id: "org",          label: t("orgTitle"),           count: orgVaults.length },
    { id: "uploads",      label: t("uploadsTitle"),       count: fileItems.length },
    { id: "roles",        label: t("rolesTitle"),         count: graph.nodes.length },
    { id: "integrations", label: t("integrationsTitle"),  comingSoon: true },
  ];

  // ── Layout ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Breadcrumb for subfolder display in topbar */}
      <VaultFolderBreadcrumb label={tabs.find((tb) => tb.id === folder)?.label ?? ""} />

      {/* Header: title + action buttons */}
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <div className="flex items-center gap-2">
            {/* Kontext durchsuchen → Wissens-Chat */}
            <Button asChild variant="outline" size="sm" className="h-[36px] gap-1.5">
              <a href="/chat">
                <Search size={14} aria-hidden />
                Durchsuchen
              </a>
            </Button>
            {/* Kontext hinzufügen (⌘K) — needs an active vaultId */}
            {activeId && <VaultAddButton vaultId={activeId} />}
          </div>
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorState error={error} />
        </div>
      )}
      {sp.flash && <Flash type={sp.flashType ?? "ok"} message={sp.flash} />}

      {/* ── Tab bar — TOP, pill style ───────────────────────────────────────── */}
      <div className="-mt-4 mb-8 overflow-x-auto scrollbar-none">
        <nav
          aria-label="Kontext-Kategorien"
          className="inline-flex items-center gap-1 rounded-ui border border-line-subtle bg-surface-2 p-1"
        >
          {tabs.map((tab) => {
            const active = tab.id === folder;
            return (
              <a
                key={tab.id}
                href={tab.comingSoon ? undefined : `/vaults?folder=${tab.id}`}
                aria-current={active ? "page" : undefined}
                aria-disabled={tab.comingSoon}
                className={cn(
                  "relative flex h-8 items-center whitespace-nowrap rounded-ui px-3.5 text-[length:var(--text-meta)] font-medium transition-colors",
                  active
                    ? "bg-surface text-fg shadow-sm"
                    : tab.comingSoon
                      ? "cursor-default text-fg-faint"
                      : "text-fg-muted hover:text-fg",
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1.5 tabular-nums text-fg-subtle">{tab.count}</span>
                )}
                {tab.comingSoon && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px]">
                    Bald
                  </Badge>
                )}
              </a>
            );
          })}
        </nav>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────────── */}

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
        <OrgView
          orgVaults={orgVaults}
          activeId={activeId}
          docItems={docItems}
          canWrite={canWrite}
          deleteVault={deleteVault}
          tv={tv}
        />
      )}
    </>
  );
}

// ── Org vault grid ────────────────────────────────────────────────────────────
async function OrgView({
  orgVaults,
  activeId,
  docItems,
  canWrite,
  deleteVault,
  tv,
}: {
  orgVaults: Vault[];
  activeId: string | null;
  docItems: VaultItem[];
  canWrite: boolean;
  deleteVault: (fd: FormData) => Promise<void>;
  tv: Awaited<ReturnType<typeof getTranslations<"vaults">>>;
}) {
  if (orgVaults.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={Building2}
          title={tv("title")}
          hint={tv("empty")}
        />
      </Card>
    );
  }

  return (
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

            {/* Item list — max 5, human-readable labels */}
            {vaultItems.length > 0 && (
              <ul className="divide-y divide-line-subtle rounded-ui border border-line">
                {vaultItems.slice(0, 5).map((it) => (
                  <li key={it.id} className="flex items-start gap-2.5 px-3 py-2.5">
                    <span className="mt-0.5 shrink-0 rounded border border-line bg-surface-2 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-fg-subtle">
                      {it.kind}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-fg">
                        {itemLabel(it)}
                      </p>
                      {it.kind === "URL" && it.content && (
                        <p className="truncate text-[11px] text-fg-faint">
                          {it.content}
                        </p>
                      )}
                    </div>
                    {!it.embedded && (
                      <span className="shrink-0 text-[10px] text-fg-faint">
                        indexiert…
                      </span>
                    )}
                  </li>
                ))}
                {vaultItems.length > 5 && (
                  <li className="px-3 py-2 text-[length:var(--text-caption)] text-fg-muted">
                    + {vaultItems.length - 5} weitere
                  </li>
                )}
              </ul>
            )}

            <Button asChild variant="ghost" size="sm" className="self-start text-fg-muted">
              <a href={`/vaults?folder=org&vault=${v.id}`}>
                {vaultItems.length === 0 ? "Einträge ansehen" : tv("entriesCount", { count: vaultItems.length })}
              </a>
            </Button>
          </Card>
        );
      })}
    </div>
  );
}

/** Human-readable label for a VaultItem — never shows raw UUIDs. */
function itemLabel(it: VaultItem): string {
  if (it.title) return it.title;
  if (it.kind === "URL" && it.content) {
    try {
      const u = new URL(it.content);
      const readable = (u.hostname + u.pathname).replace(/\/$/, "");
      return readable.length > 60 ? readable.slice(0, 57) + "…" : readable;
    } catch {
      return it.content.slice(0, 60);
    }
  }
  if (it.kind === "TEXT" && it.content) {
    const snippet = it.content.trim().replace(/\s+/g, " ").slice(0, 60);
    return snippet.length < it.content.trim().length ? snippet + "…" : snippet;
  }
  return it.kind === "FILE" ? "Datei" : "Eintrag";
}

// ── Uploads view ──────────────────────────────────────────────────────────────
function UploadsView({ items, emptyLabel }: { items: VaultItem[]; emptyLabel: string }) {
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
                {it.title ?? itemLabel(it)}
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
      <p className="leading-snug">{message}</p>
    </div>
  );
}
