import { Handlers } from "$fresh/server.ts";

const API_BASE = Deno.env.get("API_URL") ?? "http://localhost:8080";

/**
 * Logout proxy. Forwards the request cookie to the backend so it can
 * delete the session row, then propagates the `Set-Cookie: …; Max-Age=0`
 * back to the browser to clear the session client-side too.
 *
 * GET also accepted as a courtesy, but the sidebar form uses POST.
 */
export const handler: Handlers = {
  POST: doLogout,
  GET: doLogout,
};

async function doLogout(req: Request): Promise<Response> {
  const cookie = req.headers.get("cookie") ?? "";

  let upstream: Response | null = null;
  try {
    upstream = await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
  } catch (e) {
    console.warn("[logout] backend unreachable, clearing cookie locally:", (e as Error).message);
  }

  const headers = new Headers({ Location: "/admin/login" });
  const setCookie = upstream?.headers.get("set-cookie");
  if (setCookie) {
    headers.set("Set-Cookie", setCookie);
  } else {
    // Backend down — best-effort local cookie wipe.
    headers.append(
      "Set-Cookie",
      "session_id=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
    );
    headers.append(
      "Set-Cookie",
      "__Host-session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
    );
  }
  return new Response(null, { status: 303, headers });
}
