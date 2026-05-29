"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Plus, Minus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TYPES = [
  {
    value: "inductive" as const,
    title: "Induktiv",
    description: "Offene Entdeckung — keine vordefinierten Fragen",
  },
  {
    value: "deductive" as const,
    title: "Deduktiv",
    description: "Hypothesengeführt — mit eigenen Leitfragen",
  },
];

export function CampaignTypeSelector() {
  const [type, setType] = useState<"inductive" | "deductive">("inductive");
  const [questions, setQuestions] = useState<string[]>([""]);
  const reduceMotion = useReducedMotion();

  function addQuestion() {
    if (questions.length >= 8) return;
    setQuestions((prev) => [...prev, ""]);
  }

  function removeQuestion(idx: number) {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateQuestion(idx: number, value: string) {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? value : q)));
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TYPES.map((opt) => {
          const active = type === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "relative cursor-pointer rounded-card border bg-surface p-4 transition-colors",
                active
                  ? "border-accent-muted bg-accent-soft"
                  : "border-line hover:border-line-strong hover:bg-surface-2",
              )}
            >
              <input
                type="radio"
                name="campaign_type"
                value={opt.value}
                checked={active}
                onChange={() => setType(opt.value)}
                className="sr-only"
              />
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-fg">{opt.title}</p>
                {active ? (
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-canvas">
                    <Check className="h-3 w-3" />
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-snug text-fg-muted">
                {opt.description}
              </p>
            </label>
          );
        })}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {type === "deductive" ? (
          <motion.div
            key="deductive"
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.65, 0.3, 0.9] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-1">
              <p className="text-xs font-medium text-fg-subtle">
                Leitfragen <span className="font-normal">(max. 8)</span>
              </p>
              <ul className="flex flex-col gap-2">
                {questions.map((q, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Input
                      value={q}
                      onChange={(e) => updateQuestion(idx, e.target.value)}
                      placeholder={`Leitfrage ${idx + 1}`}
                      className="h-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      disabled={questions.length <= 1}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-ui text-fg-subtle transition-colors hover:bg-surface-2 hover:text-danger disabled:pointer-events-none disabled:opacity-30"
                      aria-label="Leitfrage entfernen"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addQuestion}
                disabled={questions.length >= 8}
                className="w-full"
              >
                <Plus className="h-4 w-4" />
                Leitfrage hinzufügen
              </Button>
              <input
                type="hidden"
                name="custom_questions"
                value={JSON.stringify(questions.filter((q) => q.trim()))}
              />
            </div>
          </motion.div>
        ) : (
          <input type="hidden" name="custom_questions" value="[]" />
        )}
      </AnimatePresence>
    </div>
  );
}
