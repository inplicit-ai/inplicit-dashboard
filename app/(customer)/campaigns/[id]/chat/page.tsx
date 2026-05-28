import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/PageChrome";
import { CampaignChat } from "@/components/campaign-chat/CampaignChat";

export default async function CampaignChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("campaignChat");

  return (
    <>
      <PageHeader title={t("emptyTitle")} meta={t("aiLabel")} />
      <CampaignChat campaignId={id} />
    </>
  );
}
