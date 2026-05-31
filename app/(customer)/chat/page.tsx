import { KnowledgeChat } from "@/components/knowledge-chat/KnowledgeChat";

// O-8: cross-campaign Knowledge Chat (doc 06 §4). Cites or declines; isolation
// is enforced server-side from campaigns.org_id, never a client campaign list.
// CHAT-FILL CONTRACT: the wrapper is the DIRECT child of `.app-work` with
// `surface-bleed chat-fill` — `.app-work` drops its padding + overflow so the
// chat fills the 1fr work row exactly. The page never scrolls; only the chat's
// message region does. NO 100dvh / --chat-height math here.
export default async function KnowledgeChatPage() {
  return (
    <div className="surface-bleed chat-fill">
      <KnowledgeChat />
    </div>
  );
}
