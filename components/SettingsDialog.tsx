"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  Bell,
  ChevronRight,
  Languages,
  Mail,
  Monitor,
  Moon,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Me } from "@/lib/api";

// ─── Theme ────────────────────────────────────────────────────────────────────

type Theme = "light" | "dark" | "system";
const THEME_KEY = "inplicit:theme";
const PREFS_KEY = "inplicit:notif-prefs";

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "light";
}

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  html.dataset.theme = resolved;
}

interface NotifPrefs {
  email: boolean;
  inApp: boolean;
  weekly: boolean;
}

const DEFAULT_PREFS: NotifPrefs = { email: true, inApp: true, weekly: false };

function readPrefs(): NotifPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotifPrefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

interface SettingsDialogProps {
  me?: Me;
  trigger: ReactNode;
}

export function SettingsDialog({ me, trigger }: SettingsDialogProps) {
  // Lazy initial state — read from localStorage on first render only. Doing
  // this in a useEffect+setState pair would cause an extra render on mount
  // and trip React 19's "set-state-in-effect" lint.
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [prefs, setPrefs] = useState<NotifPrefs>(readPrefs);

  function pickTheme(next: Theme): void {
    setTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_KEY, next);
    }
    applyTheme(next);
  }

  function togglePref(key: keyof NotifPrefs, next: boolean): void {
    const updated = { ...prefs, [key]: next };
    setPrefs(updated);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[480px]">
        <DialogHeader className="px-6 pt-6 pb-5">
          <div className="flex items-center gap-3 pr-6">
            <span className="grid size-9 shrink-0 place-items-center rounded-ui border border-line bg-surface-2 text-fg">
              <SettingsIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <DialogTitle className="text-base">Quick Settings</DialogTitle>
              <DialogDescription className="text-xs leading-snug">
                Appearance, notifications and quick account access.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          {me && <IdentityCard me={me} />}

          <Section title="Appearance" icon={Sparkles}>
            <ThemePicker value={theme} onChange={pickTheme} />
            <p className="px-1 text-[11px] leading-relaxed text-fg-subtle">
              System follows your OS preference. Your choice is saved on this
              device only.
            </p>
          </Section>

          <Separator />

          <Section title="Notifications" icon={Bell}>
            <ToggleRow
              icon={Mail}
              label="Email updates"
              hint="Audit completion and report delivery."
              checked={prefs.email}
              onChange={(v) => togglePref("email", v)}
            />
            <ToggleRow
              icon={Bell}
              label="In-app notifications"
              hint="Real-time activity inside the dashboard."
              checked={prefs.inApp}
              onChange={(v) => togglePref("inApp", v)}
            />
            <ToggleRow
              icon={Sparkles}
              label="Weekly digest"
              hint="Friday summary of insights across audits."
              checked={prefs.weekly}
              onChange={(v) => togglePref("weekly", v)}
            />
          </Section>

          <Separator />

          <Section title="Account" icon={ShieldCheck}>
            <LinkRow
              icon={ShieldCheck}
              label="Security & sessions"
              hint="Password, active devices."
              href="/account"
            />
            <LinkRow
              icon={Languages}
              label="Language & locale"
              hint={me?.org?.default_locale ?? "Workspace default"}
              href="/account"
            />
          </Section>
        </div>

        <DialogFooter className="px-6 py-4">
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="sm">
              Close
            </Button>
          </DialogClose>
          <Button asChild size="sm">
            <Link href="/account">Open full settings</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function IdentityCard({ me }: { me: Me }) {
  const display = me.name?.trim() || me.email;
  const initial = (display || "·").slice(0, 1).toUpperCase();
  const role = me.role.replace(/_/g, " ").toLowerCase();
  return (
    <div className="flex items-center gap-3 rounded-ui border border-line bg-surface px-4 py-3">
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent ring-1 ring-accent-muted"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{display}</p>
        {me.name && (
          <p className="truncate text-xs text-fg-muted">{me.email}</p>
        )}
      </div>
      <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
        {role}
      </span>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <header className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
        <Icon className="h-3 w-3" />
        {title}
      </header>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function ThemePicker({
  value,
  onChange,
}: {
  value: Theme;
  onChange: (next: Theme) => void;
}) {
  const opts: { id: Theme; label: string; icon: LucideIcon }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="grid grid-cols-3 gap-1 rounded-ui border border-line bg-surface-2 p-1"
    >
      {opts.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border border-line bg-canvas text-fg"
                : "border border-transparent text-fg-muted hover:text-fg",
            )}
          >
            <o.icon className="h-3.5 w-3.5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-ui px-3 py-2.5 transition-colors hover:bg-surface-2/60">
      <span className="flex min-w-0 items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-fg">{label}</span>
          {hint && (
            <span className="mt-0.5 block text-xs leading-snug text-fg-muted">
              {hint}
            </span>
          )}
        </span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-1" />
    </label>
  );
}

function LinkRow({
  icon: Icon,
  label,
  hint,
  href,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  href: string;
}) {
  return (
    <DialogClose asChild>
      <Link
        href={href}
        className="group flex items-center justify-between gap-4 rounded-ui px-3 py-2.5 transition-colors hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex min-w-0 items-start gap-3">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-fg">{label}</span>
            {hint && (
              <span className="mt-0.5 block truncate text-xs text-fg-muted">
                {hint}
              </span>
            )}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" />
      </Link>
    </DialogClose>
  );
}
