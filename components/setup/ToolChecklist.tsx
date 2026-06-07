"use client";

import { useTranslations } from "next-intl";

import { TodoTool, type TodoItem } from "@/components/ui/todo-tool";
import type { SetupToolCallCard } from "@/lib/api";
import { isInteractive, labelFor, summarize } from "@/lib/setup/toolCardMeta";
import { ToolCallCard } from "./ToolCallCard";

/**
 * A turn's tool calls rendered as the agent "to-do" log ({@link TodoTool}): each
 * applied catalog patch is a checked-off item ("what EDDA did — one-line diff").
 * A rare follow-up question (request_input) keeps its clean inline prompt with
 * reply chips. The "still drafting" shimmer lives in the chat trailer.
 */
export function ToolChecklist({
  cards,
  onReply,
}: {
  cards: SetupToolCallCard[];
  onReply?: (message: string) => void;
}) {
  const t = useTranslations("setup.toolCard");
  if (cards.length === 0) return null;

  const fieldCards = cards.filter((c) => !isInteractive(c.tool));
  const interactive = cards.filter((c) => isInteractive(c.tool));

  const todos: TodoItem[] = fieldCards.map((c) => {
    const summary = summarize(c);
    return {
      content: summary ? `${labelFor(c.tool, t)} — ${summary}` : labelFor(c.tool, t),
      // A rejected patch is the only non-completed state we can get here.
      status: c.applied === false ? "pending" : "completed",
    };
  });

  return (
    <div className="mt-3 flex flex-col gap-3">
      {todos.length > 0 && <TodoTool todos={todos} />}
      {interactive.map((card, i) => (
        <ToolCallCard key={`x${i}`} card={card} onReply={onReply} />
      ))}
    </div>
  );
}
