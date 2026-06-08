import { getTranslations } from "next-intl/server";
import {
  Building2,
  CheckCircle2,
  Search,
  TriangleAlert,
} from "lucide-react";

import {
  makeApi,
  type Vault,
  type VaultItem,
  type TwinRole,
  type Employee,
  type OrgInterviewRow,
} from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VaultFolderBreadcrumb } from "@/components/vaults/VaultFolderBreadcrumb";
import { VaultAddButton } from "@/components/vaults/VaultAddButton";
import { VaultItemRow } from "@/components/vaults/VaultItemRow";
import { VaultIntegrationsTab } from "@/components/vaults/VaultIntegrationsTab";
import { VaultRolesTab } from "@/components/vaults/VaultRolesTab";
import { VaultCardMenu } from "@/components/vaults/VaultCardMenu";
import { VaultSearchDialog } from "@/components/vaults/VaultSearchDialog";
import { cn } from "@/lib/utils";

type Folder = "org" | "roles" | "integrations";
const FOLDERS: Folder[] = ["org", "roles", "integrations"];

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

  let items: VaultItem[] = [];
  if (activeId && folder === "org") {
    try {
      items = await api.vaults.listItems(activeId);
    } catch {
      items = [];
    }
  }
  const docItems = items.filter((it) => it.kind !== "FILE");

  // Always fetch roles — used both for count badge and Rollen view.
  let roles: TwinRole[] = [];
  try {
    roles = await api.twin.listRoles();
  } catch {
    roles = [];
  }

  // Fetch employees + org interviews for the Rollen tab.
  let employees: Employee[] = [];
  let orgInterviews: OrgInterviewRow[] = [];
  if (folder === "roles") {
    try {
      employees = await api.employees.list();
    } catch {
      employees = [];
    }
    try {
      orgInterviews = await api.org.interviews();
    } catch {
      orgInterviews = [];
    }
  }

  // All vaults for cross-vault search (org + role vaults).
  const allSearchableVaults = vaults.map((v) => ({ id: v.id, name: v.name }));

  // ── Tab labels + counts ─────────────────────────────────────────────────────
  const tabs: { id: Folder; label: string; count?: number; comingSoon?: boolean }[] = [
    { id: "org",          label: t("orgTitle"),           count: orgVaults.length },
    { id: "roles",        label: t("rolesTitle"),         count: roles.length },
    { id: "integrations", label: t("integrationsTitle") },
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
            {/* Kontext durchsuchen — inline vault search */}
            <VaultSearchDialog
              vaults={allSearchableVaults}
              trigger={
                <Button variant="outline" size="sm" className="h-[36px] gap-1.5">
                  <Search size={14} aria-hidden />
                  Durchsuchen
                </Button>
              }
            />
            {/* Kontext hinzufügen (⌘K) */}
            {activeId && (
              <VaultAddButton
                vaultId={activeId}
              />
            )}
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
        <VaultRolesTab
          roles={roles}
          employees={employees}
          orgInterviews={orgInterviews}
          emptyLabel={t("rolesEmpty")}
        />
      )}

      {folder === "integrations" && (
        <VaultIntegrationsTab vaultId={activeId} />
      )}

      {folder === "org" && (
        <OrgView
          orgVaults={orgVaults}
          activeId={activeId}
          docItems={docItems}
          canWrite={canWrite}
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
  tv,
}: {
  orgVaults: Vault[];
  activeId: string | null;
  docItems: VaultItem[];
  canWrite: boolean;
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
                <VaultCardMenu
                  vaultId={v.id}
                  vaultName={v.name}
                  vaultDescription={v.description}
                />
              )}
            </div>

            {/* Item list with 3-dot menus + summary */}
            {vaultItems.length > 0 && (
              <ul className="divide-y divide-line-subtle rounded-ui border border-line">
                {vaultItems.slice(0, 5).map((it) => (
                  <VaultItemRow
                    key={it.id}
                    item={it}
                    vaultId={v.id}
                  />
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
void formatBytes; // used by UploadsView (retained for future use)

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
