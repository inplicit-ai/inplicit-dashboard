import { Handlers } from "$fresh/server.ts";
import { makeApi, verifyMagicLinkToken } from "../../../../lib/api.ts";

export const handler: Handlers = {
  async GET(_req, ctx) {
    const token = ctx.params.token;
    console.log(`[auth] verifying token ${token.slice(0, 8)}...`);

    const setCookie = await verifyMagicLinkToken(token);

    if (!setCookie) {
      return new Response(
        renderError("Anmeldelink ungültig oder abgelaufen."),
        { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    // Routing decision: Inplicit-Staff lands on the staff console; ORG_OWNERs
    // go to the customer dashboard. We need /api/me to find out which — call
    // it with the cookie the backend just gave us.
    const cookieValue = setCookie.split(";")[0]; // strip attrs (HttpOnly, etc.)
    let location = "/admin/campaigns";
    try {
      const api = makeApi(cookieValue);
      const me = await api.me();
      location = me.role === "INPLICIT_STAFF" ? "/staff/orgs" : "/admin/campaigns";
      console.log(`[auth] login successful — role=${me.role}, → ${location}`);
    } catch (e) {
      console.warn("[auth] /api/me failed post-verify, defaulting to customer dashboard:", e);
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: location,
        "Set-Cookie": setCookie,
      },
    });
  },
};

function renderError(message: string): string {
  return `<!DOCTYPE html>
<html lang="de" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <title>Anmeldung fehlgeschlagen</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/design.css" />
</head>
<body class="shell" style="display:flex;align-items:center;justify-content:center;padding:var(--space-8)">
  <div class="card" style="max-width:440px;width:100%">
    <span class="eyebrow" style="color:var(--color-pain)">Fehler</span>
    <h1 class="title" style="margin-top:var(--space-2)">Anmeldung fehlgeschlagen</h1>
    <p class="body-sm" style="margin-top:var(--space-3)">${message}</p>
    <a href="/admin/login" class="btn btn--ghost btn--sm" style="margin-top:var(--space-5)">Erneut versuchen</a>
  </div>
</body>
</html>`;
}
