import { Handlers, PageProps } from "$fresh/server.ts";
import { asset } from "$fresh/runtime.ts";
import { ApiError, makeApi, verifyMagicLinkToken } from "../../lib/api.ts";

interface Data {
  message?: string;
  devLink?: string;
  error?: string;
  email?: string;
}

export const handler: Handlers<Data> = {
  GET(_req, ctx) {
    return ctx.render({});
  },
  async POST(req, ctx) {
    const form = await req.formData();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email) return ctx.render({ error: "E-Mail fehlt." });

    // Branch on the password field. Filled → password sign-in (staff path,
    // works without email delivery). Empty → magic-link (default).
    if (password) {
      return await passwordSignIn(req, ctx, email, password);
    }
    return await magicLinkSignIn(ctx, email);
  },
};

async function passwordSignIn(
  req: Request,
  // deno-lint-ignore no-explicit-any
  ctx: any,
  email: string,
  password: string,
) {
  const cookie = req.headers.get("cookie") ?? undefined;
  const api = makeApi(cookie);
  try {
    const res = await fetch(
      `${Deno.env.get("API_URL") ?? "http://localhost:8080"}/api/auth/sign-in`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
    );
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const detail = await res.json();
        if (detail && typeof detail === "object" && "error" in detail) {
          msg = String((detail as { error: string }).error);
        }
      } catch {
        // ignore
      }
      return ctx.render({ error: msg, email });
    }
    const setCookie = res.headers.get("set-cookie");
    const meCookie = setCookie?.split(";")[0] ?? cookie ?? "";
    let location = "/admin/campaigns";
    try {
      const me = await makeApi(meCookie).me();
      location = me.role === "INPLICIT_STAFF" ? "/staff/orgs" : "/admin/campaigns";
    } catch {
      // ignore — we'll land on /admin/campaigns and the route's own guard
      // re-resolves role.
    }
    const headers = new Headers({ Location: location });
    if (setCookie) headers.set("Set-Cookie", setCookie);
    return new Response(null, { status: 303, headers });
  } catch (e) {
    if (e instanceof ApiError) {
      return ctx.render({ error: e.message, email });
    }
    return ctx.render({
      error: "Backend nicht erreichbar. Läuft `cargo run` im inplicit-backend?",
      email,
    });
  }
}

async function magicLinkSignIn(
  // deno-lint-ignore no-explicit-any
  ctx: any,
  email: string,
) {
  try {
    const result = await makeApi().auth.sendMagicLink(email);
    console.log(`[auth] Magic link request for ${email}`);
    return ctx.render({
      message: `Anmeldelink wurde an ${email} gesendet.`,
      devLink: result.dev_link,
      email,
    });
  } catch (e) {
    console.error("[auth] sendMagicLink failed:", e);
    return ctx.render({ error: (e as Error).message, email });
  }
}

export default function LoginPage({ data }: PageProps<Data>) {
  return (
    <html lang="de" data-theme="light">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Anmelden - Inplicit</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href={asset("/design.css")} />
      </head>
      <body class="shell login-shell">
        <main class="login-main">
          <a href="/admin/campaigns" class="login-wordmark" aria-label="Inplicit">
            <img
              src={asset("/logo.svg")}
              alt="Inplicit"
              class="login-wordmark__logo"
            />
          </a>

          <div class="card login-card">
            <span class="eyebrow">Anmelden</span>
            <h1 class="headline login-headline">
              Inplicit Dashboard.
            </h1>
            <p class="page-header__meta" style="margin-top: var(--space-3)">
              Mit Passwort anmelden, oder das Feld leer lassen für einen
              Magic-Link per Email.
            </p>

            {data.error && (
              <div class="flash flash--err login-flash">{data.error}</div>
            )}

            {data.message && (
              <div class="flash flash--ok login-flash">
                {data.message}
                {data.devLink && (
                  <div class="login-devlink">
                    <span class="eyebrow" style="color: var(--color-accent-strong)">
                      Direktlink
                    </span>
                    <a class="mono login-devlink__a" href={data.devLink}>
                      {data.devLink}
                    </a>
                  </div>
                )}
              </div>
            )}

            <form method="POST" class="login-form">
              <label class="field">
                <span class="field__label">E-Mail-Adresse</span>
                <input
                  type="email"
                  name="email"
                  required
                  defaultValue={data.email}
                  class="input"
                  placeholder="sie@unternehmen.de"
                  autocomplete="email"
                />
              </label>
              <label class="field">
                <span class="field__label">
                  Passwort{" "}
                  <span class="caption">(optional - sonst Magic-Link)</span>
                </span>
                <input
                  type="password"
                  name="password"
                  class="input"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
              </label>
              <button type="submit" class="btn btn--primary btn--lg login-btn">
                Anmelden
              </button>
            </form>
          </div>
        </main>

        <style>{`
          .login-shell {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--space-8) var(--space-4);
          }
          .login-main {
            width: 100%;
            max-width: 440px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-8);
          }
          .login-wordmark { display: inline-flex; }
          .login-wordmark__logo { height: 24px; width: auto; display: block; }
          .login-card { width: 100%; padding: var(--space-10); }
          .login-headline {
            margin-top: var(--space-3);
            font-size: clamp(1.75rem, 3vw, 2.25rem);
          }
          .login-flash { margin-top: var(--space-6); }
          .login-form {
            margin-top: var(--space-6);
            display: flex;
            flex-direction: column;
            gap: var(--space-4);
          }
          .login-btn { width: 100%; }
          .login-devlink {
            margin-top: var(--space-3);
            padding-top: var(--space-3);
            border-top: 1px solid var(--color-accent-muted);
            display: flex;
            flex-direction: column;
            gap: var(--space-1);
          }
          .login-devlink__a {
            color: var(--color-accent-strong);
            word-break: break-all;
          }
          .login-devlink__a:hover { text-decoration: underline; }
        `}</style>
      </body>
    </html>
  );
}
