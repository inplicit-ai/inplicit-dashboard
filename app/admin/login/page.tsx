import Image from "next/image";
import { redirect } from "next/navigation";
import { ApiError, makeApi } from "@/lib/api";
import "./login.css";

const API_BASE = process.env.API_URL ?? "http://localhost:8080";

interface LoginSearchParams {
  email?: string;
  error?: string;
  message?: string;
  devLink?: string;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const sp = await searchParams;

  async function signIn(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!email) {
      redirect("/admin/login?error=" + encodeURIComponent("E-Mail fehlt."));
    }

    if (password) {
      // Password sign-in (staff path). Returns Set-Cookie on success.
      const res = await fetch(`${API_BASE}/api/auth/sign-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const detail = await res.json();
          if (detail && typeof detail === "object" && "error" in detail) {
            msg = String((detail as { error: string }).error);
          }
        } catch {}
        redirect(
          `/admin/login?error=${encodeURIComponent(msg)}&email=${encodeURIComponent(email)}`,
        );
      }
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        // Forward the backend's Set-Cookie via Next's cookies() helper.
        const { cookies } = await import("next/headers");
        const jar = await cookies();
        const first = setCookie.split(",")[0];
        const [pair] = first.split(";");
        const [name, ...rest] = pair.split("=");
        jar.set(name.trim(), rest.join("=").trim(), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
      }
      const meCookie = setCookie?.split(";")[0] ?? "";
      let location = "/admin/campaigns";
      try {
        const me = await makeApi(meCookie).me();
        location =
          me.role === "INPLICIT_STAFF" ? "/staff/orgs" : "/admin/campaigns";
      } catch {
        // ignore — fall back to customer dashboard
      }
      redirect(location);
    }

    // Magic-link path — just trigger send and bounce back with a message.
    try {
      const result = await makeApi().auth.sendMagicLink(email);
      const params = new URLSearchParams({
        message: `Anmeldelink wurde an ${email} gesendet.`,
        email,
      });
      if (result.dev_link) params.set("devLink", result.dev_link);
      redirect("/admin/login?" + params.toString());
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect(
        `/admin/login?error=${encodeURIComponent(msg)}&email=${encodeURIComponent(email)}`,
      );
    }
  }

  return (
    <main className="login-shell">
      <div className="login-main">
        <a href="/admin/campaigns" className="login-wordmark" aria-label="Inplicit">
          <Image
            src="/logo.svg"
            alt="Inplicit"
            width={120}
            height={24}
            className="login-wordmark__logo"
            priority
          />
        </a>

        <div className="card login-card">
          <span className="eyebrow">Anmelden</span>
          <h1 className="headline login-headline">Inplicit Dashboard.</h1>
          <p className="page-header__meta" style={{ marginTop: "var(--space-3)" }}>
            Mit Passwort anmelden, oder das Feld leer lassen für einen Magic-Link
            per E-Mail.
          </p>

          {sp.error && (
            <div className="flash flash--err login-flash">{sp.error}</div>
          )}
          {sp.message && (
            <div className="flash flash--ok login-flash">
              {sp.message}
              {sp.devLink && (
                <div className="login-devlink">
                  <span
                    className="eyebrow"
                    style={{ color: "var(--color-accent-strong)" }}
                  >
                    Direktlink
                  </span>
                  <a className="mono login-devlink__a" href={sp.devLink}>
                    {sp.devLink}
                  </a>
                </div>
              )}
            </div>
          )}

          <form action={signIn} className="login-form">
            <label className="field">
              <span className="field__label">E-Mail-Adresse</span>
              <input
                type="email"
                name="email"
                required
                defaultValue={sp.email ?? ""}
                className="input"
                placeholder="sie@unternehmen.de"
                autoComplete="email"
              />
            </label>
            <label className="field">
              <span className="field__label">
                Passwort{" "}
                <span className="caption">(optional — sonst Magic-Link)</span>
              </span>
              <input
                type="password"
                name="password"
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>
            <button type="submit" className="btn btn--primary btn--lg login-btn">
              Anmelden
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
