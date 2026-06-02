"use client";

import { useTranslations } from "next-intl";

import { StatusDisc } from "@/components/ui/status-disc";
import { Task, TaskContent, TaskItem, TaskTrigger } from "@/components/ui/task";
import { cn } from "@/lib/utils";
import type { SetupToolCallCard } from "@/lib/api";
import { isInteractive, labelFor, summarize } from "@/lib/setup/toolCardMeta";
import { ToolCallCard } from "./ToolCallCard";

/**
 * A turn's tool calls as an agent-execution log (AI Elements `Task` style):
 * the applied catalog patches collapse into a titled, connector-ruled list —
 * each row a status disc + what EDDA did + a one-line diff. A rare follow-up
 * question (request_input) renders as a clean inline prompt with reply chips.
 * No heavy cards; the "still drafting" shimmer lives in the chat trailer.
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

  const fieldCards = cards.filter((c) => !isInteractive(c.tool) && c.applied !== false);
  const rejected = cards.filter((c) => !isInteractive(c.tool) && c.applied === false);
  const interactive = cards.filter((c) => isInteractive(c.tool));

  // A turn that sets the objective or goals is a full study design; otherwise
  // it's a targeted refinement.
  const designed = fieldCards.some(
    (c) => c.tool === "set_objective" || c.tool === "set_goals",
  );

  return (
    <div className="mt-3 flex flex-col gap-3">
      {fieldCards.length > 0 && (
        <Task>
          <TaskTrigger
            icon={<StatusDisc state="done" size="sm" />}
            title={`${designed ? t("designedStudy") : t("updatedCatalog")} · ${fieldCards.length}`}
          />
          <TaskContent>
            {fieldCards.map((card, i) => (
              <LogRow key={i} card={card} t={t} />
            ))}
          </TaskContent>
        </Task>
      )}

      {rejected.map((card, i) => (
        <LogRow key={`r${i}`} card={card} t={t} />
      ))}

      {interactive.map((card, i) => (
        <ToolCallCard key={`x${i}`} card={card} onReply={onReply} />
      ))}
    </div>
  );
}

/** One settled patch: status disc + human label + one-line diff. */
function LogRow({
  card,
  t,
}: {
  card: SetupToolCallCard;
  t: (k: string) => string;
}) {
  const rejected = card.applied === false;
  const summary = summarize(card);
  return (
    <TaskItem className="flex items-start gap-2.5">
      <span className="mt-[3px] shrink-0">
        <StatusDisc state={rejected ? "error" : "done"} size="sm" />
      </span>
      <span className="min-w-0">
        <span className={cn("font-medium", rejected ? "text-fg-muted" : "text-fg")}>
          {labelFor(card.tool, t)}
        </span>
        {summary && <span className="text-fg-muted"> — {summary}</span>}
      </span>
    </TaskItem>
  );
}
