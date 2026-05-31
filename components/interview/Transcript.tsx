"use client";

import { type RefObject } from "react";
import { ConversationTurn } from "@/components/ui/conversation-turn";
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
 * Transcript — the running interview echo as calm ConversationTurn rows
 * (manifesto: interview-experience). assistant = the AI agent, user = the
 * participant; 68ch, content-first, no bubble border on the agent side. The
 * orchestrator sticks-to-bottom by scrolling `scrollRef` on new content.
 */
export function Transcript({ lang, messages, interimUser, scrollRef }: Props) {
  const c = roomCopy(lang);
  return (
    <div ref={scrollRef} className="iv-transcript">
      {messages.length === 0 && !interimUser && (
        <p className="caption iv-transcript__empty">{c.transcriptEmpty}</p>
      )}

      {messages.map((m) => (
        <ConversationTurn key={m.id} role={m.role === "agent" ? "assistant" : "user"}>
          {m.role === "agent" ? (
            <>
              {cleanAgentText(m.text)}
              {m.streaming && <Cursor />}
            </>
          ) : (
            m.text
          )}
        </ConversationTurn>
      ))}

      {interimUser && (
        <ConversationTurn role="user" className="iv-turn--interim">
          {interimUser}
          <Cursor />
        </ConversationTurn>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .iv-transcript { flex: 1; overflow-y: auto; min-height: 0; display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-2) 0 var(--space-4); }
        .iv-transcript__empty { margin: auto 0; color: var(--color-text-tertiary); text-align: center; }
        .iv-turn--interim { opacity: 0.6; }
        .iv-cursor { display: inline-block; width: 2px; height: 0.95em; margin-left: 2px; vertical-align: -2px; background: currentColor; opacity: 0.65; animation: iv-blink 1s steps(2) infinite; }
        @keyframes iv-blink { to { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .iv-cursor { animation: none; } }
      `,
        }}
      />
    </div>
  );
}

function Cursor() {
  return <span className="iv-cursor" />;
}
