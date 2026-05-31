"use client";

import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { DashedConnector } from "@/components/ui/dashed-connector";
import { StatusDisc, toStatusState } from "@/components/ui/status-disc";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
 * agent-plan — the white-modernist plan view (claude.ai task-list feel).
 *
 * Rebuilt off the retired austere "status-spine ledger": the plan now lives on
 * a clean white Card with a calm SectionHeading (sentence-case title + muted
 * count — no "§" glyph, no all-caps eyebrow). Each task is a roomy row with a
 * StatusDisc, a SANS tabular-nums index, the title, and soft pill Badges for
 * dependencies / MCP tools. Children reveal under a quiet hairline connector.
 * Hover is a gentle surface tint; the lone continuous animation is the
 * StatusDisc pulse on the single live row.
 * ────────────────────────────────────────────────────────────────────────── */

const APPLE_EASE = [0.2, 0.65, 0.3, 0.9] as const;

// Type definitions
interface Subtask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  tools?: string[]; // Optional array of MCP server tools
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  level: number;
  dependencies: string[];
  subtasks: Subtask[];
}

// Initial task data
const initialTasks: Task[] = [
  {
    id: "1",
    title: "Research Project Requirements",
    description:
      "Gather all necessary information about project scope and requirements",
    status: "in-progress",
    priority: "high",
    level: 0,
    dependencies: [],
    subtasks: [
      {
        id: "1.1",
        title: "Interview stakeholders",
        description:
          "Conduct interviews with key stakeholders to understand needs",
        status: "completed",
        priority: "high",
        tools: ["communication-agent", "meeting-scheduler"],
      },
      {
        id: "1.2",
        title: "Review existing documentation",
        description:
          "Go through all available documentation and extract requirements",
        status: "in-progress",
        priority: "medium",
        tools: ["file-system", "browser"],
      },
      {
        id: "1.3",
        title: "Compile findings report",
        description:
          "Create a comprehensive report of all gathered information",
        status: "need-help",
        priority: "medium",
        tools: ["file-system", "markdown-processor"],
      },
    ],
  },
  {
    id: "2",
    title: "Design System Architecture",
    description: "Create the overall system architecture based on requirements",
    status: "in-progress",
    priority: "high",
    level: 0,
    dependencies: [],
    subtasks: [
      {
        id: "2.1",
        title: "Define component structure",
        description: "Map out all required components and their interactions",
        status: "pending",
        priority: "high",
        tools: ["architecture-planner", "diagramming-tool"],
      },
      {
        id: "2.2",
        title: "Create data flow diagrams",
        description:
          "Design diagrams showing how data will flow through the system",
        status: "pending",
        priority: "medium",
        tools: ["diagramming-tool", "file-system"],
      },
      {
        id: "2.3",
        title: "Document API specifications",
        description: "Write detailed specifications for all APIs in the system",
        status: "pending",
        priority: "high",
        tools: ["api-designer", "openapi-generator"],
      },
    ],
  },
  {
    id: "3",
    title: "Implementation Planning",
    description: "Create a detailed plan for implementing the system",
    status: "pending",
    priority: "medium",
    level: 1,
    dependencies: ["1", "2"],
    subtasks: [
      {
        id: "3.1",
        title: "Resource allocation",
        description: "Determine required resources and allocate them to tasks",
        status: "pending",
        priority: "medium",
        tools: ["project-manager", "resource-calculator"],
      },
      {
        id: "3.2",
        title: "Timeline development",
        description: "Create a timeline with milestones and deadlines",
        status: "pending",
        priority: "high",
        tools: ["timeline-generator", "gantt-chart-creator"],
      },
      {
        id: "3.3",
        title: "Risk assessment",
        description:
          "Identify potential risks and develop mitigation strategies",
        status: "pending",
        priority: "medium",
        tools: ["risk-analyzer"],
      },
    ],
  },
  {
    id: "4",
    title: "Development Environment Setup",
    description: "Set up all necessary tools and environments for development",
    status: "in-progress",
    priority: "high",
    level: 0,
    dependencies: [],
    subtasks: [
      {
        id: "4.1",
        title: "Install development tools",
        description:
          "Set up IDEs, version control, and other necessary development tools",
        status: "pending",
        priority: "high",
        tools: ["shell", "package-manager"],
      },
      {
        id: "4.2",
        title: "Configure CI/CD pipeline",
        description: "Set up continuous integration and deployment pipelines",
        status: "pending",
        priority: "medium",
        tools: ["github-actions", "gitlab-ci", "jenkins-connector"],
      },
      {
        id: "4.3",
        title: "Set up testing framework",
        description: "Configure automated testing frameworks for the project",
        status: "pending",
        priority: "high",
        tools: ["test-runner", "shell"],
      },
    ],
  },
  {
    id: "5",
    title: "Initial Development Sprint",
    description: "Execute the first development sprint based on the plan",
    status: "pending",
    priority: "medium",
    level: 1,
    dependencies: ["4"],
    subtasks: [
      {
        id: "5.1",
        title: "Implement core features",
        description:
          "Develop the essential features identified in the requirements",
        status: "pending",
        priority: "high",
        tools: ["code-assistant", "github", "file-system", "shell"],
      },
      {
        id: "5.2",
        title: "Perform unit testing",
        description: "Create and execute unit tests for implemented features",
        status: "pending",
        priority: "medium",
        tools: ["test-runner", "code-coverage-analyzer"],
      },
      {
        id: "5.3",
        title: "Document code",
        description: "Create documentation for the implemented code",
        status: "pending",
        priority: "low",
        tools: ["documentation-generator", "markdown-processor"],
      },
    ],
  },
];

/** Cycle a task's status through the lifecycle (the demo's click affordance). */
const STATUS_CYCLE = [
  "completed",
  "in-progress",
  "pending",
  "need-help",
  "failed",
];

export default function Plan() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [expandedTasks, setExpandedTasks] = useState<string[]>(["1"]);
  const [expandedSubtasks, setExpandedSubtasks] = useState<{
    [key: string]: boolean;
  }>({});
  const prefersReducedMotion = useReducedMotion();

  // Toggle task expansion
  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  // Toggle subtask expansion
  const toggleSubtaskExpansion = (taskId: string, subtaskId: string) => {
    const key = `${taskId}-${subtaskId}`;
    setExpandedSubtasks((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Cycle task status (and complete subtasks when the parent completes).
  const toggleTaskStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const newStatus =
          STATUS_CYCLE[Math.floor(Math.random() * STATUS_CYCLE.length)];
        return {
          ...task,
          status: newStatus,
          subtasks: task.subtasks.map((subtask) => ({
            ...subtask,
            status: newStatus === "completed" ? "completed" : subtask.status,
          })),
        };
      }),
    );
  };

  // Toggle subtask status (auto-complete parent when all children done).
  const toggleSubtaskStatus = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const updatedSubtasks = task.subtasks.map((subtask) =>
          subtask.id === subtaskId
            ? {
                ...subtask,
                status:
                  subtask.status === "completed" ? "pending" : "completed",
              }
            : subtask,
        );
        const allCompleted = updatedSubtasks.every(
          (s) => s.status === "completed",
        );
        return {
          ...task,
          subtasks: updatedSubtasks,
          status: allCompleted ? "completed" : task.status,
        };
      }),
    );
  };

  // Animation variants with reduced motion support
  const taskVariants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : -5 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: prefersReducedMotion ? "tween" : "spring",
        stiffness: 500,
        damping: 30,
        duration: prefersReducedMotion ? 0.2 : undefined,
      },
    },
    exit: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : -5,
      transition: { duration: 0.15 },
    },
  };

  const subtaskListVariants: Variants = {
    hidden: { opacity: 0, height: 0, overflow: "hidden" },
    visible: {
      height: "auto",
      opacity: 1,
      overflow: "visible",
      transition: {
        duration: 0.26,
        staggerChildren: prefersReducedMotion ? 0 : 0.05,
        when: "beforeChildren",
        ease: APPLE_EASE,
      },
    },
    exit: {
      height: 0,
      opacity: 0,
      overflow: "hidden",
      transition: { duration: 0.2, ease: APPLE_EASE },
    },
  };

  const subtaskVariants: Variants = {
    hidden: { opacity: 0, x: prefersReducedMotion ? 0 : -8 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: prefersReducedMotion ? "tween" : "spring",
        stiffness: 500,
        damping: 25,
        duration: prefersReducedMotion ? 0.2 : undefined,
      },
    },
    exit: {
      opacity: 0,
      x: prefersReducedMotion ? 0 : -8,
      transition: { duration: 0.15 },
    },
  };

  const subtaskDetailsVariants: Variants = {
    hidden: { opacity: 0, height: 0, overflow: "hidden" },
    visible: {
      opacity: 1,
      height: "auto",
      overflow: "visible",
      transition: { duration: 0.25, ease: APPLE_EASE },
    },
  };

  const completed = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="text-fg h-full overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: APPLE_EASE },
        }}
      >
        {/* Calm section header — sentence-case title + muted completed count. */}
        <SectionHeading
          title="Plan"
          action={
            <span className="text-[length:var(--text-meta)] tabular-nums text-fg-subtle">
              {completed}/{tasks.length}
            </span>
          }
        />

        <Card variant="ledger" className="overflow-hidden">
        <LayoutGroup>
          <ul className="divide-y divide-line-subtle overflow-hidden">
            {tasks.map((task) => {
              const isExpanded = expandedTasks.includes(task.id);
              const isCompleted = task.status === "completed";
              const taskState = toStatusState(task.status);

              return (
                <motion.li
                  key={task.id}
                  initial="hidden"
                  animate="visible"
                  variants={taskVariants}
                >
                  {/* Parent row — disc | index + title | deps | chevron */}
                  <div
                    className="group flex cursor-pointer items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-2 data-[open=true]:bg-surface-2/60"
                    data-open={isExpanded}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => toggleTaskExpansion(task.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleTaskExpansion(task.id);
                      }
                    }}
                  >
                    <span
                      className="inline-flex w-[28px] shrink-0 cursor-pointer justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskStatus(task.id);
                      }}
                    >
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={task.status}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2, ease: APPLE_EASE }}
                          className="inline-flex"
                        >
                          <StatusDisc state={taskState} />
                        </motion.span>
                      </AnimatePresence>
                    </span>

                    <div className="flex min-w-0 flex-1 items-baseline gap-3">
                      <span className="shrink-0 text-[length:var(--text-meta)] tabular-nums text-fg-subtle">
                        {task.id.padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "truncate text-[length:var(--text-body)] font-medium text-fg",
                          isCompleted && "text-fg-muted line-through",
                        )}
                      >
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {task.dependencies.length > 0 &&
                        task.dependencies.map((dep) => (
                          <Badge key={dep} variant="secondary">
                            {dep.padStart(2, "0")}
                          </Badge>
                        ))}
                      <span
                        className="text-fg-subtle transition-transform duration-200 group-data-[open=true]:rotate-90"
                        aria-hidden
                      >
                        <ChevronRight className="size-4" />
                      </span>
                    </div>
                  </div>

                  {/* Subtasks — set off only by indent + dashed connector. */}
                  <AnimatePresence mode="wait">
                    {isExpanded && task.subtasks.length > 0 && (
                      <motion.div
                        className="relative overflow-hidden"
                        variants={subtaskListVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        layout
                      >
                        <DashedConnector
                          orientation="vertical"
                          tone={taskState === "live" ? "active" : "default"}
                          weight={1}
                          className="left-[calc(20px+14px)] top-1 bottom-3"
                        />
                        <ul className="pb-2">
                          {task.subtasks.map((subtask) => {
                            const subtaskKey = `${task.id}-${subtask.id}`;
                            const isSubtaskExpanded =
                              expandedSubtasks[subtaskKey];
                            const subState = toStatusState(subtask.status);

                            return (
                              <motion.li
                                key={subtask.id}
                                variants={subtaskVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                layout
                              >
                                <div
                                  className="group flex cursor-pointer items-center gap-3 py-2.5 pr-5 pl-12 transition-colors hover:bg-surface-2"
                                  role="button"
                                  tabIndex={0}
                                  onClick={() =>
                                    toggleSubtaskExpansion(task.id, subtask.id)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      toggleSubtaskExpansion(
                                        task.id,
                                        subtask.id,
                                      );
                                    }
                                  }}
                                >
                                  <span
                                    className="inline-flex shrink-0 cursor-pointer justify-center"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSubtaskStatus(task.id, subtask.id);
                                    }}
                                  >
                                    <AnimatePresence mode="wait">
                                      <motion.span
                                        key={subtask.status}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{
                                          duration: 0.2,
                                          ease: APPLE_EASE,
                                        }}
                                        className="inline-flex"
                                      >
                                        <StatusDisc
                                          state={subState}
                                          size="sm"
                                        />
                                      </motion.span>
                                    </AnimatePresence>
                                  </span>

                                  <div className="flex min-w-0 flex-1 items-baseline gap-3">
                                    <span className="shrink-0 text-[length:var(--text-meta)] tabular-nums text-fg-subtle">
                                      {subtask.id}
                                    </span>
                                    <span
                                      className={cn(
                                        "truncate text-[length:var(--text-body)] text-fg-muted",
                                        subtask.status === "completed" &&
                                          "line-through",
                                      )}
                                    >
                                      {subtask.title}
                                    </span>
                                  </div>
                                </div>

                                <AnimatePresence mode="wait">
                                  {isSubtaskExpanded && (
                                    <motion.div
                                      className="text-fg-muted relative overflow-hidden pr-5 pb-3 pl-[60px]"
                                      variants={subtaskDetailsVariants}
                                      initial="hidden"
                                      animate="visible"
                                      exit="hidden"
                                      layout
                                    >
                                      <p className="py-2 text-[length:var(--text-body)] leading-relaxed text-fg-muted">
                                        {subtask.description}
                                      </p>
                                      {subtask.tools &&
                                        subtask.tools.length > 0 && (
                                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                            <span className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
                                              MCP
                                            </span>
                                            {subtask.tools.map((tool) => (
                                              <Badge key={tool} variant="secondary" mono>
                                                {tool}
                                              </Badge>
                                            ))}
                                          </div>
                                        )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </ul>
        </LayoutGroup>
        </Card>
      </motion.div>
    </div>
  );
}
