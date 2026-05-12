"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface LoginCardProps {
  signIn: (formData: FormData) => Promise<void>;
  defaultEmail?: string;
  error?: string;
  message?: string;
  devLink?: string;
}

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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-[400px] flex-col items-center gap-10">

        <Link href="/campaigns" aria-label="Inplicit" className="opacity-90 transition-opacity hover:opacity-100">
          <Image src="/logo.svg" alt="Inplicit" width={110} height={22} priority className="h-5 w-auto" />
        </Link>

        <Card className="w-full overflow-hidden rounded-2xl border-line bg-surface shadow-lg">
          <div className="px-7 pb-7 pt-8">
            <div className="mb-6 space-y-1">
              <h1 className="text-xl font-semibold tracking-tight text-fg">
                Willkommen zurück
              </h1>
              <p className="text-sm text-fg-muted">
                {mode === "magic"
                  ? "Wir schicken dir einen sicheren Einmal-Link."
                  : "Melde dich mit deinem Passwort an."}
              </p>
            </div>

            {error && <StatusBanner type="err" message={error} />}
            {message && (
              <StatusBanner type="ok">
                <p>{message}</p>
                {devLink && (
                  <div className="mt-2.5 border-t border-success/20 pt-2.5">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-70">
                      Dev-Link
                    </p>
                    <a
                      href={devLink}
                      className="block break-all font-mono text-xs hover:underline"
                    >
                      {devLink}
                    </a>
                  </div>
                )}
              </StatusBanner>
            )}

            <form action={signIn} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-fg-muted">
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
                    className="h-10 pl-9 text-sm"
                  />
                </div>
              </div>

              {mode === "password" && (
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-fg-muted">
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
                      className="h-10 pl-9 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
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

              <Button type="submit" className="mt-1 h-10 w-full text-sm font-medium">
                {mode === "magic" ? "Magic Link senden" : "Anmelden"}
              </Button>
            </form>

            <div className="mt-5 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="shrink-0 text-[11px] text-fg-subtle">oder</span>
              <Separator className="flex-1" />
            </div>

            <button
              type="button"
              onClick={() => setMode((m) => (m === "magic" ? "password" : "magic"))}
              className="mt-4 w-full rounded-ui border border-line bg-canvas px-4 py-2.5 text-center text-xs text-fg-muted transition-colors hover:border-line-strong hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {mode === "magic"
                ? "Mit Passwort anmelden"
                : "Magic Link senden"}
            </button>
          </div>
        </Card>

        <p className="text-center text-xs text-fg-subtle">
          Inplicit AI · Enterprise-Interviews
        </p>
      </div>
    </div>
  );
}

function StatusBanner({
  type,
  message,
  children,
}: {
  type: "ok" | "err";
  message?: string;
  children?: React.ReactNode;
}) {
  const Icon = type === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={type === "err" ? "alert" : "status"}
      className={cn(
        "mb-4 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
        type === "ok"
          ? "border-success/30 bg-success-soft text-success"
          : "border-pain/30 bg-pain-soft text-pain",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 leading-snug">
        {message && <p>{message}</p>}
        {children}
      </div>
    </div>
  );
}
