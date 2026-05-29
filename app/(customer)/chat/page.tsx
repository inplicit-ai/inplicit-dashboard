import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/PageChrome";
import { KnowledgeChat } from "@/components/knowledge-chat/KnowledgeChat";

// O-8: cross-campaign Knowledge Chat (doc 06 §4). Cites or declines; isolation
// is enforced server-side from campaigns.org_id, never a client campaign list.
export default async function KnowledgeChatPage() {
  const t = await getTranslations("knowledgeChat");
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} meta={t("aiLabel")} />
      <KnowledgeChat />
    </>
  );
}
