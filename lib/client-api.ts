"use client";

import {
  ApiError,
  BackendDownError,
  type CreateSetupSessionInput,
  type LaunchResult,
  type SetupDraftState,
  type SetupLaunchResult,
  type SetupPatchInput,
  type SetupSession,
  type SetupSessionCreated,
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
};
