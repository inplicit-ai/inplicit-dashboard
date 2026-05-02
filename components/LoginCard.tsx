"use client";

import * as React from "react";
import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface LoginCardProps {
  signIn: (formData: FormData) => Promise<void>;
  defaultEmail?: string;
  error?: string;
  message?: string;
  devLink?: string;
}

export function LoginCard({ signIn, defaultEmail, error, message, devLink }: LoginCardProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-shell">
      <div className="login-main">
        <a href="/campaigns" aria-label="Inplicit">
          <Image
            src="/logo.svg"
            alt="Inplicit"
            width={120}
            height={24}
            priority
            style={{ height: 24, width: "auto" }}
          />
        </a>

        <div className="card login-card">
          <span className="eyebrow">Sign in</span>
          <h1 className="headline login-headline">Inplicit Dashboard.</h1>
          <p style={{ marginTop: "var(--space-3)", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Enter your email and password, or leave the password blank to receive a magic link.
          </p>

          {error && (
            <div className="flash flash--err login-flash">{error}</div>
          )}
          {message && (
            <div className="flash flash--ok login-flash">
              {message}
              {devLink && (
                <div className="login-devlink">
                  <span className="eyebrow" style={{ color: "var(--color-accent-strong)" }}>Dev link</span>
                  <a className="mono login-devlink__a" href={devLink}>{devLink}</a>
                </div>
              )}
            </div>
          )}

          <form action={signIn} className="login-form">
            <div className="field">
              <Label htmlFor="email" className="field__label">Email address</Label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-quaternary)",
                    pointerEvents: "none",
                  }}
                />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  defaultValue={defaultEmail ?? ""}
                  placeholder="you@company.com"
                  autoComplete="email"
                  style={{ paddingLeft: "2.25rem" }}
                />
              </div>
            </div>

            <div className="field">
              <Label htmlFor="password" className="field__label">
                Password{" "}
                <span style={{ color: "var(--color-text-quaternary)", fontWeight: 400 }}>(optional — magic link)</span>
              </Label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-quaternary)",
                    pointerEvents: "none",
                  }}
                />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingLeft: "2.25rem", paddingRight: "2.5rem" }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    padding: "6px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-text-quaternary)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn--primary btn--lg login-btn">
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
