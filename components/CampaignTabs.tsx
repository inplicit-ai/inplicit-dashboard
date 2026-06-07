"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  /** i18n key under the `breadcrumb` namespace. */
  labelKey: string;
  href: (campaignId: string) => string;
  match: (pathname: string, campaignId: string) => boolean;
}

const TABS: Tab[] = [
  {
    id: "overview",
    labelKey: "overview",
    href: (id) => `/campaigns/${id}`,
    match: (p, id) => p === `/campaigns/${id}`,
  },
  {
    id: "participants",
    labelKey: "participants",
    href: (id) => `/campaigns/${id}/participants`,
    match: (p, id) => p.startsWith(`/campaigns/${id}/participants`),
  },
  {
    id: "interviews",
    labelKey: "interviews",
    href: (id) => `/campaigns/${id}/interviews`,
    match: (p, id) => p.startsWith(`/campaigns/${id}/interviews`),
  },
  {
    id: "insights",
    labelKey: "insights",
    href: (id) => `/campaigns/${id}/insights`,
    match: (p, id) => p.startsWith(`/campaigns/${id}/insights`),
  },
  {
    id: "hypotheses",
    labelKey: "hypotheses",
    href: (id) => `/campaigns/${id}/hypotheses`,
    match: (p, id) => p.startsWith(`/campaigns/${id}/hypotheses`),
  },
  // WHY-95: "Knowledge Map" removed from the tab bar (coming soon).
  {
    id: "chat",
    labelKey: "ask",
    href: (id) => `/campaigns/${id}/chat`,
    match: (p, id) => p.startsWith(`/campaigns/${id}/chat`),
  },
];

/**
 * Campaign section tabs — the BadgeTabs sliding-pill aesthetic, but each tab is
 * a real <Link> (server-routed). The active pill is a single framer-motion
 * <motion.span layoutId> that slides between tabs; under prefers-reduced-motion
 * it simply snaps. i18n keys are reused verbatim from the `breadcrumb` catalog.
 */
export function CampaignTabs({ campaignId }: { campaignId: string }) {
  const pathname = usePathname() ?? "";
  const t = useTranslations("breadcrumb");
  const reduceMotion = useReducedMotion();

  return (
    <div className="-mt-1 mb-6 overflow-x-auto scrollbar-none">
      <nav
        aria-label={t("campaign")}
        className="inline-flex items-center gap-1 rounded-ui border border-line-subtle bg-surface-2 p-1"
      >
        {TABS.map((tab) => {
          const active = tab.match(pathname, campaignId);
          return (
            <Link
              key={tab.id}
              href={tab.href(campaignId)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-8 items-center whitespace-nowrap rounded-ui px-3.5 text-[length:var(--text-meta)] font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-fg" : "text-fg-muted hover:text-fg",
              )}
            >
              {active && (
                <motion.span
                  layoutId={reduceMotion ? undefined : "campaign-tab-pill"}
                  aria-hidden
                  className="absolute inset-0 rounded-ui bg-surface shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10">{t(tab.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
