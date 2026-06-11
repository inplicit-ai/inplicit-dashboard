"use client";

import { MailQuestion } from "lucide-react";

/**
 * Shown in place of a chat answer when the RAG pipeline found no evidence in
 * either the campaign's interviews or the org's Kontext (`message.declined`).
 *
 * Instead of a greyed-out "no evidence" sentence, we offer the next action:
 * reach the people who could answer. The CTA is intentionally disabled — the
 * outreach feature ships later — so the card is honest about it ("coming soon").
 *
 * i18n-agnostic: the caller passes already-translated strings so this one
 * component serves both the campaign chat and the cross-campaign knowledge chat.
 */
export function NoEvidenceCard({
  title,
  body,
  cta,
  comingSoon,
}: {
  title: string;
  body: string;
  cta: string;
  comingSoon: string;
}) {
  return (
    <div className="w-full max-w-[68ch] rounded-card border-[length:var(--border-card)] border-solid border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui bg-surface-2 text-fg-muted">
          <MailQuestion className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[length:var(--text-body)] font-semibold text-fg">
            {title}
          </p>
          <p className="mt-0.5 text-[length:var(--text-meta)] leading-[1.5] text-fg-muted">
            {body}
          </p>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={comingSoon}
            className="mt-3 inline-flex cursor-not-allowed items-center gap-2 rounded-ui border border-line bg-card px-3 py-1.5 text-[length:var(--text-meta)] font-medium text-fg-subtle opacity-70"
          >
            {cta}
            <span className="rounded-full border border-line-subtle bg-surface-2 px-2 py-0.5 text-[length:var(--text-caption)] text-fg-faint">
              {comingSoon}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
