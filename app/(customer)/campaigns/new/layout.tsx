import type { ReactNode } from "react";
import { SetupSteps } from "@/components/setup/SetupSteps";

/**
 * Create-flow layout (WHY-104). The step bar (SetupSteps) lives OUTSIDE the
 * surface-bleed content wrapper so it always obeys the `.app-work > *`
 * max-width / centering rule — identical to how CampaignTabs is placed in the
 * campaign layout. This prevents the step bar from being squeezed to the edge
 * when `.app-work` drops its padding in chat-fill mode.
 *
 * The configure step (SplitAuthor) carries `.chat-fill`; the content wrapper
 * must fill the work row and stack as a column so the chat gets the remaining
 * height under the step bar.
 */
export default function NewCampaignLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {/* Step bar: direct .app-work child → always max-width centered, consistent position */}
      <SetupSteps />
      {/* Content: surface-bleed for full-width + chat-fill aware height filling */}
      <div className="surface-bleed [&:has(.chat-fill)]:flex [&:has(.chat-fill)]:min-h-0 [&:has(.chat-fill)]:flex-1 [&:has(.chat-fill)]:flex-col">
        {children}
      </div>
    </>
  );
}
