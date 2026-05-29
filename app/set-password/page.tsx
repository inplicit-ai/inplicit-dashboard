import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { ApiError, makeApi } from "@/lib/api";
import { requireUser, requestCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eyebrow } from "@/components/PageChrome";

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
        "/set-password?error=" + encodeURIComponent("Mindestens 10 Zeichen."),
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
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-8">
        <Link href="/" aria-label="Inplicit">
          <Image
            src="/logo.svg"
            alt="Inplicit"
            width={120}
            height={24}
            priority
            className="h-6 w-auto"
          />
        </Link>

        <Card className="card-elevated w-full rounded-card border border-line bg-surface p-8 sm:p-10">
          <Eyebrow>
            {isFirstTime ? "Konto einrichten" : "Passwort ändern"}
          </Eyebrow>
          <h1 className="mt-3 text-3xl font-medium leading-tight tracking-tight text-fg sm:text-4xl">
            {isFirstTime ? "Lege dein Passwort fest." : "Neues Passwort."}
          </h1>
          <p className="mt-3 text-sm text-fg-muted">
            {isFirstTime
              ? "Ab jetzt meldest du dich mit E-Mail und Passwort an. Den Magic-Link brauchst du nur noch, falls du das Passwort vergisst."
              : "Mindestens 10 Zeichen. Beide Felder müssen übereinstimmen."}
          </p>

          {sp.error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-ui border border-danger/22 bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-snug">{sp.error}</p>
            </div>
          )}

          <form action={submit} className="mt-6 flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-fg-muted"
              >
                Neues Passwort
              </Label>
              <Input
                id="password"
                type="password"
                name="password"
                required
                minLength={10}
                placeholder="••••••••••"
                autoComplete="new-password"
                className="h-11 text-base md:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="confirm"
                className="text-xs font-medium text-fg-muted"
              >
                Passwort bestätigen
              </Label>
              <Input
                id="confirm"
                type="password"
                name="confirm"
                required
                minLength={10}
                placeholder="••••••••••"
                autoComplete="new-password"
                className="h-11 text-base md:text-sm"
              />
            </div>
            <Button type="submit" size="lg" className="mt-2 w-full">
              Speichern
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
