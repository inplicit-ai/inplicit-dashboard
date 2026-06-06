"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Me } from "@/lib/api";
import {
  getNavSections,
  isNavItemActive,
  type NavItem,
  type NavMode,
  type NavSection,
} from "@/lib/shell/nav";
import {
  IconHelp,
  IconLogOut,
  IconSearch,
  IconSettings,
} from "@/components/icons";
import { StatusDisc } from "@/components/ui/status-disc";
import { replayTour } from "@/lib/shell/use-guided-tour";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OrgAvatar } from "@/components/OrgAvatar";
import { SettingsDialog } from "@/components/SettingsDialog";
import type { SidebarState } from "@/lib/shell/sidebar-policy";

interface SidebarProps {
  mode: NavMode;
  me?: Me;
  orgLabel?: string;
  orgLogoUrl?: string | null;
  /** When false, items flagged `needsAudits` render disabled (need ≥1 audit). */
  hasAudits?: boolean;
  /** Render state — drives label visibility (expanded vs. icon). */
  state?: SidebarState;
  /** Compact presentation for the mobile drawer (always shows labels). */
  inDrawer?: boolean;
  /** Number of interviews currently running — drives the pinned LIVE folio. */
  liveCount?: number;
  /** Called when a nav link is clicked (used to close the mobile drawer). */
  onNavigate?: () => void;
}

export function Sidebar({
  mode,
  me,
  orgLabel,
  orgLogoUrl,
  hasAudits = false,
  state = "expanded",
  inDrawer = false,
  liveCount = 0,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname() ?? "";
  const tNav = useTranslations("nav");
  const tShell = useTranslations("shell");

  const sections = getNavSections(mode, me?.role);
  const iconOnly = state === "icon" && !inDrawer;

  const orgName =
    orgLabel ?? (mode === "staff" ? "Inplicit Staff" : tShell("workspace"));
  const roleLabel =
    mode === "staff" ? tShell("backOffice") : tShell("workspace");

  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href));
  const isActive = (href: string) =>
    isNavItemActive(pathname, href, allHrefs);

  return (
    <aside
      className="sidebar"
      data-state={state}
      data-drawer={inDrawer ? "true" : undefined}
      aria-label={tShell("primaryNavLabel")}
    >
      <TooltipProvider delayDuration={120}>
        <div className="sidebar__inner">
          <div className="sidebar__brand">
            <Link
              href={mode === "staff" ? "/staff/orgs" : "/campaigns"}
              className="sidebar__brand-mark"
              aria-label="Inplicit"
              onClick={onNavigate}
            >
              <Image
                src={iconOnly ? "/logo_icon.svg" : "/logo.svg"}
                alt="Inplicit"
                width={iconOnly ? 24 : 120}
                height={24}
                className="sidebar__brand-logo"
                priority
              />
            </Link>
          </div>

          {!iconOnly && (
            <div className="sidebar__org">
              <OrgAvatar
                name={mode === "staff" ? "Inplicit" : orgName}
                logoUrl={mode === "staff" ? null : orgLogoUrl}
                size={32}
                className="sidebar__avatar"
              />
              <span className="sidebar__org-text">
                <span className="sidebar__org-name">{orgName}</span>
                <span className="sidebar__org-role">{roleLabel}</span>
              </span>
            </div>
          )}

          <nav className="sidebar__nav" aria-label={tShell("workspaceLabel")}>
            {sections.map((section: NavSection) => (
              <div className="sidebar__section" key={section.id}>
                {!iconOnly && (
                  <span className="sidebar__section-label">
                    {tNav(section.id)}
                  </span>
                )}
                {section.items.map((item) => (
                  <SidebarRow
                    key={item.id}
                    item={item}
                    label={tNav(item.id)}
                    disabledHint={
                      item.comingSoon
                        ? tNav("comingSoon")
                        : tNav("needsAuditsHint")
                    }
                    soonLabel={tNav("comingSoon")}
                    active={isActive(item.href)}
                    disabled={Boolean(
                      item.comingSoon || (item.needsAudits && !hasAudits),
                    )}
                    iconOnly={iconOnly}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            ))}
          </nav>

          {mode === "customer" && (
            <div className="sidebar__live" data-idle={liveCount === 0}>
              <StatusDisc
                state={liveCount > 0 ? "live" : "idle"}
                size="sm"
                pulse={liveCount > 0}
              />
              {!iconOnly && (
                <>
                  <span className="sidebar__live-label">
                    {tNav("interviews")}
                  </span>
                  <span className="sidebar__live-count">{liveCount}</span>
                </>
              )}
            </div>
          )}

          <div className="sidebar__bottom">
            {hasAudits && (
              <Link
                href="/chat"
                className="sidebar__command"
                onClick={onNavigate}
                aria-label={tNav("knowledgeChat")}
              >
                <span className="sidebar__item-icon" aria-hidden="true">
                  <IconSearch size={15} />
                </span>
                {!iconOnly && (
                  <>
                    <span className="sidebar__command-label">
                      {tNav("knowledgeChat")}
                    </span>
                    <kbd className="sidebar__command-kbd" aria-hidden="true">
                      ⌘K
                    </kbd>
                  </>
                )}
              </Link>
            )}
            {mode === "customer" && (
              <button
                type="button"
                className="sidebar__item sidebar__item--bottom"
                onClick={() => {
                  onNavigate?.();
                  replayTour();
                }}
              >
                <span className="sidebar__item-icon" aria-hidden="true">
                  <IconHelp size={16} />
                </span>
                {!iconOnly && (
                  <span className="sidebar__item-label">
                    {tShell("replayTour")}
                  </span>
                )}
              </button>
            )}
            <SettingsDialog
              me={me}
              trigger={
                <button
                  type="button"
                  className="sidebar__item sidebar__item--bottom"
                >
                  <span className="sidebar__item-icon" aria-hidden="true">
                    <IconSettings size={16} />
                  </span>
                  {!iconOnly && (
                    <span className="sidebar__item-label">
                      {tShell("settings")}
                    </span>
                  )}
                </button>
              }
            />
            <form
              method="POST"
              action="/logout"
              className="sidebar__bottom-form"
            >
              <button
                type="submit"
                className="sidebar__item sidebar__item--bottom sidebar__item--logout"
              >
                <span className="sidebar__item-icon" aria-hidden="true">
                  <IconLogOut size={16} />
                </span>
                {!iconOnly && (
                  <span className="sidebar__item-label">
                    {tShell("logout")}
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </TooltipProvider>
    </aside>
  );
}

function SidebarRow({
  item,
  label,
  disabledHint,
  soonLabel,
  active,
  disabled,
  iconOnly,
  onNavigate,
}: {
  item: NavItem;
  label: string;
  disabledHint: string;
  soonLabel: string;
  active: boolean;
  disabled: boolean;
  iconOnly: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const className = `sidebar__item${active && !disabled ? " is-active" : ""}${
    disabled ? " is-disabled" : ""
  }`;

  const inner = (
    <>
      <span className="sidebar__item-icon" aria-hidden="true">
        <Icon size={16} />
      </span>
      {!iconOnly && <span className="sidebar__item-label">{label}</span>}
      {!iconOnly && item.comingSoon && (
        <span className="sidebar__item-badge">{soonLabel}</span>
      )}
      {!iconOnly && !item.comingSoon && item.badge && (
        <span className="sidebar__item-badge">{item.badge}</span>
      )}
    </>
  );

  const body = disabled ? (
    <span
      className={className}
      title={iconOnly ? undefined : disabledHint}
      aria-disabled="true"
      data-tour={item.tourId}
    >
      {inner}
    </span>
  ) : (
    <Link
      href={item.href}
      className={className}
      onClick={onNavigate}
      data-tour={item.tourId}
    >
      {inner}
    </Link>
  );

  if (!iconOnly) return body;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{body}</TooltipTrigger>
      <TooltipContent side="right">
        {label}
        {disabled ? ` — ${disabledHint}` : ""}
      </TooltipContent>
    </Tooltip>
  );
}
