import Image from "next/image";
import { redirect } from "next/navigation";
import { ApiError, makeApi } from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import "../login/login.css";

interface SetPasswordSearchParams {
  error?: string;
}

/**
 * First-login password set. Reached automatically after a magic-link verify
 * when `me.must_set_password` is true. The page is also linked from the
 * SettingsDialog as "Passwort ändern".
 */
export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SetPasswordSearchParams>;
}) {
  // skipSetPassword=true so we don't loop on our own redirect.
  const { me } = await requireUser({ skipSetPassword: true });
  const sp = await searchParams;

  async function submit(formData: FormData) {
    "use server";
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (password.length < 10) {
      redirect(
        "/set-password?error=" +
          encodeURIComponent("Mindestens 10 Zeichen."),
      );
    }
    if (password !== confirm) {
      redirect(
        "/set-password?error=" +
          encodeURIComponent("Die Passwörter stimmen nicht überein."),
      );
    }

    const cookie = await requestCookie();
    try {
      await makeApi(cookie).auth.setPassword(password);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      redirect("/set-password?error=" + encodeURIComponent(msg));
    }

    const target =
      me.role === "INPLICIT_ADMIN" || me.role === "INPLICIT_STAFF"
        ? "/staff/orgs"
        : "/campaigns";
    redirect(target);
  }

  const isFirstTime = me.must_set_password === true;

  return (
    <main className="login-shell">
      <div className="login-main">
        <a href="/" className="login-wordmark" aria-label="Inplicit">
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
          <span className="eyebrow">
            {isFirstTime ? "Konto einrichten" : "Passwort ändern"}
          </span>
          <h1 className="headline login-headline">
            {isFirstTime ? "Lege dein Passwort fest." : "Neues Passwort."}
          </h1>
          <p
            className="page-header__meta"
            style={{ marginTop: "var(--space-3)" }}
          >
            {isFirstTime
              ? "Ab jetzt meldest du dich mit E-Mail und Passwort an. Den Magic-Link brauchst du nur noch, falls du das Passwort vergisst."
              : "Mindestens 10 Zeichen. Beide Felder müssen übereinstimmen."}
          </p>

          {sp.error && (
            <div className="flash flash--err login-flash">{sp.error}</div>
          )}

          <form action={submit} className="login-form">
            <label className="field">
              <span className="field__label">Neues Passwort</span>
              <input
                type="password"
                name="password"
                required
                minLength={10}
                className="input"
                placeholder="••••••••••"
                autoComplete="new-password"
              />
            </label>
            <label className="field">
              <span className="field__label">Passwort bestätigen</span>
              <input
                type="password"
                name="confirm"
                required
                minLength={10}
                className="input"
                placeholder="••••••••••"
                autoComplete="new-password"
              />
            </label>
            <button
              type="submit"
              className="btn btn--primary btn--lg login-btn"
            >
              Speichern
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
