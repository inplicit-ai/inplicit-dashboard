"use client";

import { type ReactNode, type RefObject } from "react";
import type { Lang } from "./copy";
import { roomCopy } from "./copy";
import type { Msg } from "./types";

interface Props {
  lang: Lang;
  messages: Msg[];
  interimUser: string;
  scrollRef: RefObject<HTMLDivElement | null>;
}

// Strip agent control markers (e.g. <spell> hints, dangling tags) before render.
function cleanAgentText(s: string): string {
  return s.replace(/<\/?spell>/gi, "").replace(/<\/?[a-z]*$/i, "");
}

/**
 * Conversation transcript. Stick-to-bottom is handled by the orchestrator
 * scrolling `scrollRef` on new content (mirrors the AI Elements Conversation
 * behaviour adopted in 01 without pulling the dependency into this island).
 */
export function Transcript({ lang, messages, interimUser, scrollRef }: Props) {
  const c = roomCopy(lang);
  return (
    <div ref={scrollRef} className="iv-transcript">
      {messages.length === 0 && (
        <p className="caption iv-transcript__empty">{c.transcriptEmpty}</p>
      )}
      {messages.map((m) => (
        <Bubble key={m.id} role={m.role}>
          {m.role === "agent" ? cleanAgentText(m.text) : m.text}
          {m.role === "agent" && m.streaming && <Cursor />}
        </Bubble>
      ))}
      {interimUser && (
        <div className="iv-bubble-row iv-bubble-row--right">
          <div className="iv-bubble iv-bubble--user iv-bubble--interim">
            {interimUser} <Cursor />
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ role, children }: { role: "agent" | "user"; children: ReactNode }) {
  const klass = role === "user" ? "iv-bubble iv-bubble--user" : "iv-bubble iv-bubble--agent";
  const rowKlass = role === "user" ? "iv-bubble-row iv-bubble-row--right" : "iv-bubble-row";
  return (
    <div className={rowKlass}>
      <div className={klass}>{children}</div>
    </div>
  );
}

function Cursor() {
  return <span className="iv-cursor" />;
}
