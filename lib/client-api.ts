"use client";

import {
  ApiError,
  BackendDownError,
  type CreateSetupSessionInput,
  type LaunchResult,
  type NewVaultInput,
  type SetupDraftState,
  type SetupLaunchResult,
  type SetupPatchInput,
  type SetupSession,
  type SetupSessionCreated,
  type SetupSessionRef,
  type TwinRole,
  type Vault,
  type VaultItem,
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

  let res: Response;
  try {
    res = await fetch(proxied, {
      ...init,
      headers: {
        "Content-Type": "application/json",
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

/** Browser-only client. Mirrors the server `api` methods used by "use client" components. */
export const clientApi = {
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
  },
  // ── Context Vaults (browser mirror of server `api.vaults.*`) ────────────
  // Only the methods needed for the setup role-context upload are mirrored;
  // the heavy presigned upload state machine lives in `lib/vaults/upload.ts`
  // (shared with the Kontext page) and is NOT duplicated here.
  vaults: {
    list: () => clientRequest<Vault[]>("/api/orgs/me/vaults"),
    create: (body: NewVaultInput) =>
      clientRequest<Vault>("/api/orgs/me/vaults", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    listForRole: (roleId: string) =>
      clientRequest<Vault[]>(`/api/orgs/me/roles/${roleId}/vaults`),
    listItems: (id: string) =>
      clientRequest<VaultItem[]>(`/api/orgs/me/vaults/${id}/items`),
  },
};
