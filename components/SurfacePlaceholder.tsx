import { getTranslations } from "next-intl/server";
import { Folio } from "@/components/ui/folio";
import { StatusDisc } from "@/components/ui/status-disc";

/**
 * Minimal placeholder for org surfaces that land in later overhaul phases
 * (Interviews O-8, Knowledge Chat O-8, Vaults O-8, Integrations O-8,
 * Digital Twin O-9, Admin O-8). Keeps the nav real and the shell wired while
 * the feature is built.
 *
 * Recomposed as a Braun PRINTED PLATE: a folio section break opens the surface,
 * then a single hairline-ruled rectangle with a faint dashed baseline grid and a
 * mono caption stands in for content — never a sad centered illustration. The
 * lone idle disc on the plate keeps the surface on the status spine.
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
    <div className="max-w-[68ch]">
      <Folio index="§" label={t(titleKey)} count={t("comingSoon")} />

      {/* The printed plate — hairline frame + dashed baseline grid wash. */}
      <div
        className="relative mt-6 overflow-hidden rounded-card border border-dashed border-line-strong bg-surface"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent calc(var(--space-6) - 1px), var(--color-border-subtle) calc(var(--space-6) - 1px), var(--color-border-subtle) var(--space-6))",
        }}
      >
        <div className="flex flex-col gap-4 px-8 py-12">
          <span className="flex items-center gap-2.5">
            <StatusDisc state="idle" />
            <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.10em] text-fg-subtle">
              {t("comingSoon")}
            </span>
          </span>
          <p className="body-lg max-w-[60ch] text-fg-muted">{t(bodyKey)}</p>
        </div>
      </div>
    </div>
  );
}
