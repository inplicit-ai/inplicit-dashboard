"use client";

import Link from "next/link";
import type { ChatCitation } from "@/lib/api";

/**
 * Inline pseudonymous citation chip: `ANON-XXXXXX · #N`. Clicking navigates to
 * the interview detail (same click-to-quote affordance KnowledgeMap uses).
 * NEVER renders participant email/name — only the anon_id.
 */
export function CitationChip({
  citation,
  campaignId,
}: {
  citation: ChatCitation;
  campaignId: string;
}) {
  return (
    <Link
      href={`/campaigns/${campaignId}/interviews?insight=${citation.vse_insight_id}`}
      className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas px-2 py-0.5 align-baseline font-mono text-[10px] font-medium text-fg-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={`${citation.anon_id} · utterance #${citation.utterance_index}`}
    >
      <span>{citation.anon_id}</span>
      <span aria-hidden="true" className="text-fg-subtle">
        ·
      </span>
      <span>#{citation.utterance_index}</span>
    </Link>
  );
}
