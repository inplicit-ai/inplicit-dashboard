"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eyebrow } from "@/components/PageChrome";
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

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-8">
        <Link href="/campaigns" aria-label="Inplicit">
          <Image
            src="/logo.svg"
            alt="Inplicit"
            width={120}
            height={24}
            priority
            className="h-6 w-auto"
          />
        </Link>

        <Card className="w-full rounded-card border-line bg-surface p-8 sm:p-10">
          <Eyebrow>Sign in</Eyebrow>
          <h1 className="mt-3 text-3xl font-medium leading-tight tracking-tight text-fg sm:text-4xl">
            Inplicit Dashboard.
          </h1>
          <p className="mt-3 text-sm text-fg-muted">
            Enter your email and password, or leave the password blank to
            receive a magic link.
          </p>

          {error && <Banner type="err" message={error} />}
          {message && (
            <Banner type="ok">
              {message}
              {devLink && (
                <div className="mt-3 space-y-1 border-t border-success/20 pt-3">
                  <Eyebrow className="text-success">Dev link</Eyebrow>
                  <a
                    className="block break-all font-mono text-xs text-success hover:underline"
                    href={devLink}
                  >
                    {devLink}
                  </a>
                </div>
              )}
            </Banner>
          )}

          <form action={signIn} className="mt-6 flex flex-col gap-4">
            <Field>
              <Label htmlFor="email" className="text-xs font-medium text-fg-muted">
                Email address
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  defaultValue={defaultEmail ?? ""}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="h-11 pl-9 text-base md:text-sm"
                />
              </div>
            </Field>

            <Field>
              <Label htmlFor="password" className="text-xs font-medium text-fg-muted">
                Password{" "}
                <span className="font-normal text-fg-subtle">
                  (optional — magic link)
                </span>
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-11 pl-9 pr-10 text-base md:text-sm"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-sm p-1.5 text-fg-subtle transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>

            <Button type="submit" size="lg" className="mt-2 w-full">
              Continue
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function Banner({
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
      role="status"
      className={cn(
        "mt-6 flex items-start gap-2.5 rounded-ui border px-3.5 py-2.5 text-sm",
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
