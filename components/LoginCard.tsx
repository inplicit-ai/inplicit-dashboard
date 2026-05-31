"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, Lock, Mail, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface LoginCardProps {
  signIn: (formData: FormData) => Promise<void>;
  defaultEmail?: string;
  error?: string;
  message?: string;
  devLink?: string;
}

/**
 * White-modernist auth — a single calm centered card on the off-white canvas
 * with a faint accent wash behind it. Big confident sans greeting, one muted
 * supporting line, a clean form, and a near-black primary button. Amber is
 * reserved for the input focus ring; status banners use semantic soft tints.
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
      {/* Faint accent wash — sanctioned for auth only, behind the card. */}
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

        <Card className="w-full p-8 sm:p-9">
          <h1 className="text-[length:var(--text-display)] font-semibold leading-[1.15] tracking-[-0.02em] text-fg">
            Willkommen zurück
          </h1>
          <p className="mt-2 text-[length:var(--text-body-lg)] text-fg-muted">
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
                    <p className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
                      Dev-Link
                    </p>
                    <a
                      href={devLink}
                      className="mt-1 block break-all font-mono text-[length:var(--text-mono)] text-fg hover:underline"
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
              <Label htmlFor="email">E-Mail-Adresse</Label>
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
                  className="pl-9"
                />
              </div>
            </div>

            {mode === "password" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Passwort</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pl-9 pr-10"
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

          {/* Mode switch as a quiet text link, not a second button. */}
          <div className="mt-6 border-t border-line-subtle pt-4">
            <button
              type="button"
              onClick={() =>
                setMode((m) => (m === "magic" ? "password" : "magic"))
              }
              className="text-[length:var(--text-meta)] text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {mode === "magic"
                ? "Stattdessen mit Passwort anmelden →"
                : "Stattdessen Magic Link senden →"}
            </button>
          </div>
        </Card>

        <p className="text-center text-[length:var(--text-caption)] text-fg-subtle">
          Inplicit AI · Enterprise-Interviews
        </p>
      </div>
    </div>
  );
}

/**
 * Status confirmation — a clean soft-tinted banner with a leading semantic icon.
 * Success uses the success-soft tint; error uses danger-soft.
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
  const Icon = type === "ok" ? CheckCircle2 : TriangleAlert;
  return (
    <div
      role={type === "err" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-ui border px-3.5 py-3 text-[length:var(--text-meta)]",
        type === "ok"
          ? "border-success/20 bg-success-soft"
          : "border-danger/22 bg-danger-soft text-danger",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          type === "ok" ? "text-success" : "text-danger",
        )}
      />
      <div className="min-w-0 leading-snug">
        {message && <p>{message}</p>}
        {children}
      </div>
    </div>
  );
}
