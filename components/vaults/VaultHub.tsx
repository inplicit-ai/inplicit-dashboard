"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { FolderOpen, Network, Plug } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { VaultSearchBox } from "@/components/vaults/VaultSearchBox";
import { VaultDropzone } from "@/components/vaults/VaultDropzone";
import { VaultItemCard } from "@/components/vaults/VaultItemCard";
import { VaultCollections, type Collection } from "@/components/vaults/VaultCollections";
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

  const refresh = useCallback(async () => {
    if (!vaultId) return;
    setItems(await fetchItems(vaultId));
  }, [vaultId]);

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

      {/* (a) Search */}
      <VaultSearchBox vaultId={vaultId} />

      {/* (b) Upload zone */}
      <VaultDropzone vaultId={vaultId} onChanged={() => void refresh()} />

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
      ) : visibleItems.length === 0 ? (
        <Card className="p-2">
          <EmptyState icon={FolderOpen} title={t("itemsEmpty")} />
        </Card>
      ) : (
        <div className="space-y-2">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
