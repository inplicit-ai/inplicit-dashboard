"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusDisc } from "@/components/ui/status-disc";
import { cn } from "@/lib/utils";

interface LoginCardProps {
  signIn: (formData: FormData) => Promise<void>;
  defaultEmail?: string;
  error?: string;
  message?: string;
  devLink?: string;
}

/**
 * Auth is the sanctioned home for display type + the hero accent wash. A single
 * centered instrument card on warm off-white: eyebrow → display headline → one
 * supporting line → form. Near-black primary button (amber is NOT a button fill
 * in-app). The only amber is the input focus ring and the single sent/error
 * StatusDisc on the magic-link / error confirmation — the lone live signal.
 */
export function LoginCard({
  signIn,
  defaultEmail,
  error,
  message,
  devLink,
}: LoginCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"magic" | "password">("magic");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Hero accent wash — sanctioned for auth only, faint and behind the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42vh]"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, var(--color-accent-soft), transparent 70%)",
        }}
      />

      <div className="relative flex w-full max-w-[420px] flex-col items-center gap-10">
        <Link
          href="/campaigns"
          aria-label="Inplicit"
          className="opacity-90 transition-opacity hover:opacity-100"
        >
          <Image
            src="/logo.svg"
            alt="Inplicit"
            width={110}
            height={22}
            priority
            className="h-5 w-auto"
          />
        </Link>

        <Card className="card--reading w-full overflow-hidden rounded-card border border-line bg-surface p-0">
          <div className="px-8 pb-8 pt-9">
            <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-accent">
              {mode === "magic" ? "Magic-Link" : "Passwort"}
            </span>
            <h1 className="headline mt-3 text-fg">Willkommen zurück</h1>
            <p className="body-sm mt-3 text-fg-muted">
              {mode === "magic"
                ? "Wir schicken dir einen sicheren Einmal-Link."
                : "Melde dich mit deinem Passwort an."}
            </p>

            {error && (
              <div className="mt-6">
                <StatusBanner type="err" message={error} />
              </div>
            )}
            {message && (
              <div className="mt-6">
                <StatusBanner type="ok">
                  <p className="text-fg">{message}</p>
                  {devLink && (
                    <div className="mt-3 border-t border-line-subtle pt-3">
                      <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
                        Dev-Link
                      </p>
                      <a
                        href={devLink}
                        className="mt-1 block break-all font-mono font-mono tabular-nums tabular-nums text-fg hover:underline"
                      >
                        {devLink}
                      </a>
                    </div>
                  )}
                </StatusBanner>
              </div>
            )}

            <form action={signIn} className="mt-7 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="label-eyebrow">
                  E-Mail-Adresse
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    defaultValue={defaultEmail ?? ""}
                    placeholder="du@firma.de"
                    autoComplete="email"
                    className="h-9 pl-9 text-sm"
                  />
                </div>
              </div>

              {mode === "password" && (
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="label-eyebrow">
                    Passwort
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="h-9 pl-9 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Passwort verbergen" : "Passwort anzeigen"
                      }
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-sm p-1.5 text-fg-subtle transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <Button type="submit" size="lg" className="mt-1 w-full">
                {mode === "magic" ? "Magic Link senden" : "Anmelden"}
              </Button>
            </form>

            {/* Mode switch as a hairline-ruled spec line, not a second button. */}
            <div className="mt-6 border-t border-line-subtle pt-4">
              <button
                type="button"
                onClick={() =>
                  setMode((m) => (m === "magic" ? "password" : "magic"))
                }
                className="text-meta text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {mode === "magic"
                  ? "Stattdessen mit Passwort anmelden →"
                  : "Stattdessen Magic Link senden →"}
              </button>
            </div>
          </div>
        </Card>

        <p className="text-center text-caption text-fg-subtle">
          Inplicit AI · Enterprise-Interviews
        </p>
      </div>
    </div>
  );
}

/**
 * Status confirmation — sits on the spine via a single StatusDisc (sent = live,
 * the lone amber pulse; error = error disc). No icon chrome, no nested box edge
 * beyond one hairline.
 */
function StatusBanner({
  type,
  message,
  children,
}: {
  type: "ok" | "err";
  message?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      role={type === "err" ? "alert" : "status"}
      className={cn(
        "grid grid-cols-[var(--spine-w,28px)_1fr] gap-x-2.5 rounded-ui border px-3.5 py-3 text-meta",
        type === "ok"
          ? "border-line-subtle bg-surface-2"
          : "border-danger/22 bg-danger-soft text-danger",
      )}
      style={{ ["--spine-w" as string]: "20px" }}
    >
      <span className="flex justify-center pt-0.5">
        <StatusDisc state={type === "ok" ? "live" : "error"} size="sm" />
      </span>
      <div className="min-w-0 leading-snug">
        {message && <p>{message}</p>}
        {children}
      </div>
    </div>
  );
}
