"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { IndexStatusPill } from "@/components/vaults/IndexStatusPill";
import { clientApi } from "@/lib/client-api";
import { ApiError, BackendDownError } from "@/lib/api";
import type { TwinRole, VaultItem, VaultSection } from "@/lib/api";
import { PlatePlaceholder } from "./Catalog";

/* ────────────────────────────────────────────────────────────────────────────
 * RoleContextUpload — upload ROLE-specific context during EDDA setup.
 *
 * The user picks an existing twin role; the component resolves (find-or-create)
 * that role's ROLE section in the org's single vault via
 * `sections.resolveRole(roleId)`, then uploads one or more files into it via the
 * multipart `upload-direct` endpoint. Uploaded items land in the section under
 * the role and are listed back here.
 *
 * Endpoints, in order (all via the same-origin /dapi proxy):
 *   GET  /orgs/me/roles                                  — role picker options
 *   POST /orgs/me/vault/role-sections {role_id}          — resolve/create section
 *   POST /orgs/me/vault/sections/:sid/items/upload-direct — bytes (multipart)
 *   GET  /orgs/me/vault/sections/:sid/items               — list uploaded items
 * ────────────────────────────────────────────────────────────────────────── */

/** Turn an unknown thrown value into a user-facing message. */
function messageFor(e: unknown, fallback: string): string {
  if (e instanceof BackendDownError) return e.message;
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

type UploadPhase = "uploading" | "ready" | "error";
interface UploadTask {
  id: string;
  filename: string;
  phase: UploadPhase;
  error?: string;
}

function newTaskId(): string {
  return `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function RoleContextUpload() {
  const t = useTranslations("setup.catalog");

  const [roles, setRoles] = useState<TwinRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roleId, setRoleId] = useState("");

  // The resolved ROLE section for the selected role (null until resolved).
  const [section, setSection] = useState<VaultSection | null>(null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
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

  // ── Refresh the item list for the active section ─────────────────────────
  const refreshItems = useCallback(async (sectionId: string) => {
    try {
      const list = await clientApi.vault.items.list(sectionId);
      setItems(list);
    } catch {
      // A failed refresh is non-fatal — the upload itself may still be fine.
    }
  }, []);

  // ── When the selected role changes, resolve its ROLE section ─────────────
  // `resolveRole` is idempotent (find-or-create), so selecting a role and
  // listing its items reuses the existing section without duplicating it.
  useEffect(() => {
    if (!roleId) {
      setSection(null);
      setItems([]);
      setError(null);
      return;
    }
    let alive = true;
    setBusy(true);
    setError(null);
    setSection(null);
    setItems([]);
    clientApi.vault.sections
      .resolveRole(roleId)
      .then(async (sec) => {
        if (!alive) return;
        setSection(sec);
        await refreshItems(sec.id);
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

  // ── File picker → upload each file into the role's section ───────────────
  const onFilesPicked = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !roleId) return;
      setError(null);
      let sid = section?.id ?? null;
      try {
        if (!sid) {
          const sec = await clientApi.vault.sections.resolveRole(roleId);
          setSection(sec);
          sid = sec.id;
        }
      } catch (e) {
        setError(messageFor(e, t("roleContextUploadError")));
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const sectionId = sid;
      for (const file of Array.from(files)) {
        const taskId = newTaskId();
        setTasks((prev) => [
          ...prev,
          { id: taskId, filename: file.name, phase: "uploading" },
        ]);
        try {
          await clientApi.vault.items.uploadDirect(sectionId, file);
          setTasks((prev) =>
            prev.map((tk) => (tk.id === taskId ? { ...tk, phase: "ready" } : tk)),
          );
          await refreshItems(sectionId);
        } catch (e) {
          setTasks((prev) =>
            prev.map((tk) =>
              tk.id === taskId
                ? { ...tk, phase: "error", error: messageFor(e, t("roleContextUploadError")) }
                : tk,
            ),
          );
        }
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [roleId, section, refreshItems, t],
  );

  const dismissTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((tk) => tk.id !== id));
  }, []);

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

          {/* Active upload tasks (uploading → ready/error). */}
          {tasks.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {tasks.map((task) => (
                <UploadTaskRow key={task.id} task={task} onDismiss={dismissTask} />
              ))}
            </ul>
          )}

          {/* Already-uploaded items in this role's section. */}
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

  const phaseLabel: Record<UploadPhase, string> = {
    uploading: t("roleContextPhaseUploading"),
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
