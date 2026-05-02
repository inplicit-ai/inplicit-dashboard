"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    <div className="app-tabs">
      <nav className="app-tabs__inner">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.href(campaignId)}
            className={t.match(pathname, campaignId) ? "is-active" : ""}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
