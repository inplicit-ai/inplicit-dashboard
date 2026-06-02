"use client";

import * as React from "react";
import { Check, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * TodoTool — the agent "to-do" log for streamed tool calls. Adapted to the app's
 * design tokens (the source used raw zinc/neutral + dark: classes, which clash
 * with the white-modernist palette and the amber-only rule). The streaming label
 * reuses the tokenized `.edda-shimmer` sweep from design.css.
 */

export type TodoItem = {
  content: string;
  status: "pending" | "in_progress" | "completed";
};

export type TodoToolProps = {
  /** "streaming" shows the shimmer label; otherwise renders the list. */
  state?: "idle" | "streaming";
  todos?: TodoItem[];
  /** Streaming label: "Designing…" vs "Updating…". */
  isCreation?: boolean;
  /** Streaming label text (overrides the default copy). */
  streamingLabel?: string;
  className?: string;
};

function TodoStatusIcon({ status }: { status: TodoItem["status"] }) {
  const ring =
    "flex size-3.5 shrink-0 items-center justify-center rounded-full border";
  if (status === "completed") {
    return (
      <div className={cn(ring, "border-line")}>
        <Check className="size-2 text-fg-subtle" strokeWidth={3} />
      </div>
    );
  }
  if (status === "in_progress") {
    return (
      <div className={cn(ring, "border-line-strong")}>
        <ArrowRight className="size-2 text-fg-muted" strokeWidth={3} />
      </div>
    );
  }
  return <div className={cn(ring, "border-line-strong")} />;
}

const TodoListItem = React.memo(function TodoListItem({ todo }: { todo: TodoItem }) {
  const dim = todo.status !== "in_progress";
  return (
    <div className="flex items-start gap-2">
      <div className="mt-[3px]">
        <TodoStatusIcon status={todo.status} />
      </div>
      <span
        className={cn(
          "text-[length:var(--text-body)] leading-[1.5]",
          todo.status === "completed" && "line-through",
          dim ? "text-fg-muted" : "text-fg",
        )}
      >
        {todo.content}
      </span>
    </div>
  );
});

export const TodoTool = React.memo(function TodoTool({
  state = "idle",
  todos = [],
  isCreation = false,
  streamingLabel,
  className,
}: TodoToolProps) {
  const isStreaming = state === "streaming" || todos.length === 0;

  if (isStreaming) {
    return (
      <div className={cn("text-[length:var(--text-meta)]", className)}>
        <span className="edda-shimmer">
          {streamingLabel ?? (isCreation ? "Designing…" : "Updating…")}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {todos.map((todo, idx) => (
        <TodoListItem key={idx} todo={todo} />
      ))}
    </div>
  );
});
