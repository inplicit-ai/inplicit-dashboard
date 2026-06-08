"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Upload, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusDisc } from "@/components/ui/status-disc";
import type { CampaignDraft, Person, SetupToolCall } from "@/lib/api";
import { SectionCard } from "./SectionCard";
import { PlatePlaceholder } from "./Catalog";

type Employee = {
  id: string;
  name?: string;
  email: string;
  department?: string;
  role_id?: string | null;
  role_name?: string | null;
};
type Mode = "all" | "department" | "individual";

/**
 * People section — 3-mode pill selector:
 *  • Gesamtes Unternehmen: fetches the workforce directory, adds everyone
 *  • Abteilung/Team: fetches the directory, filter by department
 *  • Einzelpersonen: manual email entry + CSV upload
 *
 * Data source: /dapi/orgs/me/employees (the org's workforce directory — the
 * people who get interviewed). NOT /members, which are admin collaborators with
 * dashboard access. The two groups are intentionally separate.
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

  const [mode, setMode] = useState<Mode>("all");
  const [members, setMembers] = useState<Employee[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());

  const emit = (next: Person[]) =>
    onPatch({ tool: "set_people", args: { people: next } });

  // Fetch the workforce directory once
  useEffect(() => {
    setLoadingMembers(true);
    fetch("/dapi/orgs/me/employees")
      .then((r) => r.ok ? r.json() : [])
      .then((data: Employee[]) => {
        setMembers(Array.isArray(data) ? data : []);
      })
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, []);

  // Unique departments
  const departments = Array.from(
    new Set(members.map((m) => m.department).filter(Boolean) as string[])
  ).sort();

  function selectAll() {
    const all: Person[] = members
      .filter((m) => m.email.includes("@"))
      .map((m) => ({ email: m.email, name: m.name }));
    emit(all);
  }

  function toggleDept(dept: string) {
    const next = new Set(selectedDepts);
    if (next.has(dept)) next.delete(dept); else next.add(dept);
    setSelectedDepts(next);
    // Update people: all members in selected depts
    const filtered: Person[] = members
      .filter((m) => m.department && next.has(m.department) && m.email.includes("@"))
      .map((m) => ({ email: m.email, name: m.name }));
    emit(filtered);
  }

  // Individual mode helpers
  const addRow = () => emit([...people, { name: "", email: "" }]);
  const removeRow = (i: number) => emit(people.filter((_, idx) => idx !== i));
  const setRow = (i: number, patch: Partial<Person>) =>
    emit(people.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const onCsv = async (file: File) => {
    const text = await file.text();
    const merged = mergePeople(people, parseCsv(text));
    emit(merged);
    if (fileRef.current) fileRef.current.value = "";
  };

  const modes: { key: Mode; label: string }[] = [
    { key: "all", label: "Gesamtes Unternehmen" },
    { key: "department", label: "Abteilung / Team" },
    { key: "individual", label: "Einzelpersonen" },
  ];

  return (
    <SectionCard
      title={t("people")}
      count={people.length || undefined}
      touched={touched}
    >
      <div className="flex flex-col gap-4">
        {/* Mode pill bar */}
        <div className="inline-flex w-full rounded-ui border border-line bg-surface p-0.5">
          {modes.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`flex-1 rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors ${
                mode === key ? "bg-fg text-canvas" : "text-fg-muted hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Mode: Gesamtes Unternehmen */}
        {mode === "all" && (
          <div className="flex flex-col gap-3">
            {loadingMembers ? (
              <PlatePlaceholder>Lade Personen…</PlatePlaceholder>
            ) : members.length === 0 ? (
              <PlatePlaceholder>Noch keine Personen im Verzeichnis.</PlatePlaceholder>
            ) : (
              <div className="flex items-center justify-between rounded-card border border-line bg-surface-2 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <p className="text-[length:var(--text-body-sm)] font-medium text-fg">
                    {members.length} Personen
                  </p>
                  <p className="text-[length:var(--text-meta)] text-fg-muted">
                    Alle Personen im Verzeichnis werden eingeladen
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={people.length === members.length ? "outline" : "default"}
                  onClick={selectAll}
                  className="shrink-0 gap-1.5"
                >
                  {people.length >= members.length && (
                    <Check size={13} className="text-success" />
                  )}
                  {people.length >= members.length ? "Ausgewählt" : "Alle hinzufügen"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Mode: Abteilung / Team */}
        {mode === "department" && (
          <div className="flex flex-col gap-2">
            {loadingMembers ? (
              <PlatePlaceholder>Lade Abteilungen…</PlatePlaceholder>
            ) : departments.length === 0 ? (
              <PlatePlaceholder>Keine Abteilungen gefunden.</PlatePlaceholder>
            ) : (
              departments.map((dept) => {
                const count = members.filter((m) => m.department === dept).length;
                const selected = selectedDepts.has(dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDept(dept)}
                    className={`flex items-center justify-between rounded-card border px-4 py-2.5 transition-colors ${
                      selected
                        ? "border-success/40 bg-success/5 text-fg"
                        : "border-line bg-surface text-fg hover:bg-surface-2"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {selected && <Check size={13} className="shrink-0 text-success" />}
                      <span className="text-[length:var(--text-body-sm)] font-medium">
                        {dept}
                      </span>
                    </div>
                    <span className="text-[length:var(--text-meta)] text-fg-muted">
                      {count} Person{count !== 1 ? "en" : ""}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Mode: Einzelpersonen */}
        {mode === "individual" && (
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
                          className="h-8 sm:flex-[3] sm:min-w-[14rem]"
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
                <span className="text-[length:var(--text-meta)] tabular-nums text-fg-subtle">
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
            <p className="text-[length:var(--text-caption)] text-fg-subtle">
              {t("csvHint")}
            </p>
          </div>
        )}

        {/* Summary — show who's selected across all modes */}
        {people.length > 0 && (
          <div className="flex items-center gap-2 rounded-card border border-success/30 bg-success/5 px-3 py-2">
            <Check size={13} className="shrink-0 text-success" />
            <span className="text-[length:var(--text-meta)] text-fg">
              {people.length} Teilnehmer:in{people.length !== 1 ? "nen" : ""} ausgewählt
            </span>
            <button
              type="button"
              onClick={() => emit([])}
              className="ml-auto text-[length:var(--text-meta)] text-fg-muted hover:text-danger"
            >
              Zurücksetzen
            </button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export function parseCsv(text: string): Person[] {
  const rows = text
    .replace(/^﻿/, "")
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

export function mergePeople(existing: Person[], incoming: Person[]): Person[] {
  const byEmail = new Map<string, Person>();
  for (const p of existing) byEmail.set(p.email.toLowerCase(), p);
  for (const p of incoming) {
    const key = p.email.toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, p);
  }
  return [...byEmail.values()];
}
