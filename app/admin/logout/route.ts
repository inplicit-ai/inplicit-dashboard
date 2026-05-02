import { NextResponse, type NextRequest } from "next/server";

const API_BASE = process.env.API_URL ?? "http://localhost:8080";

/**
 * Logout proxy. Forwards the request cookie to the backend so it can delete
 * the session row, then propagates the `Set-Cookie: …; Max-Age=0` back to the
 * browser to clear the session client-side too. GET also accepted as a
 * courtesy; the sidebar form uses POST.
 */
async function doLogout(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";

  let upstream: Response | null = null;
  try {
    upstream = await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookie },
      cache: "no-store",
    });
  } catch (e) {
    console.warn(
      "[logout] backend unreachable, clearing cookie locally:",
      (e as Error).message,
    );
  }

  const response = NextResponse.redirect(new URL("/admin/login", req.url), {
    status: 303,
  });
  const setCookie = upstream?.headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("Set-Cookie", setCookie);
  } else {
    response.headers.append(
      "Set-Cookie",
      "session_id=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
    );
    response.headers.append(
      "Set-Cookie",
      "__Host-session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
    );
  }
  return response;
}

export const POST = doLogout;
export const GET = doLogout;
