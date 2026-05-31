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
 * (white-modernist). assistant = the AI agent, user = the participant. This is
 * the SOLE overflow region in the chat layout: it's `flex-1 min-h-0
 * overflow-y-auto`; the orchestrator pins the composer below it and never lets
 * the page itself scroll. Sticks-to-bottom by scrolling `scrollRef`.
 */
export function Transcript({ lang, messages, interimUser, scrollRef }: Props) {
  const c = roomCopy(lang);
  return (
    <div
      ref={scrollRef}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-2"
    >
      {messages.length === 0 && !interimUser && (
        <p className="m-auto text-center text-[length:var(--text-caption)] text-fg-subtle">
          {c.transcriptEmpty}
        </p>
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
        <ConversationTurn role="user" className="opacity-60">
          {interimUser}
          <Cursor />
        </ConversationTurn>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
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
