"use client";

import { useMemo, useRef, useState } from "react";
import {
  CornerDownLeft,
  FileText,
  FolderOpen,
  Link2,
  Search,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * VaultCommandPalette — the Cmd+K command palette for the vault hub (F2 part a).
 *
 * Linear / Notion style: a single Input filters a flat action list. Reuses the
 * Dialog + Input primitives only. Typing without matching a command and hitting
 * Enter runs a semantic search with the raw query. Keyboard-first: ↑/↓ move,
 * Enter runs, Esc closes. The host (VaultHub) owns the actual side effects and
 * passes them in as callbacks — the palette stays presentational.
 * ────────────────────────────────────────────────────────────────────────── */

export type VaultCommandId =
  | "uploadFile"
  | "addUrl"
  | "addText"
  | "search"
  | "goAll"
  | "goUploads"
  | "goRoles";

export interface VaultCommandAction {
  id: VaultCommandId;
  label: string;
  hint?: string;
  icon: LucideIcon;
  /** Called when chosen. `query` is the current input (trimmed). */
  run: (query: string) => void;
  /** When true, the action is only offered if the input is non-empty. */
  needsQuery?: boolean;
}

export function VaultCommandPalette({
  open,
  onOpenChange,
  onUploadFile,
  onAddUrl,
  onAddText,
  onSearch,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadFile: () => void;
  onAddUrl: () => void;
  onAddText: () => void;
  onSearch: (query: string) => void;
  onNavigate: (key: "all" | "uploads" | "roles") => void;
}) {
  const t = useTranslations("vaultHub");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset transient state in the close event handler so the next open starts
  // clean — no setState-in-effect cascade.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery("");
      setActive(0);
    }
    onOpenChange(next);
  }

  const close = () => handleOpenChange(false);

  const actions = useMemo<VaultCommandAction[]>(
    () => [
      {
        id: "search",
        label: t("cmdSearch"),
        hint: t("cmdSearchHint"),
        icon: Search,
        needsQuery: true,
        run: (q) => {
          close();
          onSearch(q);
        },
      },
      {
        id: "uploadFile",
        label: t("cmdUploadFile"),
        icon: Upload,
        run: () => {
          close();
          onUploadFile();
        },
      },
      {
        id: "addUrl",
        label: t("cmdAddUrl"),
        icon: Link2,
        run: () => {
          close();
          onAddUrl();
        },
      },
      {
        id: "addText",
        label: t("cmdAddText"),
        icon: FileText,
        run: () => {
          close();
          onAddText();
        },
      },
      {
        id: "goAll",
        label: t("cmdGoAll"),
        icon: FolderOpen,
        run: () => {
          close();
          onNavigate("all");
        },
      },
      {
        id: "goUploads",
        label: t("cmdGoUploads"),
        icon: Upload,
        run: () => {
          close();
          onNavigate("uploads");
        },
      },
      {
        id: "goRoles",
        label: t("cmdGoRoles"),
        icon: FolderOpen,
        run: () => {
          close();
          onNavigate("roles");
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, onSearch, onUploadFile, onAddUrl, onAddText, onNavigate],
  );

  const q = query.trim();
  const needle = q.toLowerCase();
  const visible = useMemo(
    () =>
      actions.filter((a) => {
        if (a.needsQuery && !q) return false;
        if (!needle) return true;
        // The free-text search command always survives so a non-matching query
        // still has a destination; everything else label-matches.
        if (a.id === "search") return true;
        return a.label.toLowerCase().includes(needle);
      }),
    [actions, needle, q],
  );

  // Clamp the highlight into the visible range at render time (filtering can
  // shrink the list). Derived — no effect needed.
  const activeIndex = visible.length
    ? Math.min(active, visible.length - 1)
    : 0;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(visible.length ? (activeIndex + 1) % visible.length : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(
        visible.length
          ? (activeIndex - 1 + visible.length) % visible.length
          : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = visible[activeIndex];
      if (chosen) chosen.run(q);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">{t("cmdTitle")}</DialogTitle>

        {/* Query input */}
        <div className="flex items-center gap-2.5 border-b border-line-subtle px-4">
          <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("cmdPlaceholder")}
            className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:border-0 focus-visible:shadow-none"
            aria-label={t("cmdTitle")}
          />
        </div>

        {/* Action list */}
        {visible.length === 0 ? (
          <p className="px-4 py-8 text-center text-[length:var(--text-body-sm)] text-fg-subtle">
            {t("cmdNoResults")}
          </p>
        ) : (
          <ul className="max-h-[min(60dvh,22rem)] overflow-y-auto p-2">
            {visible.map((a, i) => {
              const Icon = a.icon;
              const isActive = i === activeIndex;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => a.run(q)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-ui px-3 py-2.5 text-left transition-colors",
                      isActive ? "bg-surface-2" : "hover:bg-surface-2",
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-ui border border-line bg-surface text-fg-muted">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[length:var(--text-body-sm)] font-medium text-fg">
                        {a.id === "search" && q
                          ? t("cmdSearchFor", { query: q })
                          : a.label}
                      </span>
                      {a.hint && (
                        <span className="block truncate text-[length:var(--text-caption)] text-fg-subtle">
                          {a.hint}
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <CornerDownLeft
                        className="h-3.5 w-3.5 shrink-0 text-fg-faint"
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
