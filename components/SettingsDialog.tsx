"use client";

import { useState, type ReactNode } from "react";
import {
  Bell,
  Globe,
  Mail,
  Moon,
  Settings as SettingsIcon,
  Shield,
  X,
  type LucideIcon,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Me } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsDialogProps {
  me?: Me;
  trigger: ReactNode;
}

interface ToggleRow {
  id: string;
  label: string;
  icon: LucideIcon;
  initial: boolean;
  /** When set, the row is rendered inside a separate group with extra spacing. */
  group?: "primary" | "appearance";
}

const ROWS: ToggleRow[] = [
  { id: "notifications", label: "Push Notifications", icon: Bell, initial: true, group: "primary" },
  { id: "public_profile", label: "Public Profile", icon: Globe, initial: false, group: "primary" },
  { id: "two_factor", label: "Two-Factor Authentication", icon: Shield, initial: true, group: "primary" },
  { id: "dark_mode", label: "Dark Mode", icon: Moon, initial: false, group: "appearance" },
  { id: "email_updates", label: "E-Mail Updates", icon: Mail, initial: true, group: "appearance" },
];

// ─── Dialog ───────────────────────────────────────────────────────────────────

/**
 * Quick Settings dialog. Single-pane, toggle-only — matches the brief from
 * the design screenshot. Form state is local; "Save Changes" prints to a
 * flash row and closes the dialog. Account-deletion / language / locale
 * settings now live on the dedicated /account route (out of scope here).
 */
export function SettingsDialog({ me: _me, trigger }: SettingsDialogProps) {
  const [values, setValues] = useState<Record<string, boolean>>(() =>
    ROWS.reduce<Record<string, boolean>>((acc, r) => {
      acc[r.id] = r.initial;
      return acc;
    }, {}),
  );
  const [flash, setFlash] = useState<string | null>(null);

  function setRow(id: string, next: boolean) {
    setValues((prev) => ({ ...prev, [id]: next }));
  }

  function save() {
    setFlash("Einstellungen gespeichert.");
    setTimeout(() => setFlash(null), 2400);
  }

  const primaryRows = ROWS.filter((r) => r.group !== "appearance");
  const appearanceRows = ROWS.filter((r) => r.group === "appearance");

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100%-2rem)] sm:max-w-[520px]",
            "-translate-x-1/2 -translate-y-1/2",
            "rounded-card border border-line bg-canvas shadow-elevation",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200",
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-ui bg-surface-2 text-fg">
                <SettingsIcon className="h-4 w-4" />
              </span>
              <div>
                <DialogPrimitive.Title className="text-base font-semibold text-fg">
                  Quick Settings
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-0.5 text-xs text-fg-muted">
                  Manage your account preferences
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close className="grid size-7 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <X className="h-4 w-4" />
              <span className="sr-only">Schließen</span>
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="px-6 pb-2 pt-4">
            <div className="space-y-1">
              {primaryRows.map((row) => (
                <Row
                  key={row.id}
                  icon={row.icon}
                  label={row.label}
                  checked={values[row.id]}
                  onChange={(v) => setRow(row.id, v)}
                />
              ))}
            </div>

            <div className="my-3 border-t border-line" />

            <div className="space-y-1">
              {appearanceRows.map((row) => (
                <Row
                  key={row.id}
                  icon={row.icon}
                  label={row.label}
                  checked={values[row.id]}
                  onChange={(v) => setRow(row.id, v)}
                />
              ))}
            </div>
          </div>

          {flash && (
            <div role="status" className="mx-6 rounded-ui bg-success-soft px-3 py-2 text-xs text-success">
              {flash}
            </div>
          )}

          {/* Footer */}
          <div className="mt-2 flex items-center justify-end gap-2 border-t border-line bg-surface px-6 py-4">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="outline" size="sm">
                Close
              </Button>
            </DialogPrimitive.Close>
            <Button type="button" size="sm" onClick={save}>
              Save Changes
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function Row({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="h-4 w-4 shrink-0 text-fg-muted" />
        <span className="text-sm text-fg truncate">{label}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
