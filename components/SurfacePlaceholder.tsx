import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/PageChrome";

/**
 * Minimal placeholder for org surfaces that land in later overhaul phases
 * (Interviews O-8, Knowledge Chat O-8, Vaults O-8, Integrations O-8,
 * Digital Twin O-9, Admin O-8). Keeps the nav real and the shell wired while
 * the feature is built. White-first, hairline, no shadow (01).
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
    <div className="max-w-[60ch] space-y-4">
      <Eyebrow>{t("comingSoon")}</Eyebrow>
      <h1 className="text-3xl font-medium leading-[1.08] tracking-[-0.025em] text-fg">
        {t(titleKey)}
      </h1>
      <p className="text-base leading-relaxed text-fg-muted">{t(bodyKey)}</p>
    </div>
  );
}
