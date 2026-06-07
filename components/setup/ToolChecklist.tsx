"use client";

import type { SetupToolCallCard } from "@/lib/api";
import { isInteractive } from "@/lib/setup/toolCardMeta";
import { ToolCallCard } from "./ToolCallCard";

/**
 * WHY-120 polish: catalog patches (set_goals / set_exploration_map / …) render
 * LIVE in the catalog panel, so we no longer echo them as opaque "to-do" cards in
 * the chat ("Ziele entworfen — 5 goals"). The chat keeps only the agent's prose
 * (rendered by the parent) plus rare interactive follow-ups (request_input) with
 * their reply chips.
 */
export function ToolChecklist({
  cards,
  onReply,
}: {
  cards: SetupToolCallCard[];
  onReply?: (message: string) => void;
}) {
  const interactive = cards.filter((c) => isInteractive(c.tool));
  if (interactive.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {interactive.map((card, i) => (
        <ToolCallCard key={`x${i}`} card={card} onReply={onReply} />
      ))}
    </div>
  );
}
