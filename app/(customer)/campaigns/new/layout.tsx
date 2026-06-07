import type { ReactNode } from "react";
import { SetupSteps } from "@/components/setup/SetupSteps";

/**
 * Create-flow layout (WHY-104). Hosts the create-flow step bar (mirrors the
 * campaign-dashboard CampaignTabs) above every step of the setup journey
 * (build → configure → review → launch). The top-row breadcrumb is suppressed
 * for this flow in the Topbar — this step bar is the single "where am I?".
 *
 * The configure step (SplitAuthor) carries `.chat-fill`; like the campaign
 * layout, this wrapper must fill the work row and stack as a column whenever a
 * descendant is chat-filled, so the chat gets the remaining height under the
 * step bar. For the other steps it is a normal block that scrolls.
 */
export default function NewCampaignLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="surface-bleed [&:has(.chat-fill)]:flex [&:has(.chat-fill)]:min-h-0 [&:has(.chat-fill)]:flex-1 [&:has(.chat-fill)]:flex-col">
      <SetupSteps />
      {children}
    </div>
  );
}
