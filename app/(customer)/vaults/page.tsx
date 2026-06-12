import { getTranslations } from "next-intl/server";
import { CheckCircle2, Search, TriangleAlert } from "lucide-react";

import {
  makeApi,
  type VaultItem,
  type VaultSection,
  type VaultView,
  type TwinRole,
  type Employee,
  type OrgInterviewRow,
} from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { VaultFolderBreadcrumb } from "@/components/vaults/VaultFolderBreadcrumb";
import { VaultAddButton } from "@/components/vaults/VaultAddButton";
import { VaultIntegrationsTab } from "@/components/vaults/VaultIntegrationsTab";
import { VaultRolesTab } from "@/components/vaults/VaultRolesTab";
import { VaultSearchDialog } from "@/components/vaults/VaultSearchDialog";
import { VaultSectionGrid } from "@/components/vaults/VaultOrgSuggestions";
import { cn } from "@/lib/utils";

type Folder = "org" | "roles" | "integrations";
const FOLDERS: Folder[] = ["org", "roles", "integrations"];

interface SearchParams {
  folder?: string;
  flash?: string;
  flashType?: "ok" | "err";
}

// WHY-115: Kontext-Vault hub. ONE vault per org + typed sections. Single tabbed
// page — tabs at TOP. The hub renders an identical layout for a brand-new org
// (the 6 seeded CONTEXT sections, each empty) and a fully loaded one.
export default async function KontextVaultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { me } = await requireUser();
  const sp = await searchParams;
  const t = await getTranslations("vaultHub");
  const api = makeApi(await requestCookie());
  const canWrite = me.role === "ORG_OWNER";

  // Default to "org" tab when no folder param given.
  const folder: Folder = (FOLDERS as string[]).includes(sp.folder ?? "")
    ? (sp.folder as Folder)
    : "org";

  // The vault always exists + always carries its sections (even when empty).
  let vault: VaultView | null = null;
  let error: unknown = null;
  try {
    vault = await api.vault.get();
  } catch (e) {
    error = e;
  }

  // The org folder lists CONTEXT sections (the 6 seeded + any custom, incl.
  // converted ex-campaign sections, mig 049). ROLE sections have their own tab.
  const contextSections: VaultSection[] = (vault?.sections ?? [])
    .filter((s) => s.kind === "CONTEXT")
    .sort((a, b) => a.position - b.position);

  // Fetch a few top items per CONTEXT section for the card previews. Only when
  // the org folder is active (the roles/integrations tabs don't need them).
  const itemsBySection: Record<string, VaultItem[]> = {};
  if (folder === "org") {
    await Promise.all(
      contextSections.map(async (section) => {
        try {
          itemsBySection[section.id] = await api.vault.items.list(section.id);
        } catch {
          itemsBySection[section.id] = [];
        }
      }),
    );
  }

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

  // ── Tab labels + counts ─────────────────────────────────────────────────────
  const tabs: { id: Folder; label: string; count?: number; comingSoon?: boolean }[] = [
    { id: "org",          label: t("orgTitle"),           count: contextSections.length },
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
            {/* Kontext durchsuchen — org-wide vault search */}
            <VaultSearchDialog
              trigger={
                <Button variant="outline" size="sm" className="h-[36px] gap-1.5">
                  <Search size={14} aria-hidden />
                  Durchsuchen
                </Button>
              }
            />
            {/* Bereich hinzufügen (⌘K) — ALWAYS visible (org folder, owners). */}
            {canWrite && folder === "org" && <VaultAddButton />}
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

      {folder === "integrations" && <VaultIntegrationsTab />}

      {folder === "org" && (
        <VaultSectionGrid
          sections={contextSections}
          itemsBySection={itemsBySection}
          canWrite={canWrite}
        />
      )}
    </>
  );
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
