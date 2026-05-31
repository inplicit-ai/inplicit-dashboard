import { CampaignChat } from "@/components/campaign-chat/CampaignChat";

// Per-campaign RAG chat (O-7). CHAT-FILL CONTRACT: the wrapper is the DIRECT
// child of `.app-work` with `surface-bleed chat-fill` — `.app-work` drops its
// padding + overflow so the chat fills the 1fr work row exactly under the topbar
// + campaign tabs. The page never scrolls; only the chat's message region does.
// NO 100dvh / --chat-height math here.
export default async function CampaignChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="surface-bleed chat-fill">
      <CampaignChat campaignId={id} />
    </div>
  );
}
