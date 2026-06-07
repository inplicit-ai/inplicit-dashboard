"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  FileText,
  FolderKanban,
  FolderOpen,
  Loader2,
  Network,
  Plug,
  Plus,
  Tag,
  Upload,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  VaultSearchBox,
  type VaultSearchHandle,
} from "@/components/vaults/VaultSearchBox";
import {
  VaultDropzone,
  type VaultDropzoneHandle,
} from "@/components/vaults/VaultDropzone";
import { VaultItemCard } from "@/components/vaults/VaultItemCard";
import { VaultCollections, type Collection } from "@/components/vaults/VaultCollections";
import { VaultCommandPalette } from "@/components/vaults/VaultCommandPalette";
import { VaultPeekPanel } from "@/components/vaults/VaultPeekPanel";
import { IndexStatusPill } from "@/components/vaults/IndexStatusPill";
import { clientApi } from "@/lib/client-api";
import { useVaultUpload } from "@/lib/vaults/upload";
import type { TwinRole, Vault, VaultItem } from "@/lib/api";

/* ────────────────────────────────────────────────────────────────────────────
 * VaultHub — the search-first Context-Vault hub (F1).
 * ────────────────────────────────────────────────────────────────────────── */

type CollectionKey = "all" | "uploads" | "roles" | "integrations";

async function fetchItems(vaultId: string): Promise<VaultItem[]> {
  const res = await fetch(`/dapi/orgs/me/vaults/${vaultId}/items`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as VaultItem[];
}

export function VaultHub({
  vaults,
  initialVaultId,
  initialItems,
  roleCount,
  integrationsHref,
}: {
  vaults: Vault[];
  initialVaultId: string | null;
  initialItems: VaultItem[];
  roleCount: number;
  integrationsHref: string;
}) {
  const t = useTranslations("vaultHub");
  const [vaultId, setVaultId] = useState<string | null>(initialVaultId);
  const [items, setItems] = useState<VaultItem[]>(initialItems);
  const [collection, setCollection] = useState<CollectionKey>("all");

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [peekItem, setPeekItem] = useState<VaultItem | null>(null);
  const searchRef = useRef<VaultSearchHandle>(null);
  const dropzoneRef = useRef<VaultDropzoneHandle>(null);

  const refresh = useCallback(async () => {
    if (!vaultId) return;
    setItems(await fetchItems(vaultId));
  }, [vaultId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onItemReindexed = useCallback((next: VaultItem) => {
    setItems((prev) => prev.map((i) => (i.id === next.id ? next : i)));
    setPeekItem((cur) => (cur && cur.id === next.id ? next : cur));
  }, []);

  const selectVault = useCallback(async (next: string | null) => {
    setVaultId(next);
    setItems(next ? await fetchItems(next) : []);
  }, []);

  const fileItems = useMemo(() => items.filter((i) => i.kind === "FILE"), [items]);

  const collections: Collection[] = [
    { key: "all", label: t("collAll"), count: items.length },
    { key: "uploads", label: t("collUploads"), count: fileItems.length },
    { key: "roles", label: t("collRoles"), count: roleCount },
    {
      key: "integrations",
      label: t("collIntegrations"),
      disabled: true,
      comingSoonLabel: t("comingSoon"),
    },
  ];

  const visibleItems = collection === "uploads" ? fileItems : items;

  const navigate = useCallback(
    (key: "all" | "uploads" | "roles") => setCollection(key),
    [],
  );
  const triggerUploadFile = useCallback(() => dropzoneRef.current?.openFilePicker(), []);
  const triggerAddUrl = useCallback(() => dropzoneRef.current?.openQuickAdd("url"), []);
  const triggerAddText = useCallback(() => dropzoneRef.current?.openQuickAdd("text"), []);
  const triggerSearch = useCallback((query: string) => searchRef.current?.runSearch(query), []);

  if (vaults.length === 0) {
    return (
      <Card className="p-2">
        <EmptyState icon={FolderOpen} title={t("title")} hint={t("subtitle")} />
      </Card>
    );
  }

  const isItemsEmpty = visibleItems.length === 0;

  return (
    <div className="space-y-6">
      {/* Vault picker */}
      {vaults.length > 1 && (
        <div className="w-full max-w-xs">
          <Select
            aria-label={t("selectVault")}
            value={vaultId ?? ""}
            onValueChange={(v) => void selectVault(v || null)}
          >
            {vaults.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </Select>
        </div>
      )}

      {/* Search — always visible, searches this vault */}
      <VaultSearchBox vaultId={vaultId} ref={searchRef} />

      {/* Collection filter chips */}
      <VaultCollections
        collections={collections}
        active={collection}
        onSelect={(k) => setCollection(k as CollectionKey)}
      />

      {/* Content area */}
      {collection === "roles" ? (
        <RolesCollectionView />
      ) : collection === "integrations" ? (
        <Card className="p-2">
          <EmptyState
            icon={Plug}
            title={t("integrationsTitle")}
            hint={t("integrationsHubNote")}
            action={
              <Button asChild variant="outline" size="sm">
                <Link href={integrationsHref}>{t("integrationsOpen")}</Link>
              </Button>
            }
          />
        </Card>
      ) : isItemsEmpty ? (
        /* Empty state: show the full drag-drop zone prominently */
        <VaultDropzone
          vaultId={vaultId}
          onChanged={() => void refresh()}
          ref={dropzoneRef}
        />
      ) : (
        /* Items exist: compact add button + item list */
        <div className="space-y-3">
          {/* Compact add row — replaces the big dropzone when items exist */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => dropzoneRef.current?.openFilePicker()}
            >
              <Upload className="h-4 w-4" />
              Datei hochladen
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dropzoneRef.current?.openQuickAdd("url")}
            >
              URL hinzufügen
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dropzoneRef.current?.openQuickAdd("text")}
            >
              Text hinzufügen
            </Button>
          </div>

          {/* Hidden dropzone (still provides upload machinery + quick-add forms) */}
          <div className="hidden">
            <VaultDropzone
              vaultId={vaultId}
              onChanged={() => void refresh()}
              ref={dropzoneRef}
            />
          </div>

          {/* Pinned "Kampagnen" virtual entry */}
          {collection !== "uploads" && (
            <Link
              href="/campaigns"
              className="flex items-center gap-3 rounded-ui border border-line bg-surface p-3 text-[length:var(--text-body-sm)] text-fg transition-colors hover:bg-surface-2"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ui bg-surface-2 text-fg-muted">
                <FolderKanban size={15} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-fg">Kampagnen</p>
                <p className="truncate text-[length:var(--text-meta)] text-fg-muted">
                  Alle laufenden und abgeschlossenen Kampagnen
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[length:var(--text-caption)] text-fg-subtle">
                Intern
              </span>
            </Link>
          )}

          {visibleItems.map((item) => (
            <VaultItemCard
              key={item.id}
              item={item}
              kindLabel={
                item.kind === "FILE"
                  ? t("kindFile")
                  : item.kind === "URL"
                    ? t("kindUrl")
                    : t("kindText")
              }
              indexedLabel={t("indexed")}
              indexingLabel={t("indexing")}
              onOpen={() => setPeekItem(item)}
              openLabel={t("peekOpen")}
            />
          ))}
        </div>
      )}

      {/* Cmd+K command palette */}
      <VaultCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onUploadFile={triggerUploadFile}
        onAddUrl={triggerAddUrl}
        onAddText={triggerAddText}
        onSearch={triggerSearch}
        onNavigate={navigate}
      />

      {/* Peek panel */}
      <VaultPeekPanel
        item={peekItem}
        vaultId={vaultId}
        onClose={() => setPeekItem(null)}
        onReindexed={onItemReindexed}
      />
    </div>
  );
}

/* ─── Rollen collection view ─────────────────────────────────────────────── */

/**
 * Shows org roles from the twin API. Each role can have context files uploaded
 * (job descriptions, taxonomies). Department grouping is shown once the backend
 * adds `department` to TwinRole.
 *
 * NOTE: Department/team tags and CSV role import need a backend update.
 * What works today: list roles, upload context files per role, create roles manually.
 */
function RolesCollectionView() {
  const [roles, setRoles] = useState<TwinRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    clientApi.twin.listRoles()
      .then((r) => setRoles(r))
      .catch(() => setError("Rollen konnten nicht geladen werden."))
      .finally(() => setLoading(false));
  }, []);

  async function createRole() {
    if (!newRoleName.trim()) return;
    setCreating(true);
    try {
      const role = await clientApi.twin.createRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || undefined,
        source: "MANUAL",
      });
      setRoles((prev) => [...prev, role]);
      setNewRoleName("");
      setNewRoleDesc("");
      setShowCreate(false);
    } catch {
      setError("Rolle konnte nicht erstellt werden.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-fg-subtle">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-[length:var(--text-body-sm)]">Lade Rollen…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-[length:var(--text-body-sm)] text-fg-muted">
          {roles.length === 0
            ? "Noch keine Rollen angelegt."
            : `${roles.length} Rolle${roles.length !== 1 ? "n" : ""}`}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreate((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            Neue Rolle
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-[length:var(--text-meta)] text-danger">{error}</p>
      )}

      {/* Create role form */}
      {showCreate && (
        <Card className="p-4">
          <div className="flex flex-col gap-3">
            <p className="text-[length:var(--text-body-sm)] font-semibold text-fg">
              Neue Rolle anlegen
            </p>
            <input
              type="text"
              placeholder="Rolle (z. B. CTO, Engineering Manager)"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void createRole()}
              className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
            />
            <input
              type="text"
              placeholder="Beschreibung (optional)"
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
              className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
            />
            <p className="text-[length:var(--text-caption)] text-fg-muted">
              Abteilungs-Tags und CSV-Import für Rollen folgen mit dem nächsten Backend-Update.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void createRole()} disabled={creating || !newRoleName.trim()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Erstellen
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Roles list */}
      {roles.length === 0 && !showCreate ? (
        <Card className="p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-fg">Noch keine Rollen</p>
              <p className="mt-1 max-w-[38ch] text-[length:var(--text-body-sm)] text-fg-muted">
                Lege Rollen an (z. B. CTO, Engineering Manager) und lade rollenspezifischen
                Kontext hoch — Jobbeschreibungen, Arbeitsverträge, Taxonomien.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            expanded={expandedRole === role.id}
            onToggle={() => setExpandedRole((v) => (v === role.id ? null : role.id))}
          />
        ))
      )}
    </div>
  );
}

/* ─── Single role card ───────────────────────────────────────────────────── */

function RoleCard({
  role,
  expanded,
  onToggle,
}: {
  role: TwinRole;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [vault, setVault] = useState<Vault | null>(null);
  const [roleItems, setRoleItems] = useState<VaultItem[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async (vaultId: string) => {
    const list = await clientApi.vaults.listItems(vaultId);
    setRoleItems(list);
  }, []);

  const { tasks, uploadMany } = useVaultUpload(
    vault?.id ?? null,
    () => { if (vault?.id) void refresh(vault.id); },
  );

  // Load role vault on expand
  useEffect(() => {
    if (!expanded) return;
    setLoadingVault(true);
    clientApi.vaults.listForRole(role.id)
      .then(async (list) => {
        const v = list[0] ?? null;
        setVault(v);
        if (v) await refresh(v.id);
      })
      .catch(() => {})
      .finally(() => setLoadingVault(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, role.id]);

  async function ensureVaultAndUpload(files: FileList) {
    let v = vault;
    if (!v) {
      v = await clientApi.vaults.create({
        scope: "ROLE",
        role_id: role.id,
        name: `${role.name} – Kontext`,
      });
      setVault(v);
    }
    uploadMany(Array.from(files));
  }

  return (
    <Card className="overflow-hidden">
      {/* Role header row */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-ui bg-surface-2 text-fg-muted">
            <Building2 size={13} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[length:var(--text-body-sm)] font-medium text-fg">
              {role.name}
            </p>
            {role.description && (
              <p className="truncate text-[length:var(--text-meta)] text-fg-muted">
                {role.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Source tag */}
          <span className={`rounded-full px-2 py-0.5 text-[length:var(--text-caption)] ${
            role.source === "MANUAL"
              ? "bg-surface-2 text-fg-subtle"
              : "bg-success/10 text-success"
          }`}>
            {role.source === "MANUAL" ? "Manuell" : role.source === "ESCO" ? "ESCO" : "KI"}
          </span>
          {role.has_validated && (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[length:var(--text-caption)] text-success">
              <Check size={10} className="inline" /> Validiert
            </span>
          )}
          <Tag size={13} className={`text-fg-muted transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      {/* Expanded: context files */}
      {expanded && (
        <div className="border-t border-line-subtle px-4 py-3">
          {loadingVault ? (
            <div className="flex items-center gap-2 text-fg-subtle">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-[length:var(--text-meta)]">Lade Kontext…</span>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
                Rollenspezifischer Kontext
              </p>
              <p className="text-[length:var(--text-meta)] text-fg-muted">
                Lade Jobbeschreibungen, Arbeitsverträge oder Taxonomien hoch. Diese
                werden beim Interview als Kontext für diese Rolle verwendet.
              </p>

              {/* Existing items */}
              {roleItems.length > 0 && (
                <ul className="space-y-1.5">
                  {roleItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-ui border border-line-subtle bg-surface-2 px-3 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText size={13} className="shrink-0 text-fg-subtle" />
                        <span className="truncate text-[length:var(--text-body-sm)] text-fg">
                          {item.title ?? "Unbenannte Datei"}
                        </span>
                      </span>
                      <IndexStatusPill
                        embedded={item.embedded}
                        indexedLabel="Indexiert"
                        indexingLabel="Indexierung…"
                      />
                    </li>
                  ))}
                </ul>
              )}

              {/* Upload tasks */}
              {tasks.length > 0 && (
                <ul className="space-y-1.5">
                  {tasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-2 rounded-ui border border-line-subtle bg-surface-2 px-3 py-2">
                      <Loader2 size={13} className="shrink-0 animate-spin text-fg-subtle" />
                      <span className="truncate text-[length:var(--text-body-sm)] text-fg">{task.filename}</span>
                      <span className="ml-auto text-[length:var(--text-meta)] text-fg-subtle">{task.phase}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Drop zone for role files */}
              <div
                className="flex items-center justify-center gap-3 rounded-card border-2 border-dashed border-line px-4 py-5 transition-colors hover:border-line-strong hover:bg-surface-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files.length) void ensureVaultAndUpload(e.dataTransfer.files);
                }}
              >
                <Upload size={15} className="shrink-0 text-fg-muted" />
                <span className="text-[length:var(--text-body-sm)] text-fg-muted">
                  Dateien hier ablegen oder
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) void ensureVaultAndUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Datei auswählen
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
