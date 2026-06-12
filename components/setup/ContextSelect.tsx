"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { clientApi } from "@/lib/client-api";
import type { CampaignDraft, SetupToolCall, VaultSection } from "@/lib/api";
import { PlatePlaceholder } from "./Catalog";

/* ────────────────────────────────────────────────────────────────────────────
 * ContextSelect — the campaign's Kontext selection (mig 049).
 *
 * ALL context lives in the org's single Kontext vault; a campaign never owns
 * context of its own. This selector lists the vault's CONTEXT sections and
 * lets the user deselect the ones that should NOT ground this campaign's
 * interviews. The selection is a catalog field (`contextSectionIds`) written
 * via the same `select_context` patch the agent uses (single reducer, two
 * writers):
 *
 *   - `null` (default) — the WHOLE vault grounds the campaign, including
 *     sections added later. Rendered as every box checked.
 *   - `string[]`       — exactly those sections ground it.
 *
 * New content is uploaded on the Kontext page, never here — the footer links
 * there. (Role-specific uploads below the selector also land in the vault.)
 * ────────────────────────────────────────────────────────────────────────── */

export function ContextSelect({
  draft,
  onPatch,
}: {
  draft: CampaignDraft;
  onPatch: (call: SetupToolCall) => void;
}) {
  const t = useTranslations("setup.catalog");

  const [sections, setSections] = useState<VaultSection[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let alive = true;
    clientApi.vault
      .get()
      .then((vault) => {
        if (!alive) return;
        const context = vault.sections
          .filter((s) => s.kind === "CONTEXT")
          .sort((a, b) => a.position - b.position);
        setSections(context);
      })
      .catch(() => {
        if (alive) setLoadError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loadError) {
    return <PlatePlaceholder>{t("contextLoadError")}</PlatePlaceholder>;
  }
  if (sections === null) {
    return <PlatePlaceholder>{t("contextLoading")}</PlatePlaceholder>;
  }
  if (sections.length === 0) {
    return <PlatePlaceholder>{t("contextEmpty")}</PlatePlaceholder>;
  }

  const allIds = sections.map((s) => s.id);
  const selection = draft.contextSectionIds ?? null;
  const isChecked = (id: string) =>
    selection === null || selection.includes(id);
  const checkedCount = allIds.filter(isChecked).length;

  const toggle = (id: string) => {
    const current =
      selection === null
        ? allIds
        : selection.filter((sid) => allIds.includes(sid));
    const next = current.includes(id)
      ? current.filter((sid) => sid !== id)
      : [...current, id];
    // Everything checked → store null so sections added later stay included.
    const sectionIds = next.length === allIds.length ? null : next;
    onPatch({ tool: "select_context", args: { sectionIds } });
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col">
        {sections.map((section) => (
          <li key={section.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-ui px-1.5 py-2 transition-colors hover:bg-surface-2">
              <Checkbox
                checked={isChecked(section.id)}
                onCheckedChange={() => toggle(section.id)}
                aria-label={section.name}
              />
              <span className="min-w-0 flex-1 truncate text-[length:var(--text-body)] text-fg">
                {section.name}
              </span>
              <span className="shrink-0 tabular-nums text-[length:var(--text-meta)] text-fg-subtle">
                {section.item_count ?? 0}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {checkedCount === 0 && (
        <p className="text-[length:var(--text-meta)] text-warning" role="status">
          {t("contextNoneSelected")}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-line-subtle pt-3">
        <span className="text-[length:var(--text-meta)] text-fg-subtle">
          {selection === null
            ? t("contextAllSelected")
            : t("contextPartialSelected", {
                selected: checkedCount,
                total: allIds.length,
              })}
        </span>
        <Link
          href="/vaults"
          className="inline-flex items-center gap-1 text-[length:var(--text-meta)] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          {t("contextManage")}
          <ArrowUpRight size={13} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
