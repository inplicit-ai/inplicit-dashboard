"use client";

import Link from "next/link";
import type { ChatCitation } from "@/lib/api";

/**
 * Inline pseudonymous citation chip: `ANON-XXXXXX · #N` — the canonical square,
 * mono DataChip vocabulary. Clicking deep-links into the interview detail (the
 * same click-to-quote affordance the KnowledgeMap uses), so the answer's
 * evidence is one hop away. NEVER renders participant email/name — anon_id only.
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
      className="inline-flex items-center gap-1 rounded-sm border border-line bg-canvas px-2 py-0.5 align-baseline font-mono text-[11px] font-medium tabular-nums text-fg-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
