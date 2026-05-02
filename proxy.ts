import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth gate that runs before any guarded page renders.
 *
 * The layouts (lib/auth.ts) still do the authoritative `requireUser` check
 * because they need the full `me` payload to decide role-based redirects.
 * This proxy is a cheap pre-flight: if neither session cookie is present we
 * bounce to /login *before* the page server-renders, which avoids a wasted
 * /api/me round-trip and a flash of the dashboard UI.
 *
 * Renamed from `middleware.ts` → `proxy.ts` per Next 16's file convention.
 */
const SESSION_COOKIE_NAMES = ["__Host-session", "session_id"];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIE_NAMES.some(
    (n) => request.cookies.get(n)?.value,
  );
  if (hasSession) return NextResponse.next();

  // Preserve where the user wanted to go so we can return them after login.
  const next = request.nextUrl.pathname + request.nextUrl.search;
  const url = new URL("/login", request.url);
  if (next && next !== "/login") {
    url.searchParams.set("next", next);
  }
  return NextResponse.redirect(url);
}

export const config = {
  // Run on every authenticated surface. Static assets, API routes, the
  // login + auth-verify routes, and the logout route all need to remain
  // reachable without a session.
  matcher: [
    "/campaigns/:path*",
    "/staff/:path*",
    "/insights/:path*",
    "/set-password",
  ],
};
