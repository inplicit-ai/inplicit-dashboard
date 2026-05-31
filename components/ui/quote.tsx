import * as React from "react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * Quote — a verbatim cited utterance (wraps the `.quote` recipe).
 *
 * The ONLY place italics are legitimate (a genuine cited verbatim quote). A
 * left rule carries the speaker tone:
 *   participant  → amber left rule (the licensed accent on cited evidence)
 *   interviewer  → neutral strong left rule
 *   (default)    → neutral strong left rule
 *
 * An optional mono `attrib` line (anon_id · u#) renders below via
 * `.quote__attrib`. Used inside EvidenceTree utterance branches, the interview
 * transcript, and RAG cited answers. Server-safe.
 * ────────────────────────────────────────────────────────────────────────── */

export interface QuoteProps
  extends React.HTMLAttributes<HTMLQuoteElement> {
  /** Speaker tone — sets the left-rule color. */
  speaker?: "participant" | "interviewer" | "neutral";
  /** Mono attribution line (e.g. "ANON-3F2A · u#14"). */
  attrib?: React.ReactNode;
  children: React.ReactNode;
}

const SPEAKER_CLASS: Record<NonNullable<QuoteProps["speaker"]>, string> = {
  participant: "quote--participant",
  interviewer: "quote--interviewer",
  neutral: "",
};

export function Quote({
  speaker = "neutral",
  attrib,
  className,
  children,
  ...props
}: QuoteProps) {
  return (
    <blockquote
      className={cn("quote", SPEAKER_CLASS[speaker], className)}
      {...props}
    >
      {children}
      {attrib != null && <cite className="quote__attrib">{attrib}</cite>}
    </blockquote>
  );
}
