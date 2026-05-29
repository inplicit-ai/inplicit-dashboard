import { CampaignChat } from "@/components/campaign-chat/CampaignChat";

// Per-campaign RAG chat (O-7). Wide work surface (design-contract §7) that owns
// its own full height via the chat-container flex contract (§6) — no PageHeader,
// the chat surface renders its own fixed header so the conversation fills the
// viewport under the topbar + campaign tabs.
export default async function CampaignChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="surface-bleed h-[var(--chat-height)]">
      <CampaignChat campaignId={id} />
    </div>
  );
}
