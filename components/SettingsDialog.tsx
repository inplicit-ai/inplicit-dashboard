"use client";

import { useState, type ReactNode } from "react";
import { Bell, Languages, Shield, Trash2, X, type LucideIcon } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Me } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SettingsContext {
  me?: Me;
  flash: (msg: string, type?: "ok" | "err") => void;
}

export interface SettingsSection {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  render: (ctx: SettingsContext) => ReactNode;
}

interface SettingsDialogProps {
  me?: Me;
  trigger: ReactNode;
  sections?: SettingsSection[];
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function NotificationsSection(_ctx: SettingsContext) {
  const [verifiedHypotheses, setVerifiedHypotheses] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [interviewIssues, setInterviewIssues] = useState(true);

  return (
    <div className="space-y-3">
      <Row
        label="Verifizierte Hypothesen"
        sub="E-Mail, sobald eine Hypothese auf VERIFIED springt."
      >
        <Switch checked={verifiedHypotheses} onCheckedChange={setVerifiedHypotheses} />
      </Row>
      <Row
        label="Wöchentlicher Digest"
        sub="Übersicht aller laufenden Audits, jeden Montag."
      >
        <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
      </Row>
      <Row
        label="Interview-Probleme"
        sub="Wenn ein Interview ABANDONED oder FAILED ist."
      >
        <Switch checked={interviewIssues} onCheckedChange={setInterviewIssues} />
      </Row>
    </div>
  );
}

function LanguageSection(ctx: SettingsContext) {
  const initial = ctx.me?.org?.default_locale ?? "de";
  const [locale, setLocale] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function save(next: string) {
    if (!ctx.me?.org_id) return;
    setBusy(true);
    setLocale(next);
    try {
      const res = await fetch(`/dapi/staff/orgs/${ctx.me.org_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_locale: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ctx.flash("Sprache aktualisiert.");
    } catch (e) {
      ctx.flash((e as Error).message, "err");
      setLocale(initial);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        Standardsprache für neue Interviews. Bestehende Audits bleiben unverändert.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          { id: "de", label: "Deutsch", sub: "DE-DE" },
          { id: "en", label: "English", sub: "EN-US" },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => void save(opt.id)}
            disabled={busy || locale === opt.id}
            className={cn(
              "flex items-start gap-3 rounded-ui border p-4 text-left transition-all duration-150",
              locale === opt.id
                ? "border-accent bg-accent-soft"
                : "border-line bg-surface hover:bg-surface-2",
              busy && "opacity-60",
            )}
          >
            <Languages
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                locale === opt.id ? "text-accent" : "text-fg-subtle",
              )}
            />
            <div>
              <p className="text-sm font-medium text-fg">{opt.label}</p>
              <p className="font-mono text-xs text-fg-muted">{opt.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SecuritySection(ctx: SettingsContext) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function deleteAccount() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/dapi/me", { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ctx.flash("Account-Löschung angestoßen. Du wirst gleich abgemeldet.");
      window.location.assign("/logout");
    } catch (e) {
      ctx.flash((e as Error).message, "err");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Row label="Abmelden" sub="Beendet die aktuelle Session auf diesem Gerät.">
        <form method="POST" action="/logout">
          <Button type="submit" variant="outline" size="sm">
            Abmelden
          </Button>
        </form>
      </Row>
      <Row
        label="Account löschen"
        sub="Entfernt deinen Account und alle damit verknüpften Daten (GDPR Art. 17)."
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void deleteAccount()}
          disabled={busy}
          className="text-pain hover:bg-pain-soft hover:border-pain-muted hover:text-pain"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {confirming ? "Wirklich löschen?" : "Account löschen"}
        </Button>
      </Row>
      {confirming && (
        <p className="rounded-ui border border-pain-muted bg-pain-soft px-4 py-3 text-xs text-pain">
          Klick erneut auf „Wirklich löschen?", um den Account endgültig zu entfernen.
          Diese Aktion ist nicht umkehrbar.
        </p>
      )}
    </div>
  );
}

export const DEFAULT_SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "notifications",
    label: "Benachrichtigungen",
    description: "E-Mails und In-App-Hinweise.",
    icon: Bell,
    render: NotificationsSection,
  },
  {
    id: "language",
    label: "Sprache",
    description: "Standard-Locale für neue Interviews.",
    icon: Languages,
    render: LanguageSection,
  },
  {
    id: "security",
    label: "Sicherheit",
    description: "Sessions und Account-Löschung.",
    icon: Shield,
    render: SecuritySection,
  },
];

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function SettingsDialog({
  me,
  trigger,
  sections = DEFAULT_SETTINGS_SECTIONS,
}: SettingsDialogProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const [flash, setFlash] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const active = sections.find((s) => s.id === activeId) ?? sections[0];
  const ActiveIcon = active?.icon;

  const ctx: SettingsContext = {
    me,
    flash: (msg, type = "ok") => {
      setFlash({ msg, type });
      setTimeout(() => setFlash(null), 4000);
    },
  };

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] sm:max-w-3xl",
            "-translate-x-1/2 -translate-y-1/2",
            "rounded-card border border-line bg-canvas shadow-elevation overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line bg-surface px-6 py-4">
            <div>
              <DialogPrimitive.Title className="text-sm font-semibold text-fg">
                Einstellungen
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-0.5 text-xs text-fg-muted">
                Konto-, Workspace- und Sicherheits-Optionen.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="grid size-7 place-items-center rounded-ui text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <X className="h-4 w-4" />
              <span className="sr-only">Schließen</span>
            </DialogPrimitive.Close>
          </div>

          {/* Body: left nav + right content */}
          <div className="grid grid-cols-[200px_1fr] min-h-[440px]">
            {/* Section nav */}
            <nav
              className="border-r border-line bg-surface p-2"
              aria-label="Einstellungs-Bereiche"
            >
              {sections.map((s) => {
                const Icon = s.icon;
                const isActive = s.id === active?.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveId(s.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-ui px-3 py-2.5 text-sm transition-all duration-150",
                      isActive
                        ? "bg-canvas font-medium text-fg shadow-sm"
                        : "text-fg-muted hover:bg-canvas hover:text-fg",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-accent" : "text-fg-subtle",
                      )}
                    />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Active section */}
            <div className="flex flex-col">
              <div className="flex-1 p-6">
                {active && (
                  <>
                    <div className="mb-5 flex items-center gap-3">
                      {ActiveIcon && (
                        <span className="grid size-8 shrink-0 place-items-center rounded-ui bg-accent-soft text-accent">
                          <ActiveIcon className="h-4 w-4" />
                        </span>
                      )}
                      <div>
                        <h3 className="text-sm font-semibold text-fg">{active.label}</h3>
                        {active.description && (
                          <p className="text-xs text-fg-muted">{active.description}</p>
                        )}
                      </div>
                    </div>
                    {active.render(ctx)}
                  </>
                )}
              </div>

              {flash && (
                <div
                  role="status"
                  className={cn(
                    "border-t border-line px-5 py-3 text-sm",
                    flash.type === "ok"
                      ? "bg-success-soft text-success"
                      : "bg-pain-soft text-pain",
                  )}
                >
                  {flash.msg}
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-ui border border-line bg-surface p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-fg-muted">{sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
