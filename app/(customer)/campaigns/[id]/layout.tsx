import type { ReactNode } from "react";
import { CampaignTabs } from "@/components/CampaignTabs";

export default async function CampaignLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Campaign detail routes (dashboard, tables, insights, map, chat) are dense
  // work surfaces → full available width via the `.surface-bleed` opt-out of
  // the `.app-work > *` 1280px cap. See design-contract §7.
  return (
    <div className="surface-bleed">
      <CampaignTabs campaignId={id} />
      {children}
    </div>
  );
}
