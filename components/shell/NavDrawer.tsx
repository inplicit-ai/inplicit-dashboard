"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import type { Me } from "@/lib/api";
import type { NavMode } from "@/lib/shell/nav";
import { Sidebar } from "@/components/Sidebar";

/**
 * Off-canvas drawer presentation of the nav model (02 §5). Same `Sidebar`
 * component, rendered in drawer mode — one nav definition, two presentations.
 * Used on mobile/tablet behind the bottom-nav "More" tab.
 */
export function NavDrawer({
  open,
  onOpenChange,
  mode,
  me,
  orgLabel,
  orgLogoUrl,
  hasAudits,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: NavMode;
  me?: Me;
  orgLabel?: string;
  orgLogoUrl?: string | null;
  hasAudits?: boolean;
}) {
  const t = useTranslations("shell");

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="shell-drawer__overlay" />
        <DialogPrimitive.Content className="shell-drawer__panel">
          <DialogPrimitive.Title className="sr-only">
            {t("primaryNavLabel")}
          </DialogPrimitive.Title>
          <Sidebar
            mode={mode}
            me={me}
            orgLabel={orgLabel}
            orgLogoUrl={orgLogoUrl}
            hasAudits={hasAudits}
            state="expanded"
            inDrawer
            onNavigate={() => onOpenChange(false)}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
