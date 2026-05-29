"use client";

import { CheckCircle2 } from "lucide-react";
import type { Lang } from "./copy";
import { roomCopy } from "./copy";

export function EndedView({ lang, summary }: { lang: Lang; summary: string | null }) {
  const c = roomCopy(lang);
  return (
    <div className="iv-center">
      <div className="card iv-card">
        <span
          className="grid size-11 place-items-center rounded-full bg-success-soft text-success"
          aria-hidden
        >
          <CheckCircle2 size={22} strokeWidth={2} />
        </span>
        <span className="eyebrow text-success iv-card__eyebrow">{c.endedEyebrow}</span>
        <h1 className="title iv-card__title">{c.endedTitle}</h1>
        <p className="page-header__meta iv-card__body">{summary ?? c.endedBody}</p>
      </div>
    </div>
  );
}
