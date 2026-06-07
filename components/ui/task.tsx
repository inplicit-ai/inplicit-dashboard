"use client";

import {
  createContext,
  useContext,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { ChevronDownIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Task — an agent "what I did" log, modeled on the 21st.dev / AI Elements
 * `Task` API (Task / TaskTrigger / TaskContent / TaskItem / TaskItemFile) but
 * self-contained (no Radix dependency) and themed to the app tokens. A
 * collapsible, titled list of steps — the clean agent-execution aesthetic, not
 * a heavy card.
 */

const TaskCtx = createContext<{ open: boolean; toggle: () => void }>({
  open: true,
  toggle: () => {},
});

export type TaskProps = ComponentProps<"div"> & { defaultOpen?: boolean };

export function Task({ defaultOpen = true, className, children, ...props }: TaskProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <TaskCtx.Provider value={{ open, toggle: () => setOpen((o) => !o) }}>
      <div className={cn("flex flex-col", className)} {...props}>
        {children}
      </div>
    </TaskCtx.Provider>
  );
}

export type TaskTriggerProps = Omit<ComponentProps<"button">, "title"> & {
  title: ReactNode;
  icon?: ReactNode;
};

export function TaskTrigger({ title, icon, className, ...props }: TaskTriggerProps) {
  const { open, toggle } = useContext(TaskCtx);
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "group flex items-center gap-2 text-fg-muted transition-colors hover:text-fg",
        className,
      )}
      {...props}
    >
      {icon}
      <span className="text-[length:var(--text-body)] font-medium text-fg">{title}</span>
      <ChevronDownIcon
        className={cn("size-3.5 shrink-0 transition-transform", open ? "" : "-rotate-90")}
      />
    </button>
  );
}

export type TaskContentProps = ComponentProps<"div">;

export function TaskContent({ className, children, ...props }: TaskContentProps) {
  const { open } = useContext(TaskCtx);
  const prefersReducedMotion = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0.65, 0.3, 0.9] }}
          className="overflow-hidden"
        >
          <div
            className={cn("mt-2.5 ml-[5px] space-y-2 border-l border-line pl-4", className)}
            {...props}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export type TaskItemProps = ComponentProps<"div">;

export function TaskItem({ className, children, ...props }: TaskItemProps) {
  return (
    <div className={cn("text-[length:var(--text-body)] text-fg-muted", className)} {...props}>
      {children}
    </div>
  );
}

export type TaskItemFileProps = ComponentProps<"span">;

export function TaskItemFile({ className, children, ...props }: TaskItemFileProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[length:var(--text-caption)] text-fg",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
