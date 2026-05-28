"use client";

import type { Lang } from "./copy";
import { roomCopy } from "./copy";

export function EndedView({ lang, summary }: { lang: Lang; summary: string | null }) {
  const c = roomCopy(lang);
  return (
    <div className="iv-center">
      <div className="card iv-card">
        <span className="eyebrow" style={{ color: "var(--color-success)" }}>
          {c.endedEyebrow}
        </span>
        <h1 className="headline iv-card__title">{c.endedTitle}</h1>
        <p className="page-header__meta iv-card__body">{summary ?? c.endedBody}</p>
      </div>
    </div>
  );
}
