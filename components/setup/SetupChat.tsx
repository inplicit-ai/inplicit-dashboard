"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, Sparkles } from "lucide-react";
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SetupToolCallCard } from "@/lib/api";
import { ToolCallCard } from "./ToolCallCard";

export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: SetupToolCallCard[];
};

/**
 * The chat pane (doc 03 §7). AI-legible: assistant turns interleave prose with
 * tool-call cards. The header carries the honest-AI label (EU AI Act spirit,
 * doc 03 §9). Auto-scrolls to the latest turn.
 */
export function SetupChat({
  turns,
  streaming,
  onSend,
}: {
  turns: ChatTurn[];
  streaming: boolean;
  onSend: (message: string) => void;
}) {
  const t = useTranslations("setup.chat");
  const tAi = useTranslations("setup.ai");
  const [value, setValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, streaming]);

  function submit() {
    const msg = value.trim();
    if (!msg || streaming) return;
    onSend(msg);
    setValue("");
  }

  return (
    <div className="flex h-full flex-col">
      {/* Honest-AI header */}
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{t("title")}</p>
          <p className="truncate text-[11px] text-fg-muted">
            {tAi("disclaimer")}
          </p>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {turns.map((turn) => (
          <div key={turn.id} className="space-y-2">
            {turn.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-card rounded-br-sm bg-fg px-3.5 py-2 text-sm text-canvas">
                  {turn.content}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {turn.content && (
                  <div className="max-w-[90%] text-sm leading-relaxed text-fg">
                    {turn.content}
                  </div>
                )}
                {turn.toolCalls.length > 0 && (
                  <div className="flex max-w-[90%] flex-col gap-1.5">
                    {turn.toolCalls.map((c, i) => (
                      <ToolCallCard key={i} card={c} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {streaming && (
          <p className="text-xs italic text-fg-muted">{t("thinking")}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-line p-3">
        <PromptInput
          value={value}
          onValueChange={setValue}
          onSubmit={submit}
          isLoading={streaming}
          className="shadow-none"
        >
          <PromptInputTextarea
            placeholder={t("placeholder")}
            disabled={streaming}
          />
          <PromptInputActions className="justify-end pt-1">
            <Button
              type="button"
              size="icon-sm"
              onClick={submit}
              disabled={streaming || !value.trim()}
              className={cn("rounded-full")}
              aria-label={t("send")}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  );
}
