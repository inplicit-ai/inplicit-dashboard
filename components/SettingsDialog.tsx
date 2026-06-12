"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Building2,
  Languages,
  Monitor,
  Moon,
  Settings as SettingsIcon,
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
import { Separator } from "@/components/ui/separator";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import type { Me } from "@/lib/api";
import { OrgLogoUploadButton } from "@/components/OrgLogoUploadButton";

// ─── Theme ────────────────────────────────────────────────────────────────────

type Theme = "light" | "dark" | "system";
const THEME_KEY = "inplicit:theme";

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

// ─── Dialog ───────────────────────────────────────────────────────────────────

interface SettingsDialogProps {
  me?: Me;
  trigger: ReactNode;
}

export function SettingsDialog({ me, trigger }: SettingsDialogProps) {
  const t = useTranslations("settingsDialog");
  // Lazy initial state — read from localStorage on first render only. Doing
  // this in a useEffect+setState pair would cause an extra render on mount
  // and trip React 19's "set-state-in-effect" lint.
  const [theme, setTheme] = useState<Theme>(readTheme);

  function pickTheme(next: Theme): void {
    setTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_KEY, next);
    }
    applyTheme(next);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[440px]">
        <DialogHeader className="shrink-0 border-b border-line-subtle px-6 pt-6 pb-5">
          <div className="flex items-center gap-3 pr-6">
            <span className="grid size-9 shrink-0 place-items-center rounded-ui border border-line bg-surface-2 text-fg">
              <SettingsIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <DialogTitle className="text-base">{t("title")}</DialogTitle>
              <DialogDescription className="text-xs leading-snug">
                {t("description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {me && <IdentityCard me={me} />}

          <Section title={t("appearance")} icon={Sparkles}>
            <ThemePicker
              value={theme}
              onChange={pickTheme}
              labels={{
                light: t("themeLight"),
                dark: t("themeDark"),
                system: t("themeSystem"),
              }}
            />
            <p className="px-1 text-xs leading-relaxed text-fg-subtle">
              {t("themeHint")}
            </p>
          </Section>

          <Separator />

          <Section title={t("language")} icon={Languages}>
            <LanguagePicker />
            <p className="px-1 text-xs leading-relaxed text-fg-subtle">
              {t("languageHint")}
            </p>
          </Section>

          {me?.role === "ORG_OWNER" && me.org && (
            <>
              <Separator />
              <Section title="Organisation" icon={Building2}>
                <OrgLogoUploadButton
                  orgName={me.org.name}
                  currentLogoUrl={me.org.logo_url}
                />
              </Section>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-line-subtle px-6 py-4">
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="sm">
              {t("close")}
            </Button>
          </DialogClose>
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
    <div className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-card">
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-ui border border-line bg-surface-2 text-[14px] font-semibold text-fg-muted"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{display}</p>
        {me.name && (
          <p className="truncate text-xs text-fg-muted">{me.email}</p>
        )}
      </div>
      <span className="rounded-full border border-line-subtle bg-surface-2 px-2.5 py-0.5 text-[12px] font-medium capitalize text-fg-muted">
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
      <header className="flex items-center gap-2 px-1 text-[13px] font-semibold text-fg-muted">
        <Icon className="h-3.5 w-3.5 text-fg-subtle" />
        {title}
      </header>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function ThemePicker({
  value,
  onChange,
  labels,
}: {
  value: Theme;
  onChange: (next: Theme) => void;
  labels: Record<Theme, string>;
}) {
  const opts: { id: Theme; icon: LucideIcon }[] = [
    { id: "light", icon: Sun },
    { id: "dark", icon: Moon },
    { id: "system", icon: Monitor },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={labels.system}
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
              "inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-[13px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border border-line bg-canvas text-fg"
                : "border border-transparent text-fg-muted hover:bg-surface hover:text-fg",
            )}
          >
            <o.icon className="h-3.5 w-3.5" />
            {labels[o.id]}
          </button>
        );
      })}
    </div>
  );
}

/**
 * In-dialog language picker. Reuses the cookie + refresh strategy from
 * `shell/LocaleSwitcher` (write `NEXT_LOCALE`, refresh so the server
 * re-renders with the new catalog), but styled to match `ThemePicker`.
 */
function LanguagePicker() {
  const current = useLocale() as Locale;
  const tLocale = useTranslations("locale");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    if (next === current) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="radiogroup"
      aria-label={tLocale("label")}
      className={cn(
        "grid gap-1 rounded-ui border border-line bg-surface-2 p-1",
        LOCALES.length === 2 ? "grid-cols-2" : "grid-cols-3",
      )}
    >
      {LOCALES.map((loc) => {
        const active = current === loc;
        return (
          <button
            key={loc}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={pending}
            onClick={() => setLocale(loc)}
            className={cn(
              "inline-flex items-center justify-center rounded-sm px-3 py-2 text-[13px] font-medium transition-colors disabled:opacity-60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border border-line bg-canvas text-fg"
                : "border border-transparent text-fg-muted hover:bg-surface hover:text-fg",
            )}
          >
            {tLocale(loc)}
          </button>
        );
      })}
    </div>
  );
}
