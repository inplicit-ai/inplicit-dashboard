import type { ReactNode } from "react";
import { CampaignTabs } from "@/components/CampaignTabs";
import { RegisterCampaignCrumb } from "@/components/shell/RegisterCampaignCrumb";
import { makeApi } from "@/lib/api";
import { requestCookie } from "@/lib/auth";

export default async function CampaignLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let campaignName: string | undefined;
  try {
    const campaign = await makeApi(await requestCookie()).campaigns.get(id);
    campaignName = campaign.org_name;
  } catch {
    campaignName = undefined;
  }

  // The tab bar lives OUTSIDE the surface-bleed content wrapper so it always
  // obeys the `.app-work > *` max-width / centering rule, regardless of whether
  // the active tab is the full-width chat. This prevents the visual "jump"
  // (width change + position shift) when switching between normal tabs and
  // "Fragen". The surface-bleed div below handles both the full-width opt-in
  // and the chat-fill flex contract.
  return (
    <>
      <RegisterCampaignCrumb name={campaignName} />
      {/* Tabs: direct .app-work child → always max-width centered, consistent position */}
      <CampaignTabs campaignId={id} />
      {/* Content: surface-bleed for full-width + chat-fill aware height filling */}
      <div className="surface-bleed [&:has(.chat-fill)]:flex [&:has(.chat-fill)]:min-h-0 [&:has(.chat-fill)]:flex-1 [&:has(.chat-fill)]:flex-col">
        {children}
      </div>
    </>
  );
}
