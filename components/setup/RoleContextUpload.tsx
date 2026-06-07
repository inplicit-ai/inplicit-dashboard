"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { IndexStatusPill } from "@/components/vaults/IndexStatusPill";
import { useVaultUpload, type UploadTask } from "@/lib/vaults/upload";
import { clientApi } from "@/lib/client-api";
import { ApiError, BackendDownError } from "@/lib/api";
import type { TwinRole, Vault, VaultItem } from "@/lib/api";
import { PlatePlaceholder } from "./Catalog";

/* ────────────────────────────────────────────────────────────────────────────
 * RoleContextUpload — upload ROLE-specific context during EDDA setup.
 *
 * The user picks an existing twin role; the component resolves (or lazily
 * creates) that role's ROLE-scoped vault, then uploads one or more files into
 * it via the SHARED presigned flow (`useVaultUpload` in lib/vaults/upload.ts —
 * the exact same plumbing the Kontext page uses). Uploaded items land in the
 * vault under the role and are listed back here.
 *
 * Endpoints, in order (all via the same-origin /dapi proxy):
 *   GET  /orgs/me/roles                          — role picker options
 *   GET  /orgs/me/roles/:rid/vaults              — existing ROLE vault(s)
 *   POST /orgs/me/vaults  {scope:"ROLE",role_id} — create on first upload
 *   POST /orgs/me/vaults/:id/items/upload-url    — presigned S3 PUT
 *   PUT  <presigned S3 url>                       — bytes
 *   POST /orgs/me/vaults/:id/items/:itemId/finalize — extract + index
 *   GET  /orgs/me/vaults/:id/items               — list uploaded items
 * ────────────────────────────────────────────────────────────────────────── */

/** Turn an unknown thrown value into a user-facing message. */
function messageFor(e: unknown, fallback: string): string {
  if (e instanceof BackendDownError) return e.message;
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export function RoleContextUpload() {
  const t = useTranslations("setup.catalog");

  const [roles, setRoles] = useState<TwinRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roleId, setRoleId] = useState("");

  // The resolved ROLE vault for the selected role (null until resolved/created).
  const [vault, setVault] = useState<Vault | null>(null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load the role list once ──────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    clientApi.twin
      .listRoles()
      .then((r) => {
        if (alive) setRoles(r);
      })
      .catch((e) => {
        if (alive) setError(messageFor(e, t("roleContextLoadError")));
      })
      .finally(() => {
        if (alive) setRolesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [t]);

  // ── Refresh the item list for the active vault ───────────────────────────
  const refreshItems = useCallback(async (vaultId: string) => {
    try {
      const list = await clientApi.vaults.listItems(vaultId);
      setItems(list);
    } catch {
      // A failed refresh is non-fatal — the upload itself may still be fine.
    }
  }, []);

  // Shared presigned upload state machine, bound to the resolved vault id.
  const { tasks, uploadMany, dismiss } = useVaultUpload(
    vault?.id ?? null,
    () => {
      if (vault?.id) void refreshItems(vault.id);
    },
  );

  // ── When the selected role changes, resolve its existing ROLE vault ──────
  useEffect(() => {
    if (!roleId) {
      setVault(null);
      setItems([]);
      setError(null);
      return;
    }
    let alive = true;
    setBusy(true);
    setError(null);
    setVault(null);
    setItems([]);
    clientApi.vaults
      .listForRole(roleId)
      .then(async (list) => {
        if (!alive) return;
        const existing = list[0] ?? null;
        setVault(existing);
        if (existing) await refreshItems(existing.id);
      })
      .catch((e) => {
        if (alive) setError(messageFor(e, t("roleContextLoadError")));
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [roleId, refreshItems, t]);

  // ── Ensure a ROLE vault exists, creating one on first upload ─────────────
  const ensureVault = useCallback(async (): Promise<Vault> => {
    if (vault) return vault;
    const role = roles.find((r) => r.id === roleId);
    const created = await clientApi.vaults.create({
      scope: "ROLE",
      role_id: roleId,
      name: role ? t("roleContextVaultName", { role: role.name }) : "Role context",
    });
    setVault(created);
    return created;
  }, [vault, roles, roleId, t]);

  // ── File picker → ensure vault → hand bytes to the shared upload hook ────
  const onFilesPicked = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !roleId) return;
      setError(null);
      try {
        await ensureVault();
        // `useVaultUpload` reads the freshly-set vault id on its next render;
        // defer the dispatch a tick so the bound id is current.
        const picked = Array.from(files);
        queueMicrotask(() => uploadMany(picked));
      } catch (e) {
        setError(messageFor(e, t("roleContextUploadError")));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [roleId, ensureVault, uploadMany, t],
  );

  const roleOptions = [
    { value: "", label: t("roleContextPickRole") },
    ...roles.map((r) => ({ value: r.id, label: r.name })),
  ];

  return (
    <div className="flex flex-col gap-3 border-t border-line-subtle pt-4">
      <div className="flex flex-col gap-1">
        <span className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
          {t("roleContextTitle")}
        </span>
        <p className="text-[length:var(--text-meta)] text-fg-subtle">
          {t("roleContextHint")}
        </p>
      </div>

      {rolesLoading ? (
        <PlatePlaceholder>{t("roleContextLoading")}</PlatePlaceholder>
      ) : roles.length === 0 ? (
        <PlatePlaceholder>{t("roleContextNoRoles")}</PlatePlaceholder>
      ) : (
        <>
          <Select
            aria-label={t("roleContextPickRole")}
            value={roleId}
            onValueChange={setRoleId}
            options={roleOptions}
            size="md"
          />

          {roleId && (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => void onFilesPicked(e.target.files)}
                aria-label={t("roleContextUpload")}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                {busy ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Upload aria-hidden />
                )}
                {t("roleContextUpload")}
              </Button>
            </div>
          )}

          {error && (
            <p className="text-[length:var(--text-meta)] text-danger" role="alert">
              {error}
            </p>
          )}

          {/* Active upload tasks (uploading → indexing → ready/error). */}
          {tasks.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {tasks.map((task) => (
                <UploadTaskRow key={task.id} task={task} onDismiss={dismiss} />
              ))}
            </ul>
          )}

          {/* Already-uploaded items in this role's vault. */}
          {roleId && !busy && items.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-ui border border-line-subtle bg-surface-2 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText
                      size={14}
                      className="shrink-0 text-fg-subtle"
                      aria-hidden
                    />
                    <span className="truncate text-[length:var(--text-body)] text-fg">
                      {item.title ?? t("roleContextUntitled")}
                    </span>
                  </span>
                  <IndexStatusPill
                    embedded={item.embedded}
                    indexedLabel={t("roleContextIndexed")}
                    indexingLabel={t("roleContextIndexing")}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/** A single in-flight upload row with a friendly phase label. */
function UploadTaskRow({
  task,
  onDismiss,
}: {
  task: UploadTask;
  onDismiss: (id: string) => void;
}) {
  const t = useTranslations("setup.catalog");

  const phaseLabel: Record<UploadTask["phase"], string> = {
    uploading: t("roleContextPhaseUploading"),
    extracting: t("roleContextPhaseExtracting"),
    indexing: t("roleContextPhaseIndexing"),
    ready: t("roleContextPhaseReady"),
    error: task.error ?? t("roleContextUploadError"),
  };

  const isError = task.phase === "error";

  return (
    <li className="flex items-center justify-between gap-3 rounded-ui border border-line-subtle bg-surface-2 px-3 py-2">
      <span className="flex min-w-0 items-center gap-2">
        {task.phase === "ready" || isError ? (
          <FileText size={14} className="shrink-0 text-fg-subtle" aria-hidden />
        ) : (
          <Loader2
            size={14}
            className="shrink-0 animate-spin text-fg-subtle"
            aria-hidden
          />
        )}
        <span className="truncate text-[length:var(--text-body)] text-fg">
          {task.filename}
        </span>
      </span>
      <span
        className={`shrink-0 text-[length:var(--text-meta)] ${
          isError ? "text-danger" : "text-fg-subtle"
        }`}
      >
        {phaseLabel[task.phase]}
      </span>
      {(task.phase === "ready" || isError) && (
        <button
          type="button"
          onClick={() => onDismiss(task.id)}
          className="shrink-0 text-[length:var(--text-meta)] text-fg-subtle hover:text-fg"
        >
          ×
        </button>
      )}
    </li>
  );
}
