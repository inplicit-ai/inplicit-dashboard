"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Command, FolderKanban, FolderOpen, Network, Plug } from "lucide-react";
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
import type { Vault, VaultItem } from "@/lib/api";

/* ────────────────────────────────────────────────────────────────────────────
 * VaultHub — the search-first Context-Vault hub (F1).
 *
 * Layout: search box → drag-drop upload zone → collection filter chips →
 * item cards. Owns the active vault + active collection, and re-fetches items
 * (via the /dapi proxy) whenever an upload/quick-add completes.
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

  // F2 — Cmd+K palette + peek panel state. Imperative refs let the palette
  // drive the search / upload surfaces without lifting their internal state.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [peekItem, setPeekItem] = useState<VaultItem | null>(null);
  const searchRef = useRef<VaultSearchHandle>(null);
  const dropzoneRef = useRef<VaultDropzoneHandle>(null);

  const refresh = useCallback(async () => {
    if (!vaultId) return;
    setItems(await fetchItems(vaultId));
  }, [vaultId]);

  // Global Cmd/Ctrl+K opens the palette.
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

  // Reflect the re-indexed item back into the list + the open peek panel.
  const onItemReindexed = useCallback((next: VaultItem) => {
    setItems((prev) => prev.map((i) => (i.id === next.id ? next : i)));
    setPeekItem((cur) => (cur && cur.id === next.id ? next : cur));
  }, []);

  // Switch the active vault and pull its items. Done in the change handler
  // (not an effect) so the fetch fires only on real user intent.
  const selectVault = useCallback(async (next: string | null) => {
    setVaultId(next);
    setItems(next ? await fetchItems(next) : []);
  }, []);

  const fileItems = useMemo(
    () => items.filter((i) => i.kind === "FILE"),
    [items],
  );

  const collections: Collection[] = [
    { key: "all", label: t("collAll"), count: items.length },
    { key: "uploads", label: t("collUploads"), count: fileItems.length },
    {
      key: "roles",
      label: t("collRoles"),
      count: roleCount,
    },
    {
      key: "integrations",
      label: t("collIntegrations"),
      disabled: true,
      comingSoonLabel: t("comingSoon"),
    },
  ];

  const visibleItems = collection === "uploads" ? fileItems : items;

  // Palette action handlers — map a chosen command to a concrete side effect.
  const navigate = useCallback(
    (key: "all" | "uploads" | "roles") => setCollection(key),
    [],
  );
  const triggerUploadFile = useCallback(
    () => dropzoneRef.current?.openFilePicker(),
    [],
  );
  const triggerAddUrl = useCallback(
    () => dropzoneRef.current?.openQuickAdd("url"),
    [],
  );
  const triggerAddText = useCallback(
    () => dropzoneRef.current?.openQuickAdd("text"),
    [],
  );
  const triggerSearch = useCallback(
    (query: string) => searchRef.current?.runSearch(query),
    [],
  );

  if (vaults.length === 0) {
    return (
      <Card className="p-2">
        <EmptyState icon={FolderOpen} title={t("title")} hint={t("subtitle")} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vault picker (only when more than one ORG vault exists) */}
      {vaults.length > 1 && (
        <div className="w-full max-w-xs">
          <Select
            aria-label={t("selectVault")}
            value={vaultId ?? ""}
            onValueChange={(v) => void selectVault(v || null)}
          >
            {vaults.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Cmd+K affordance */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPaletteOpen(true)}
          aria-keyshortcuts="Meta+K Control+K"
        >
          <Command className="h-4 w-4" aria-hidden />
          {t("cmdOpen")}
          <kbd className="ml-1 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[length:var(--text-caption)] font-medium text-fg-subtle">
            {t("cmdShortcut")}
          </kbd>
        </Button>
      </div>

      {/* (a) Search */}
      <VaultSearchBox vaultId={vaultId} ref={searchRef} />

      {/* (b) Upload zone */}
      <VaultDropzone
        vaultId={vaultId}
        onChanged={() => void refresh()}
        ref={dropzoneRef}
      />

      {/* (c) Collection filter chips */}
      <VaultCollections
        collections={collections}
        active={collection}
        onSelect={(k) => setCollection(k as CollectionKey)}
      />

      {/* (d) Items / deep-link panels */}
      {collection === "roles" ? (
        <Card className="p-2">
          <EmptyState
            icon={Network}
            title={t("rolesTitle")}
            hint={t("rolesDesc")}
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/twin">{t("rolesTitle")}</Link>
              </Button>
            }
          />
        </Card>
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
      ) : (
        <div className="space-y-2">
          {/* Pinned virtual "Kampagnen" entry — always visible, links to /campaigns */}
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
          {visibleItems.length === 0 && collection === "uploads" && (
            <Card className="p-2">
              <EmptyState icon={FolderOpen} title={t("itemsEmpty")} />
            </Card>
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

      {/* F2 (a) — Cmd+K command palette */}
      <VaultCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onUploadFile={triggerUploadFile}
        onAddUrl={triggerAddUrl}
        onAddText={triggerAddText}
        onSearch={triggerSearch}
        onNavigate={navigate}
      />

      {/* F2 (b) — calm slide-in peek panel */}
      <VaultPeekPanel
        item={peekItem}
        vaultId={vaultId}
        onClose={() => setPeekItem(null)}
        onReindexed={onItemReindexed}
      />
    </div>
  );
}
