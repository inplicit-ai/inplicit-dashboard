"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CampaignDraft, Person, SetupToolCall } from "@/lib/api";
import { SectionCard } from "./SectionCard";

/**
 * People section (doc 03 §4 #10): name+email rows + CSV upload. CSV reuses the
 * same column semantics as `POST /api/campaigns/upload` (email required; name,
 * department, role optional). PII stays client-side in the draft until launch
 * materialises participants on the backend — the agent only ever sees counts.
 *
 * Every edit dispatches a `set_people` tool call so the catalog stays the single
 * source of truth (same reducer, two writers).
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
    <SectionCard title={t("people")} touched={touched}>
      <div className="flex flex-col gap-2">
        {people.length === 0 ? (
          <p className="text-sm text-fg-muted">{t("peopleEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {people.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <Input
                  value={p.name ?? ""}
                  placeholder={t("personName")}
                  onChange={(e) => setRow(i, { name: e.target.value })}
                  className="h-8 flex-[2] text-sm"
                />
                <Input
                  value={p.email}
                  placeholder={t("personEmail")}
                  type="email"
                  onChange={(e) => setRow(i, { email: e.target.value })}
                  className="h-8 flex-[3] text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="shrink-0 rounded-sm px-2 py-1 text-xs text-fg-muted hover:text-fg"
                  aria-label={t("removePerson")}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            className="h-8"
          >
            {t("addPerson")}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-fg-subtle">
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
              className="h-8"
            >
              {t("uploadCsv")}
            </Button>
          </div>
        </div>
        <p className="text-[11px] leading-snug text-fg-subtle">{t("csvHint")}</p>
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
