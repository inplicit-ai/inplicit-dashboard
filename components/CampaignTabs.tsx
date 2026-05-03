"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  href: (campaignId: string) => string;
  match: (pathname: string, campaignId: string) => boolean;
}

const TABS: Tab[] = [
  {
    id: "overview",
    label: "Übersicht",
    href: (id) => `/campaigns/${id}`,
    match: (p, id) => p === `/campaigns/${id}`,
  },
  {
    id: "participants",
    label: "Teilnehmer",
    href: (id) => `/campaigns/${id}/participants`,
    match: (p, id) => p.startsWith(`/campaigns/${id}/participants`),
  },
  {
    id: "interviews",
    label: "Interviews",
    href: (id) => `/campaigns/${id}/interviews`,
    match: (p, id) => p.startsWith(`/campaigns/${id}/interviews`),
  },
  {
    id: "insights",
    label: "Insights",
    href: (id) => `/campaigns/${id}/insights`,
    match: (p, id) => p.startsWith(`/campaigns/${id}/insights`),
  },
  {
    id: "hypotheses",
    label: "Cross-Validation",
    href: (id) => `/campaigns/${id}/hypotheses`,
    match: (p, id) => p.startsWith(`/campaigns/${id}/hypotheses`),
  },
  {
    id: "map",
    label: "Knowledge Map",
    href: (id) => `/campaigns/${id}/map`,
    match: (p, id) => p.startsWith(`/campaigns/${id}/map`),
  },
];

export function CampaignTabs({ campaignId }: { campaignId: string }) {
  const pathname = usePathname() ?? "";

  return (
    <div className="-mx-4 mb-8 border-b border-line sm:-mx-8">
      <nav
        aria-label="Audit-Bereiche"
        className="scrollbar-none mx-auto flex max-w-[1280px] gap-7 overflow-x-auto px-4 sm:px-8"
      >
        {TABS.map((t) => {
          const active = t.match(pathname, campaignId);
          return (
            <Link
              key={t.id}
              href={t.href(campaignId)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative -mb-px whitespace-nowrap border-b-2 py-4 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active
                  ? "border-accent text-fg"
                  : "border-transparent text-fg-muted hover:text-fg",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
