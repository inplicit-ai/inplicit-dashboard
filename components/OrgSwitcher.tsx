"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { api, type Organization } from "@/lib/api";
import { OrgAvatar } from "@/components/OrgAvatar";
import { cn } from "@/lib/utils";

interface OrgSwitcherProps {
  /** Currently active org label, rendered on the trigger. */
  orgName: string;
  /** Sub-label under the org name (role / context line). */
  roleLabel: string;
  /** Logo for the active org, if any. */
  orgLogoUrl?: string | null;
  /** Active org id — used to mark the current entry in the list. */
  currentOrgId?: string | null;
  /** Called when a nav action runs (closes the mobile drawer). */
  onNavigate?: () => void;
}

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; orgs: Organization[] }
  | { status: "error" };

/**
 * Staff-only org switcher anchored on {@link OrgAvatar}. Replaces the static
 * sidebar org block with a button that opens a dropdown listing every org plus
 * a "new org" entry point. Demo affordance — gated by the caller on the staff
 * role flag, never rendered for customer users.
 *
 * Self-contained dropdown (no Radix popover dependency in this project): click
 * the trigger to toggle, Escape or an outside click to close.
 */
export function OrgSwitcher({
  orgName,
  roleLabel,
  orgLogoUrl,
  currentOrgId,
  onNavigate,
}: OrgSwitcherProps) {
  const t = useTranslations("shell.orgSwitcher");
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<LoadState>({ status: "idle" });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  // Lazy-load the org list the first time the menu opens. Failures surface as
  // an inline error row rather than throwing — this is a non-critical demo aid.
  useEffect(() => {
    if (!open || load.status !== "idle") return;
    let active = true;
    setLoad({ status: "loading" });
    api.staff.orgs
      .list()
      .then((orgs) => {
        if (active) setLoad({ status: "ready", orgs });
      })
      .catch((err) => {
        if (active) {
          console.error("OrgSwitcher: failed to load orgs", err);
          setLoad({ status: "error" });
        }
      });
    return () => {
      active = false;
    };
  }, [open, load.status]);

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  // TODO(WHY-101): no backend org-switch/session endpoint exists yet. Selecting
  // an org cannot mutate the staff session server-side; for now the entry routes
  // to that org's staff detail page so demos can navigate. Wire this to the real
  // switch-session endpoint once it lands (then refresh the shell to re-fetch me).
  function onPickOrg() {
    onNavigate?.();
    close();
  }

  return (
    <div className="sidebar__org-switch" ref={rootRef}>
      <button
        type="button"
        className="sidebar__org sidebar__org--switch"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t("trigger")}
        onClick={() => setOpen((v) => !v)}
      >
        <OrgAvatar
          name={orgName}
          logoUrl={orgLogoUrl}
          size={32}
          className="sidebar__avatar"
        />
        <span className="sidebar__org-text">
          <span className="sidebar__org-name">{orgName}</span>
          <span className="sidebar__org-role">{roleLabel}</span>
        </span>
        <ChevronsUpDown
          className="sidebar__org-switch-caret"
          size={14}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="sidebar__org-menu" id={menuId} role="menu">
          <p className="sidebar__org-menu-heading">{t("heading")}</p>

          {load.status === "loading" && (
            <p className="sidebar__org-menu-note">{t("loading")}</p>
          )}
          {load.status === "error" && (
            <p className="sidebar__org-menu-note sidebar__org-menu-note--error">
              {t("error")}
            </p>
          )}
          {load.status === "ready" && load.orgs.length === 0 && (
            <p className="sidebar__org-menu-note">{t("empty")}</p>
          )}

          {load.status === "ready" && load.orgs.length > 0 && (
            <ul className="sidebar__org-menu-list">
              {load.orgs.map((org) => {
                const isCurrent = org.id === currentOrgId;
                return (
                  <li key={org.id}>
                    <Link
                      href={`/staff/orgs/${org.id}`}
                      role="menuitem"
                      className={cn(
                        "sidebar__org-menu-item",
                        isCurrent && "is-current",
                      )}
                      onClick={onPickOrg}
                    >
                      <OrgAvatar
                        name={org.name}
                        logoUrl={org.logo_url}
                        size={22}
                      />
                      <span className="sidebar__org-menu-item-name">
                        {org.name}
                      </span>
                      {isCurrent ? (
                        <Check
                          className="sidebar__org-menu-check"
                          size={14}
                          aria-label={t("current")}
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            href="/staff/orgs/new"
            role="menuitem"
            className="sidebar__org-menu-item sidebar__org-menu-item--new"
            onClick={() => {
              onNavigate?.();
              close();
            }}
          >
            <span className="sidebar__org-menu-new-icon" aria-hidden="true">
              <Plus size={14} />
            </span>
            <span className="sidebar__org-menu-item-name">{t("newOrg")}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
