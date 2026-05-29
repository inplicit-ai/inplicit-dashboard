import { KnowledgeChat } from "@/components/knowledge-chat/KnowledgeChat";

// O-8: cross-campaign Knowledge Chat (doc 06 §4). Cites or declines; isolation
// is enforced server-side from campaigns.org_id, never a client campaign list.
// Wide work surface (design-contract §7); owns full height via the chat-container
// flex contract (§6) — only the topbar sits above it, so it uses --chat-height-bare.
export default async function KnowledgeChatPage() {
  return (
    <div className="surface-bleed h-[var(--chat-height-bare)]">
      <KnowledgeChat />
    </div>
  );
}
