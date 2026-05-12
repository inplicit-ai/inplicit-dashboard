"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CampaignTypeSelector() {
  const [type, setType] = useState<"inductive" | "deductive">("inductive");
  const [questions, setQuestions] = useState<string[]>([""]);

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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {(["inductive", "deductive"] as const).map((t) => (
          <label
            key={t}
            className={cn(
              "cursor-pointer rounded-ui border p-4 transition-colors",
              type === t
                ? "border-accent bg-accent-soft"
                : "border-line bg-canvas hover:border-line-strong",
            )}
          >
            <input
              type="radio"
              name="campaign_type"
              value={t}
              checked={type === t}
              onChange={() => setType(t)}
              className="sr-only"
            />
            <p className="text-sm font-semibold text-fg">
              {t === "inductive" ? "Induktiv" : "Deduktiv"}
            </p>
            <p className="mt-1 text-xs text-fg-muted">
              {t === "inductive"
                ? "Offene Entdeckung — keine vordefinierten Fragen"
                : "Hypothesengeführt — mit eigenen Leitfragen"}
            </p>
          </label>
        ))}
      </div>

      {type === "deductive" && (
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-fg-muted">
            Leitfragen <span className="font-normal">(max. 8)</span>
          </p>
          {questions.map((q, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={q}
                onChange={(e) => updateQuestion(idx, e.target.value)}
                placeholder={`Leitfrage ${idx + 1}`}
                className="h-10 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeQuestion(idx)}
                disabled={questions.length <= 1}
                className="shrink-0 text-fg-muted hover:text-pain disabled:opacity-30"
                aria-label="Leitfrage entfernen"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          ))}
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
      )}

      {type === "inductive" && (
        <input type="hidden" name="custom_questions" value="[]" />
      )}
    </div>
  );
}
