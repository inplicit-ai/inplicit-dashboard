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
  // When the active tab is the chat ("Ask"), a descendant carries .chat-fill —
  // then this wrapper must fill the work row and stack as a column so the chat
  // gets the remaining height under the tabs (the chat-fill contract requires
  // every wrapper between .app-work and .chat-fill to fill+column). For all
  // other tabs the wrapper is a normal block that scrolls in .app-work.
  return (
    <div className="surface-bleed [&:has(.chat-fill)]:flex [&:has(.chat-fill)]:min-h-0 [&:has(.chat-fill)]:flex-1 [&:has(.chat-fill)]:flex-col">
      <CampaignTabs campaignId={id} />
      {children}
    </div>
  );
}
