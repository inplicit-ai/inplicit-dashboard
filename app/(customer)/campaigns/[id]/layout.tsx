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
  return (
    <>
      <CampaignTabs campaignId={id} />
      {children}
    </>
  );
}
