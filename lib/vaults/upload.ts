"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VaultItem, VaultSearchHit } from "@/lib/api";

/* ────────────────────────────────────────────────────────────────────────────
 * Vault upload state machine (client).
 *
 * Drives the F1 presigned flow per file:
 *   1. uploading  — POST upload-url → PUT bytes to S3
 *   2. extracting — POST finalize (server reads S3, extracts text)
 *   3. indexing   — poll item.embedded until true
 *   4. ready      — embedded === true
 *   error         — any step failed
 *
 * All reads/writes go through the same-origin /dapi proxy so the session
 * cookie is forwarded; the S3 PUT goes directly to the presigned URL.
 * ────────────────────────────────────────────────────────────────────────── */

export type UploadPhase =
  | "uploading"
  | "extracting"
  | "indexing"
  | "ready"
  | "error";

export interface UploadTask {
  id: string;
  filename: string;
  byteSize: number;
  phase: UploadPhase;
  itemId?: string;
  error?: string;
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60; // ~2 min ceiling before we stop polling.

/** Same-origin proxy to the Rust backend (cookie-forwarded). */
function dapi(path: string): string {
  return `/dapi/${path}`;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

function newTaskId(): string {
  return `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useVaultUpload(vaultId: string | null, onItemReady: () => void) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const onReadyRef = useRef(onItemReady);
  useEffect(() => {
    onReadyRef.current = onItemReady;
  }, [onItemReady]);

  const patch = useCallback((id: string, next: Partial<UploadTask>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...next } : t)),
    );
  }, []);

  const dismiss = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pollEmbedded = useCallback(
    async (taskId: string, itemId: string) => {
      for (let i = 0; i < MAX_POLLS; i += 1) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        try {
          const item = await jsonOrThrow<VaultItem>(
            await fetch(dapi(`orgs/me/vaults/${vaultId}/items/${itemId}`), {
              cache: "no-store",
            }),
          );
          if (item.embedded) {
            patch(taskId, { phase: "ready" });
            onReadyRef.current();
            return;
          }
        } catch {
          // transient — keep polling within the ceiling.
        }
      }
      // Indexing did not converge in time — treat as ready-but-unverified so
      // the row leaves the active list; the list refresh shows the real pill.
      patch(taskId, { phase: "ready" });
      onReadyRef.current();
    },
    [vaultId, patch],
  );

  const uploadOne = useCallback(
    async (file: File) => {
      if (!vaultId) return;
      const taskId = newTaskId();
      setTasks((prev) => [
        ...prev,
        {
          id: taskId,
          filename: file.name,
          byteSize: file.size,
          phase: "uploading",
        },
      ]);

      try {
        // 1 — presigned URL
        const { itemId, uploadUrl } = await jsonOrThrow<{
          itemId: string;
          uploadUrl: string;
        }>(
          await fetch(dapi(`orgs/me/vaults/${vaultId}/items/upload-url`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              mime: file.type || "application/octet-stream",
              byteSize: file.size,
            }),
          }),
        );

        // 2 — PUT bytes directly to S3
        const put = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });
        if (!put.ok) throw new Error(`S3 ${put.status}`);

        patch(taskId, { phase: "extracting", itemId });

        // 3 — finalize (server extracts + kicks off ingestion)
        const item = await jsonOrThrow<VaultItem>(
          await fetch(
            dapi(`orgs/me/vaults/${vaultId}/items/${itemId}/finalize`),
            { method: "POST" },
          ),
        );
        onReadyRef.current();

        if (item.embedded) {
          patch(taskId, { phase: "ready" });
          return;
        }

        // 4 — poll until embedded
        patch(taskId, { phase: "indexing" });
        await pollEmbedded(taskId, itemId);
      } catch (e) {
        patch(taskId, { phase: "error", error: (e as Error).message });
      }
    },
    [vaultId, patch, pollEmbedded],
  );

  const uploadMany = useCallback(
    (files: FileList | File[]) => {
      Array.from(files).forEach((f) => void uploadOne(f));
    },
    [uploadOne],
  );

  return { tasks, uploadMany, dismiss };
}

/** Thin client wrapper for the semantic search endpoint. */
export async function searchVault(
  vaultId: string,
  q: string,
): Promise<VaultSearchHit[]> {
  const res = await fetch(
    dapi(`orgs/me/vaults/${vaultId}/search?q=${encodeURIComponent(q)}`),
    { cache: "no-store" },
  );
  return jsonOrThrow<VaultSearchHit[]>(res);
}

/** Add a TEXT or URL item via the existing items endpoint. */
export async function addVaultItem(
  vaultId: string,
  body: { kind: "TEXT" | "URL"; title?: string; content: string },
): Promise<VaultItem> {
  const res = await fetch(dapi(`orgs/me/vaults/${vaultId}/items`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOrThrow<VaultItem>(res);
}
