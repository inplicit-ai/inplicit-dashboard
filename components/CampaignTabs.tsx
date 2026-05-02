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
    href: (id) => `/admin/campaigns/${id}`,
    match: (p, id) => p === `/admin/campaigns/${id}`,
  },
  {
    id: "participants",
    label: "Teilnehmer",
    href: (id) => `/admin/campaigns/${id}/participants`,
    match: (p, id) => p.startsWith(`/admin/campaigns/${id}/participants`),
  },
  {
    id: "interviews",
    label: "Interviews",
    href: (id) => `/admin/campaigns/${id}/interviews`,
    match: (p, id) => p.startsWith(`/admin/campaigns/${id}/interviews`),
  },
  {
    id: "insights",
    label: "Insights",
    href: (id) => `/admin/campaigns/${id}/insights`,
    match: (p, id) => p.startsWith(`/admin/campaigns/${id}/insights`),
  },
  {
    id: "hypotheses",
    label: "Cross-Validation",
    href: (id) => `/admin/campaigns/${id}/hypotheses`,
    match: (p, id) => p.startsWith(`/admin/campaigns/${id}/hypotheses`),
  },
  {
    id: "map",
    label: "Knowledge Map",
    href: (id) => `/admin/campaigns/${id}/map`,
    match: (p, id) => p.startsWith(`/admin/campaigns/${id}/map`),
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
