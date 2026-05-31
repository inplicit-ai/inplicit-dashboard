"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Plus, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusDisc } from "@/components/ui/status-disc";
import type { CampaignDraft, Person, SetupToolCall } from "@/lib/api";
import { SectionCard } from "./SectionCard";
import { PlatePlaceholder } from "./Catalog";

/**
 * People section (doc 03 §4 #10) — re-cut as a participant register on the spine.
 *
 * Each row sits on the shared status spine: a StatusDisc encodes validity
 * (done = a real email, error = missing "@"), the email is rendered in mono so
 * the column reads as the anon-id register it becomes after launch. CSV upload
 * de-dups by email and lands its rows inline immediately — no jump, no box.
 *
 * Every edit dispatches a `set_people` tool call so the catalog stays the single
 * source of truth (same reducer, two writers). PII stays client-side until
 * launch materialises participants; the agent only ever sees counts.
 */
export function PeopleSection({
  draft,
  onPatch,
  touched,
}: {
  draft: CampaignDraft;
  onPatch: (call: SetupToolCall) => void;
  touched?: boolean;
}) {
  const t = useTranslations("setup.catalog");
  const fileRef = useRef<HTMLInputElement>(null);
  const people = draft.people ?? [];

  const emit = (next: Person[]) =>
    onPatch({ tool: "set_people", args: { people: next } });

  const setRow = (i: number, patch: Partial<Person>) =>
    emit(people.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const addRow = () => emit([...people, { name: "", email: "" }]);
  const removeRow = (i: number) => emit(people.filter((_, idx) => idx !== i));

  const onCsv = async (file: File) => {
    const text = await file.text();
    const merged = mergePeople(people, parseCsv(text));
    emit(merged);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <SectionCard
      index="§ 06"
      title={t("people")}
      count={people.length || undefined}
      touched={touched}
    >
      <div className="flex flex-col gap-3">
        {people.length === 0 ? (
          <PlatePlaceholder>{t("peopleEmpty")}</PlatePlaceholder>
        ) : (
          <ul className="flex flex-col">
            {people.map((p, i) => {
              const valid = p.email.includes("@");
              return (
                <li
                  key={i}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-line-subtle py-2 last:border-b-0"
                >
                  {/* Spine — validity disc on the shared x-axis. */}
                  <StatusDisc state={valid ? "done" : "error"} size="sm" />
                  <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                    <Input
                      value={p.name ?? ""}
                      placeholder={t("personName")}
                      onChange={(e) => setRow(i, { name: e.target.value })}
                      className="h-8 sm:flex-[2]"
                    />
                    <Input
                      value={p.email}
                      placeholder={t("personEmail")}
                      type="email"
                      onChange={(e) => setRow(i, { email: e.target.value })}
                      className="h-8 font-mono sm:flex-[3] sm:min-w-[14rem]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="grid size-8 shrink-0 place-items-center rounded-ui text-fg-subtle transition-colors hover:bg-surface-2 hover:text-danger"
                    aria-label={t("removePerson")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4" />
            {t("addPerson")}
          </Button>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[length:var(--text-eyebrow)] tabular-nums text-fg-subtle">
              {t("peopleCount", { count: people.length })}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onCsv(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {t("uploadCsv")}
            </Button>
          </div>
        </div>
        <p className="font-mono text-[length:var(--text-eyebrow)] uppercase tracking-[0.06em] text-fg-subtle">
          {t("csvHint")}
        </p>
      </div>
    </SectionCard>
  );
}

/**
 * Minimal CSV parser for the audience editor. Detects the header row, finds the
 * `email`/`name` columns, and falls back to positional (email, name) when there
 * is no recognisable header. Defensive: drops rows without an `@`.
 */
export function parseCsv(text: string): Person[] {
  const rows = text
    .replace(/^﻿/, "") // strip BOM
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (rows.length === 0) return [];

  const split = (line: string) => line.split(",").map((c) => c.trim());
  const header = split(rows[0]).map((h) => h.toLowerCase());
  const hasHeader = header.some((h) => h === "email" || h === "name");
  const emailIdx = hasHeader ? header.indexOf("email") : 0;
  const nameIdx = hasHeader ? header.indexOf("name") : 1;
  const body = hasHeader ? rows.slice(1) : rows;

  const out: Person[] = [];
  for (const line of body) {
    const cells = split(line);
    const email = (emailIdx >= 0 ? cells[emailIdx] : cells[0]) ?? "";
    if (!email.includes("@")) continue;
    const name = nameIdx >= 0 ? cells[nameIdx] : undefined;
    out.push({ email, name: name || undefined });
  }
  return out;
}

/** Merge CSV rows into existing people, de-duping by lowercase email. */
export function mergePeople(existing: Person[], incoming: Person[]): Person[] {
  const byEmail = new Map<string, Person>();
  for (const p of existing) byEmail.set(p.email.toLowerCase(), p);
  for (const p of incoming) {
    const key = p.email.toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, p);
  }
  return [...byEmail.values()];
}
