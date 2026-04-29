import { Handlers, PageProps } from "$fresh/server.ts";
import { asset } from "$fresh/runtime.ts";
import { api } from "../../lib/api.ts";

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
    if (!email) return ctx.render({ error: "E-Mail fehlt." });

    try {
      const result = await api.auth.sendMagicLink(email);
      console.log(`[auth] Magic link sent to ${email}`);
      return ctx.render({
        message: `Anmeldelink wurde an ${email} gesendet. (Dev: siehe Backend-Konsole.)`,
        devLink: result.dev_link,
        email,
      });
    } catch (e) {
      console.error("[auth] sendMagicLink failed:", e);
      return ctx.render({ error: (e as Error).message, email });
    }
  },
};

export default function LoginPage({ data }: PageProps<Data>) {
  return (
    <html lang="de" data-theme="light">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Anmelden — Inplicit</title>
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
          <a href="/admin/campaigns" class="wordmark login-wordmark">
            <span class="wordmark__dot" />
            <span>Inplicit</span>
          </a>

          <div class="card login-card">
            <span class="eyebrow">Anmelden</span>
            <h1 class="headline login-headline">
              Magic Link.
              <span class="headline__muted">Kein Passwort nötig.</span>
            </h1>
            <p class="page-header__meta" style="margin-top: var(--space-3)">
              Wir senden dir einen einmaligen Anmeldelink an deine E-Mail.
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
                      Dev — Direktlink
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
                />
              </label>
              <button type="submit" class="btn btn--primary btn--lg login-btn">
                Magic Link senden
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
          .login-wordmark { font-size: var(--text-body); }
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
