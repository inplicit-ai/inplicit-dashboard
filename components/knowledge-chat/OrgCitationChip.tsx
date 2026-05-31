"use client";

import Link from "next/link";
import type { OrgCitation } from "@/lib/api";

/**
 * Cross-campaign citation chip: `ANON-XXXXXX · #N` linking through to that
 * campaign's click-to-quote view. Carries the campaign so org-level answers can
 * never mislabel a hit. NEVER renders participant email/name — anon_id only.
 *
 * A nil campaign_id (legacy persisted history before campaign-labelled storage)
 * degrades to a non-link chip rather than a broken route.
 */
export function OrgCitationChip({ citation }: { citation: OrgCitation }) {
  const NIL = "00000000-0000-0000-0000-000000000000";
  const label = (
    <>
      <span>{citation.anon_id}</span>
      <span aria-hidden="true" className="text-fg-subtle">
        ·
      </span>
      <span>#{citation.utterance_index}</span>
    </>
  );
  const cls =
    "inline-flex items-center gap-1 rounded-full border border-line-subtle bg-surface-2 px-2.5 py-0.5 align-baseline font-mono text-[length:var(--text-caption)] font-medium tabular-nums text-fg-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (!citation.campaign_id || citation.campaign_id === NIL) {
    return (
      <span
        className={cls}
        title={`${citation.anon_id} · utterance #${citation.utterance_index}`}
      >
        {label}
      </span>
    );
  }

  return (
    <Link
      href={`/campaigns/${citation.campaign_id}/interviews?insight=${citation.vse_insight_id}`}
      className={cls}
      title={`${citation.anon_id} · utterance #${citation.utterance_index}`}
    >
      {label}
    </Link>
  );
}
