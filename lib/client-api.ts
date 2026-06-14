"use client";

import {
  ApiError,
  BackendDownError,
  type CreateSetupSessionInput,
  type LaunchResult,
  type NewVaultItemInput,
  type NewTwinRoleInput,
  type Organization,
  type SetupDraftState,
  type SetupLaunchResult,
  type SetupPatchInput,
  type SetupSession,
  type SetupSessionCreated,
  type SetupSessionRef,
  type TwinRole,
  type VaultItem,
  type VaultSearchHit,
  type VaultSection,
  type VaultView,
} from "./api";

/**
 * Browser-safe API client.
 *
 * The server-side `makeApi()` in `lib/api.ts` talks to the Rust backend
 * directly using the private `API_URL` env var and forwards the session
 * cookie. That singleton must NEVER be imported by client components: in the
 * browser `process.env.API_URL` is undefined, so it falls back to
 * `http://localhost:8080`, producing cross-origin (CORS) requests that also
 * leak `localhost` into production bundles.
 *
 * Client components route through the same-origin `/dapi/*` proxy instead
 * (see `app/dapi/[...path]/route.ts`), which runs on the server, attaches the
 * cookie, and forwards to `API_URL`. Same-origin means the browser sends the
 * session cookie automatically — no CORS, no hardcoded host.
 */
async function clientRequest<T>(path: string, init?: RequestInit): Promise<T> {
  // `/api/...` (backend route) → `/dapi/...` (same-origin proxy).
  const proxied = `/dapi${path.replace(/^\/api/, "")}`;

  // A FormData body must NOT carry a manual Content-Type — the browser sets the
  // multipart boundary itself. Only default JSON for non-FormData bodies.
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(proxied, {
      ...init,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(init?.headers as Record<string, string> | undefined),
      },
      cache: "no-store",
    });
  } catch (e) {
    console.error(
      `[client-api] ${init?.method ?? "GET"} ${proxied} → network error:`,
      (e as Error).message,
    );
    throw new BackendDownError();
  }

  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      // ignore
    }
    const msg =
      (detail && typeof detail === "object" && "error" in detail
        ? String((detail as { error: string }).error)
        : null) ?? `HTTP ${res.status} ${res.statusText}`;
    throw new ApiError(res.status, msg, detail);
  }

  return (await res.json()) as T;
}

/** Multipart logo POST shared by the self-service and staff routes (WHY-126). */
function uploadLogoRequest(path: string, file: File): Promise<Organization> {
  const form = new FormData();
  form.append("file", file, file.name);
  return clientRequest<Organization>(path, { method: "POST", body: form });
}

/** Browser-only client. Mirrors the server `api` methods used by "use client" components. */
export const clientApi = {
  // ── Org logo (WHY-126): multipart through the server, like vault uploads ─
  orgs: {
    uploadLogo: (file: File) => uploadLogoRequest("/api/orgs/me/logo", file),
    removeLogo: () =>
      clientRequest<Organization>("/api/orgs/me/logo", { method: "DELETE" }),
  },
  staffOrgs: {
    uploadLogo: (orgId: string, file: File) =>
      uploadLogoRequest(`/api/staff/orgs/${orgId}/logo`, file),
    removeLogo: (orgId: string) =>
      clientRequest<Organization>(`/api/staff/orgs/${orgId}/logo`, {
        method: "DELETE",
      }),
  },
  setup: {
    createSession: (body: CreateSetupSessionInput) =>
      clientRequest<SetupSessionCreated>("/api/orgs/me/setup-sessions", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    getSession: (id: string) =>
      clientRequest<SetupSession>(`/api/orgs/me/setup-sessions/${id}`),
    /** Resolve a launched campaign back to its EDDA draft (refine re-entry). */
    resolveDraft: (campaignId: string) =>
      clientRequest<SetupSessionRef>(
        `/api/orgs/me/campaigns/${campaignId}/setup-session`,
      ),
    patchDraft: (id: string, body: SetupPatchInput) =>
      clientRequest<SetupDraftState>(`/api/orgs/me/setup-drafts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    launchDraft: (id: string) =>
      clientRequest<SetupLaunchResult>(
        `/api/orgs/me/setup-drafts/${id}/launch`,
        { method: "POST" },
      ),
  },
  campaigns: {
    launch: (id: string) =>
      clientRequest<LaunchResult>(`/api/campaigns/${id}/launch`, {
        method: "POST",
      }),
  },
  // ── Digital Twin roles (browser mirror of server `api.twin.*`) ──────────
  twin: {
    listRoles: () => clientRequest<TwinRole[]>("/api/orgs/me/roles"),
    createRole: (body: NewTwinRoleInput) =>
      clientRequest<TwinRole>("/api/orgs/me/roles", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  // ── Kontext Vault (browser mirror of server `api.vault.*`) ──────────────
  // ONE vault per org + typed sections. The browser mirrors only what the
  // client components need; the section-bound upload uses the multipart
  // `upload-direct` endpoint (no presigned state machine anymore).
  vault: {
    get: () => clientRequest<VaultView>("/api/orgs/me/vault"),
    sections: {
      create: (name: string) =>
        clientRequest<VaultSection>("/api/orgs/me/vault/sections", {
          method: "POST",
          body: JSON.stringify({ name }),
        }),
      rename: (sid: string, name: string) =>
        clientRequest<VaultSection>(`/api/orgs/me/vault/sections/${sid}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        }),
      delete: (sid: string) =>
        clientRequest<void>(`/api/orgs/me/vault/sections/${sid}`, {
          method: "DELETE",
        }),
      /** Idempotent resolve-or-create of a role's ROLE section. */
      resolveRole: (roleId: string) =>
        clientRequest<VaultSection>("/api/orgs/me/vault/role-sections", {
          method: "POST",
          body: JSON.stringify({ role_id: roleId }),
        }),
    },
    items: {
      list: (sid: string) =>
        clientRequest<VaultItem[]>(`/api/orgs/me/vault/sections/${sid}/items`),
      /** Fetch one item by id (org-fenced) — backs the search→detail popup. */
      get: (itemId: string) =>
        clientRequest<VaultItem>(`/api/orgs/me/vault/items/${itemId}`),
      add: (sid: string, body: NewVaultItemInput) =>
        clientRequest<VaultItem>(`/api/orgs/me/vault/sections/${sid}/items`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      /** Multipart upload through the same-origin proxy (field name `file`). */
      uploadDirect: (sid: string, file: File, title?: string) => {
        const form = new FormData();
        form.append("file", file, file.name);
        if (title?.trim()) form.append("title", title.trim());
        return clientRequest<VaultItem>(
          `/api/orgs/me/vault/sections/${sid}/items/upload-direct`,
          { method: "POST", body: form },
        );
      },
      patch: (sid: string, itemId: string, body: { title: string }) =>
        clientRequest<VaultItem>(
          `/api/orgs/me/vault/sections/${sid}/items/${itemId}`,
          { method: "PATCH", body: JSON.stringify(body) },
        ),
      delete: (sid: string, itemId: string) =>
        clientRequest<void>(
          `/api/orgs/me/vault/sections/${sid}/items/${itemId}`,
          { method: "DELETE" },
        ),
      reindex: (sid: string, itemId: string) =>
        clientRequest<VaultItem>(
          `/api/orgs/me/vault/sections/${sid}/items/${itemId}/reindex`,
          { method: "POST" },
        ),
    },
    search: (q: string, opts?: { section?: string; k?: number }) => {
      const params = new URLSearchParams({ q });
      if (opts?.section) params.set("section", opts.section);
      if (opts?.k) params.set("k", String(opts.k));
      return clientRequest<VaultSearchHit[]>(
        `/api/orgs/me/vault/search?${params.toString()}`,
      );
    },
  },
};
