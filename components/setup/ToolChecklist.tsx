"use client";

import type { SetupToolCallCard } from "@/lib/api";
import { isCommit, isHidden, isInteractive } from "@/lib/setup/toolCardMeta";
import { ToolCallCard } from "./ToolCallCard";
import { ToolCommitCard } from "./ToolCommitCard";

/**
 * The chat's tool-call lane. Two visible kinds, in arrival order:
 *   - request_input → an interactive prompt with reply chips (ToolCallCard).
 *   - catalog-commit patches (set_goals, set_objective, …) → a compact, calm
 *     confirmation row so the user SEES each piece EDDA writes to the catalog
 *     ("ich möchte durch Tool Calls im Chat mitbekommen, was passiert").
 *
 * Internal state-machine markers (set_setup_state) and any unrecognised tool
 * are skipped entirely.
 */
export function ToolChecklist({
  cards,
  onReply,
}: {
  cards: SetupToolCallCard[];
  onReply?: (message: string) => void;
}) {
  const visible = cards.filter(
    (c) => !isHidden(c.tool) && (isInteractive(c.tool) || isCommit(c.tool)),
  );
  if (visible.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {visible.map((card, i) =>
        isInteractive(card.tool) ? (
          <ToolCallCard key={`t${i}`} card={card} onReply={onReply} />
        ) : (
          <ToolCommitCard key={`t${i}`} card={card} />
        ),
      )}
    </div>
  );
}
