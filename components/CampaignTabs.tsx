"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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
  {
    id: "map",
    labelKey: "map",
    href: (id) => `/campaigns/${id}/map`,
    match: (p, id) => p.startsWith(`/campaigns/${id}/map`),
  },
  {
    id: "chat",
    labelKey: "ask",
    href: (id) => `/campaigns/${id}/chat`,
    match: (p, id) => p.startsWith(`/campaigns/${id}/chat`),
  },
];

export function CampaignTabs({ campaignId }: { campaignId: string }) {
  const pathname = usePathname() ?? "";
  const t = useTranslations("breadcrumb");

  return (
    <div className="-mx-4 mb-8 border-b border-line sm:-mx-8">
      <nav
        aria-label={t("campaign")}
        className="scrollbar-none mx-auto flex max-w-[1280px] gap-7 overflow-x-auto px-4 sm:px-8"
      >
        {TABS.map((tab) => {
          const active = tab.match(pathname, campaignId);
          return (
            <Link
              key={tab.id}
              href={tab.href(campaignId)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative -mb-px whitespace-nowrap border-b-2 py-4 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active
                  ? "border-accent text-fg"
                  : "border-transparent text-fg-muted hover:text-fg",
              )}
            >
              {t(tab.labelKey)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
