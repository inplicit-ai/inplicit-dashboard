import { NextResponse, type NextRequest } from "next/server";
import { makeApi, verifyMagicLinkToken } from "@/lib/api";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  console.log(`[auth] verifying token ${token.slice(0, 8)}…`);

  const setCookie = await verifyMagicLinkToken(token);
  if (!setCookie) {
    return new Response(renderError("Anmeldelink ungültig oder abgelaufen."), {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Strip cookie attrs to use as a request header for /api/me
  const cookieValue = setCookie.split(";")[0];
  let location = "/campaigns";
  try {
    const me = await makeApi(cookieValue).me();
    if (me.must_set_password) {
      location = "/set-password";
    } else if (me.role === "INPLICIT_STAFF" || me.role === "INPLICIT_ADMIN") {
      location = "/staff/orgs";
    } else {
      location = "/campaigns";
    }
    console.log(`[auth] login successful — role=${me.role}, → ${location}`);
  } catch (e) {
    console.warn("[auth] /api/me failed post-verify:", e);
  }

  const response = NextResponse.redirect(new URL(location, _req.url), {
    status: 302,
  });
  // Pass the backend's Set-Cookie verbatim — preserves HttpOnly / Secure /
  // Domain attributes the backend already chose.
  response.headers.set("Set-Cookie", setCookie);
  return response;
}

function renderError(message: string): string {
  return `<!DOCTYPE html>
<html lang="de" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <title>Anmeldung fehlgeschlagen</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
</head>
<body style="font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem">
  <div style="max-width:440px;width:100%;border:1px solid #fca5a5;background:#fef2f2;padding:2rem;border-radius:8px">
    <span style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:#dc2626">Fehler</span>
    <h1 style="margin-top:0.5rem;font-size:1.5rem">Anmeldung fehlgeschlagen</h1>
    <p style="margin-top:0.75rem">${message}</p>
    <a href="/login" style="display:inline-block;margin-top:1.25rem;color:#0a0a0a;text-decoration:underline">Erneut versuchen</a>
  </div>
</body>
</html>`;
}
