"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CampaignDraft, EmailTemplate, SetupToolCall } from "@/lib/api";
import { SectionCard } from "./SectionCard";

/**
 * Email-template section (doc 03 §4 #12): editable invite subject + body with a
 * LIVE preview. Token placeholders ({{participant}}, {{slot}}, {{link}},
 * {{org}}) are rendered with sample values so the user sees the final email.
 * Mirrors the server-side `render_template` in backend/src/db/scheduling.rs.
 */
export function EmailTemplateSection({
  draft,
  onPatch,
  touched,
}: {
  draft: CampaignDraft;
  onPatch: (call: SetupToolCall) => void;
  touched?: boolean;
}) {
  const t = useTranslations("setup.catalog");
  const tpl: EmailTemplate = draft.emailTemplate ?? {
    subject: "",
    body: "",
  };

  const patch = (next: Partial<EmailTemplate>) =>
    onPatch({ tool: "set_email_template", args: { ...tpl, ...next } });

  const sampleName = t("previewSampleName");
  const sample = {
    participant: sampleName,
    slot: "Jun 3, 09:00",
    link: "https://app.inplicit.ai/i/…",
    org: "Acme",
  };
  const previewSubject = renderTokens(tpl.subject, sample);
  const previewBody = renderTokens(tpl.body, sample);

  return (
    <SectionCard title={t("emailTemplate")} touched={touched}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-subtle">
            {t("emailSubject")}
          </span>
          <Input
            value={tpl.subject}
            onChange={(e) => patch({ subject: e.target.value })}
            className="h-10 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-subtle">
            {t("emailBody")}
          </span>
          <Textarea
            rows={4}
            value={tpl.body}
            onChange={(e) => patch({ body: e.target.value })}
            className="min-h-[96px] text-sm"
          />
        </label>
        <p className="text-xs leading-snug text-fg-subtle">
          {t("emailVarsHint")}
        </p>

        {/* Live preview — single hairline card, one inner divider */}
        <div className="overflow-hidden rounded-card border border-line bg-surface-2">
          <div className="border-b border-line-subtle px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">
              {t("preview")}
            </span>
          </div>
          <div className="px-4 py-3">
            <p className="mb-1 text-sm font-semibold text-fg">
              {previewSubject || "—"}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
              {previewBody || "—"}
            </p>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

/** Replace `{{token}}` placeholders with sample values for the live preview. */
export function renderTokens(
  template: string,
  values: { participant: string; slot: string; link: string; org: string },
): string {
  return template
    .replaceAll("{{participant}}", values.participant)
    .replaceAll("{{slot}}", values.slot)
    .replaceAll("{{link}}", values.link)
    .replaceAll("{{org}}", values.org);
}
