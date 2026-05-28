"use client";

import { useTranslations } from "next-intl";
import { IconMenu } from "@/components/icons";
import type { SidebarState } from "@/lib/shell/sidebar-policy";

/**
 * Open/collapse affordance. Lives in the topbar when the sidebar is `icon`,
 * and renders as a floating pin (top-left) when the sidebar is `hidden`
 * (02 §3 / §4).
 */
export function SidebarTrigger({
  state,
  onToggle,
  variant = "topbar",
}: {
  state: SidebarState;
  onToggle: () => void;
  variant?: "topbar" | "floating";
}) {
  const t = useTranslations("shell");
  const label = state === "hidden" ? t("openNav") : t("expandNav");

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className={
        variant === "floating" ? "shell-nav-pin" : "icon-btn shell-trigger"
      }
    >
      <IconMenu size={18} />
    </button>
  );
}
