import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";

/**
 * Placeholder for org surfaces that land in later overhaul phases. White-
 * modernist: a calm PageHeader (title + "coming soon" subtitle) over a clean
 * card hosting a friendly EmptyState — never a dashed plate or §-glyph dump.
 */
export async function SurfacePlaceholder({
  titleKey,
  bodyKey,
}: {
  titleKey: string;
  bodyKey: string;
}) {
  const t = await getTranslations("placeholder");
  return (
    <>
      <PageHeader title={t(titleKey)} subtitle={t("comingSoon")} />
      <Card className="p-2">
        <EmptyState icon={Sparkles} title={t("comingSoon")} hint={t(bodyKey)} />
      </Card>
    </>
  );
}
