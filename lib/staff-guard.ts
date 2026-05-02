import { ApiError, BackendDownError, makeApi, Me } from "./api.ts";

export type GuardOutcome =
  | { ok: true; me: Me; cookie: string }
  | { ok: false; redirect: Response };

/**
 * Server-side gate for /staff/* routes. Resolves /api/me with the request
 * cookie and decides whether to render the route, redirect to login (no
 * session), or redirect to the customer dashboard (logged in but not staff).
 *
 * If the backend is unreachable, returns a friendly 503 page instead of
 * propagating the network error to Fresh's default crash screen.
 */
export async function requireStaff(req: Request): Promise<GuardOutcome> {
  const cookie = req.headers.get("cookie") ?? "";
  if (!cookie) return loginRedirect();

  const api = makeApi(cookie);
  try {
    const me = await api.me();
    if (me.role !== "INPLICIT_STAFF") {
      return {
        ok: false,
        redirect: new Response(null, {
          status: 302,
          headers: { Location: "/admin/campaigns" },
        }),
      };
    }
    return { ok: true, me, cookie };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return loginRedirect();
    if (e instanceof BackendDownError) return backendDownResponse(e.message);
    throw e;
  }
}

function loginRedirect(): GuardOutcome {
  return {
    ok: false,
    redirect: new Response(null, {
      status: 302,
      headers: { Location: "/admin/login" },
    }),
  };
}

function backendDownResponse(detail: string): GuardOutcome {
  return {
    ok: false,
    redirect: new Response(renderBackendDown(detail), {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }),
  };
}

function renderBackendDown(detail: string): string {
  return `<!DOCTYPE html>
<html lang="de" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Backend nicht erreichbar - Inplicit</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/design.css">
</head>
<body class="shell" style="display:flex;align-items:center;justify-content:center;padding:var(--space-8);min-height:100vh;">
  <div class="card" style="max-width:480px;width:100%;border-color:var(--color-pain-muted);background:var(--color-pain-soft);">
    <span class="eyebrow" style="color:var(--color-pain)">Verbindung</span>
    <h1 class="subtitle" style="margin-top:var(--space-2)">Backend nicht erreichbar</h1>
    <p class="body-sm" style="margin-top:var(--space-3)">${escapeHtml(detail)}</p>
    <div class="mono" style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-ui);padding:var(--space-3);margin-top:var(--space-4);color:var(--color-text-secondary);">cd inplicit-backend &amp;&amp; cargo run</div>
    <p class="caption" style="margin-top:var(--space-3)">Nach dem Start: <a href="javascript:location.reload()" style="color:var(--color-text-primary);text-decoration:underline;">neu laden</a>.</p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
