"use client";

import { useState, type ReactNode } from "react";
import {
  Bell,
  Languages,
  Shield,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Me } from "@/lib/api";

// ─── Schema ──────────────────────────────────────────────────────────────────

export interface SettingsContext {
  me?: Me;
  /** Best-effort flash for inline section feedback. */
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
  /** Override or extend default sections. Pass `[...defaults, ...extras]`. */
  sections?: SettingsSection[];
}

// ─── Default sections ────────────────────────────────────────────────────────

function NotificationsSection(_ctx: SettingsContext) {
  const [verifiedHypotheses, setVerifiedHypotheses] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [interviewIssues, setInterviewIssues] = useState(true);

  return (
    <div className="space-y-5">
      <Row
        label="Verifizierte Hypothesen"
        sub="E-Mail, sobald eine Hypothese auf VERIFIED springt."
      >
        <Switch
          checked={verifiedHypotheses}
          onCheckedChange={setVerifiedHypotheses}
        />
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
        <Switch
          checked={interviewIssues}
          onCheckedChange={setInterviewIssues}
        />
      </Row>
    </div>
  );
}

function LanguageSection(ctx: SettingsContext) {
  const initial = ctx.me?.org?.default_locale ?? "de";
  const [locale, setLocale] = useState<string>(initial);
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
              "flex items-start gap-3 rounded-card border p-4 text-left transition-all",
              locale === opt.id
                ? "border-accent-strong bg-accent-soft shadow-card"
                : "border-line bg-canvas hover:border-fg-subtle hover:shadow-card",
              busy && "opacity-60",
            )}
          >
            <Languages
              className={cn(
                "h-4 w-4 mt-0.5 flex-shrink-0",
                locale === opt.id ? "text-accent-strong" : "text-fg-subtle",
              )}
            />
            <div>
              <p className="text-sm font-medium text-fg">{opt.label}</p>
              <p className="font-mono text-xs text-fg-subtle">{opt.sub}</p>
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
      window.location.assign("/admin/logout");
    } catch (e) {
      ctx.flash((e as Error).message, "err");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Row
        label="Abmelden"
        sub="Beendet die aktuelle Session auf diesem Gerät."
      >
        <form method="POST" action="/admin/logout">
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
          className="text-pain hover:bg-pain-soft hover:text-pain"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {confirming ? "Wirklich löschen" : "Account löschen"}
        </Button>
      </Row>
      {confirming && (
        <p className="text-xs text-pain">
          Klick erneut, um die Löschung endgültig zu bestätigen. Diese Aktion ist
          nicht umkehrbar.
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

// ─── Component ───────────────────────────────────────────────────────────────

export function SettingsDialog({
  me,
  trigger,
  sections = DEFAULT_SETTINGS_SECTIONS,
}: SettingsDialogProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const [flash, setFlash] = useState<{ type: "ok" | "err"; msg: string } | null>(
    null,
  );
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
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-line bg-secondary/40">
          <DialogTitle>Einstellungen</DialogTitle>
          <DialogDescription>
            Konto-, Workspace- und Sicherheits-Optionen.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[200px_1fr] min-h-[420px]">
          {/* Section nav */}
          <nav className="border-r border-line bg-surface/50 p-2">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === active?.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-ui px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-canvas font-medium text-fg shadow-card"
                      : "text-fg-muted hover:bg-canvas hover:text-fg",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Active section */}
          <div className="flex flex-col">
            <DialogBody className="flex-1">
              {active && (
                <>
                  <div className="mb-5 flex items-center gap-3">
                    {ActiveIcon && (
                      <span className="grid size-9 place-items-center rounded-ui bg-secondary text-fg">
                        <ActiveIcon className="h-4 w-4" />
                      </span>
                    )}
                    <div>
                      <h3 className="text-base font-semibold text-fg">
                        {active.label}
                      </h3>
                      {active.description && (
                        <p className="text-xs text-fg-muted">
                          {active.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {active.render(ctx)}
                </>
              )}
            </DialogBody>

            {flash && (
              <div
                className={cn(
                  "border-t border-line px-5 py-3 text-sm",
                  flash.type === "ok"
                    ? "bg-success-soft text-success"
                    : "bg-pain-soft text-pain",
                )}
                role="status"
              >
                {flash.msg}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    <div className="flex items-start justify-between gap-4 rounded-ui border border-line bg-canvas p-4">
      <div className="min-w-0">
        <Label className="block text-sm font-medium text-fg">{label}</Label>
        {sub && <p className="mt-1 text-xs text-fg-muted">{sub}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
