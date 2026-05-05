"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Mail,
  Pencil,
  RotateCw,
  Send,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Participant } from "@/lib/api";

interface Props {
  campaignId: string;
  initial: Participant[];
}

interface DraftRow {
  email: string;
  name: string;
  department: string;
  role: string;
}

const EMPTY_DRAFT: DraftRow = { email: "", name: "", department: "", role: "" };

const FIELD_PLACEHOLDERS = {
  email: "person@unternehmen.de",
  name: "Vor- und Nachname",
  department: "z. B. Produktentwicklung",
  role: "z. B. Senior Engineer",
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function ParticipantsTable({ campaignId, initial }: Props) {
  const [rows, setRows] = useState<Participant[]>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRow>(EMPTY_DRAFT);
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<DraftRow>(EMPTY_DRAFT);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{
    type: "ok" | "err";
    message: string;
  } | null>(null);

  const counts = useMemo(() => {
    let invited = 0;
    let completed = 0;
    for (const p of rows) {
      if (p.email_sent) invited += 1;
      if (
        p.latest_interview_status === "COMPLETED" ||
        p.latest_interview_status === "PROCESSING" ||
        p.latest_interview_status === "PROCESSED"
      ) {
        completed += 1;
      }
    }
    return { total: rows.length, invited, completed };
  }, [rows]);

  function flashOk(message: string) {
    setFlash({ type: "ok", message });
    setTimeout(() => setFlash(null), 4000);
  }
  function flashErr(message: string) {
    setFlash({ type: "err", message });
    setTimeout(() => setFlash(null), 6000);
  }

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const proxied = path.replace(/^\/api\//, "/dapi/");
    const res = await fetch(proxied, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
    if (!res.ok) {
      let detail = "";
      try {
        const j = (await res.json()) as { error?: string };
        detail = j.error ?? JSON.stringify(j);
      } catch {
        detail = await res.text();
      }
      throw new Error(detail || `HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  }

  function startEdit(p: Participant) {
    setEditing(p.id);
    setDraft({
      email: p.email,
      name: p.name ?? "",
      department: p.department ?? "",
      role: p.role ?? "",
    });
  }

  function cancelEdit() {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
  }

  async function saveEdit(id: string) {
    setBusy(id);
    try {
      const updated = await api<Participant>(`/api/participants/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payloadFrom(draft)),
      });
      setRows((rs) => rs.map((r) => (r.id === id ? updated : r)));
      cancelEdit();
      flashOk("Teilnehmer aktualisiert.");
    } catch (e) {
      flashErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function deleteRow(p: Participant) {
    if (!confirm(`Teilnehmer ${p.email} wirklich löschen?`)) return;
    setBusy(p.id);
    try {
      await api(`/api/participants/${p.id}`, { method: "DELETE" });
      setRows((rs) => rs.filter((r) => r.id !== p.id));
      flashOk("Teilnehmer gelöscht.");
    } catch (e) {
      flashErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function inviteRow(p: Participant, reset = false) {
    setBusy(p.id);
    try {
      const result = await api<{ ok: boolean; sent?: boolean; dev_link?: string }>(
        `/api/participants/${p.id}/invite`,
        { method: "POST", body: JSON.stringify({ reset }) },
      );
      const refreshed = await api<Participant[]>(
        `/api/campaigns/${campaignId}/participants`,
      );
      setRows(refreshed);
      if (result.sent) {
        flashOk(`Einladung an ${p.email} verschickt.`);
      } else if (result.dev_link) {
        flashOk(
          `Resend nicht konfiguriert. Dev-Link in der Konsole geloggt für ${p.email}.`,
        );
      } else {
        flashOk("Einladung verarbeitet.");
      }
    } catch (e) {
      flashErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function addRow() {
    if (!newDraft.email.includes("@")) {
      flashErr("Bitte eine gültige E-Mail eingeben.");
      return;
    }
    setBusy("__new__");
    try {
      const created = await api<Participant>(
        `/api/campaigns/${campaignId}/participants`,
        {
          method: "POST",
          body: JSON.stringify(payloadFrom(newDraft)),
        },
      );
      setRows((rs) => [...rs, created]);
      setNewDraft(EMPTY_DRAFT);
      setAdding(false);
      flashOk("Teilnehmer hinzugefügt.");
    } catch (e) {
      flashErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header / KPI strip */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Stat label="Teilnehmer" value={counts.total} />
          <Divider />
          <Stat label="Eingeladen" value={counts.invited} />
          <Divider />
          <Stat label="Abgeschlossen" value={counts.completed} />
        </div>

        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus className="h-4 w-4" />
            Teilnehmer hinzufügen
          </Button>
        )}
      </div>

      {/* Flash banner */}
      {flash && <FlashBanner type={flash.type} message={flash.message} />}

      {/* Inline create form — separate Card so the inputs have room to breathe */}
      {adding && (
        <Card className="border-dashed border-line bg-surface/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-fg">Neuer Teilnehmer</p>
              <p className="text-xs text-fg-muted">
                E-Mail ist Pflicht. Name, Abteilung und Rolle helfen bei der
                Auswertung — sind aber optional.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setNewDraft(EMPTY_DRAFT);
              }}
              disabled={busy === "__new__"}
              aria-label="Abbrechen"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              id="new-email"
              label="E-Mail"
              required
              type="email"
              placeholder={FIELD_PLACEHOLDERS.email}
              value={newDraft.email}
              onChange={(v) => setNewDraft((d) => ({ ...d, email: v }))}
            />
            <Field
              id="new-name"
              label="Name"
              placeholder={FIELD_PLACEHOLDERS.name}
              value={newDraft.name}
              onChange={(v) => setNewDraft((d) => ({ ...d, name: v }))}
            />
            <Field
              id="new-department"
              label="Abteilung"
              placeholder={FIELD_PLACEHOLDERS.department}
              value={newDraft.department}
              onChange={(v) => setNewDraft((d) => ({ ...d, department: v }))}
            />
            <Field
              id="new-role"
              label="Rolle"
              placeholder={FIELD_PLACEHOLDERS.role}
              value={newDraft.role}
              onChange={(v) => setNewDraft((d) => ({ ...d, role: v }))}
            />
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setNewDraft(EMPTY_DRAFT);
              }}
              disabled={busy === "__new__"}
            >
              Abbrechen
            </Button>
            <Button
              size="sm"
              onClick={addRow}
              disabled={busy === "__new__"}
            >
              <UserPlus className="h-4 w-4" />
              Speichern
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <Table className="min-w-[820px]">
          <TableHeader>
            <TableRow className="bg-surface/40 hover:bg-surface/40">
              <TableHead className="min-w-[220px]">E-Mail</TableHead>
              <TableHead className="min-w-[160px]">Name</TableHead>
              <TableHead className="min-w-[160px]">Abteilung</TableHead>
              <TableHead className="min-w-[160px]">Rolle</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
              <TableHead className="w-[280px] text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && !adding && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6}>
                  <EmptyState onAdd={() => setAdding(true)} />
                </TableCell>
              </TableRow>
            )}

            {rows.map((p) => {
              const isEditing = editing === p.id;
              return (
                <TableRow key={p.id} className={isEditing ? "bg-surface/40" : ""}>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="email"
                        className="h-9"
                        value={draft.email}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, email: e.target.value }))
                        }
                      />
                    ) : (
                      <span className="font-mono text-xs text-fg-muted">
                        {p.email}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        className="h-9"
                        value={draft.name}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, name: e.target.value }))
                        }
                      />
                    ) : (
                      <CellText value={p.name} />
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        className="h-9"
                        value={draft.department}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, department: e.target.value }))
                        }
                      />
                    ) : (
                      <CellText value={p.department} />
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        className="h-9"
                        value={draft.role}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, role: e.target.value }))
                        }
                      />
                    ) : (
                      <CellText value={p.role} />
                    )}
                  </TableCell>
                  <TableCell>
                    <ParticipantStatus p={p} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEdit}
                            disabled={busy === p.id}
                          >
                            Abbrechen
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveEdit(p.id)}
                            disabled={busy === p.id}
                          >
                            Speichern
                          </Button>
                        </>
                      ) : (
                        <RowActions
                          p={p}
                          busy={busy === p.id}
                          onEdit={() => startEdit(p)}
                          onInvite={() => inviteRow(p, false)}
                          onResend={() => inviteRow(p, true)}
                          onDelete={() => deleteRow(p)}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  required,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-medium text-fg-muted"
      >
        {label}
        {required && <span className="text-pain">*</span>}
      </label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 text-base md:text-sm"
      />
    </div>
  );
}

function CellText({ value }: { value?: string | null }) {
  if (!value) return <span className="text-fg-subtle">—</span>;
  return <span className="text-fg">{value}</span>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-base font-semibold tabular-nums text-fg">
        {value}
      </span>
      <span className="text-xs text-fg-muted">{label}</span>
    </div>
  );
}

function Divider() {
  return <span aria-hidden="true" className="h-3 w-px bg-line" />;
}

function FlashBanner({
  type,
  message,
}: {
  type: "ok" | "err";
  message: string;
}) {
  const Icon = type === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2.5 rounded-ui border px-3 py-2.5 text-sm",
        type === "ok"
          ? "border-success/30 bg-success-soft text-success"
          : "border-pain/30 bg-pain-soft text-pain",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-snug">{message}</p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="grid size-10 place-items-center rounded-full bg-surface-2 text-fg-muted">
        <UserPlus className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-fg">
          Noch keine Teilnehmer in diesem Audit.
        </p>
        <p className="text-xs text-fg-muted">
          Lege jemanden manuell an oder lade per CSV-Upload beim Erstellen
          mehrere Personen auf einmal hoch.
        </p>
      </div>
      <Button size="sm" variant="accent" onClick={onAdd} className="mt-1">
        <UserPlus className="h-4 w-4" />
        Teilnehmer hinzufügen
      </Button>
    </div>
  );
}

function RowActions({
  p,
  busy,
  onEdit,
  onInvite,
  onResend,
  onDelete,
}: {
  p: Participant;
  busy: boolean;
  onEdit: () => void;
  onInvite: () => void;
  onResend: () => void;
  onDelete: () => void;
}) {
  const tokenUsed = p.token_used ?? false;
  const emailSent = p.email_sent ?? false;
  return (
    <>
      {!emailSent && (
        <Button size="sm" onClick={onInvite} disabled={busy}>
          <Mail className="h-3.5 w-3.5" />
          Einladen
        </Button>
      )}
      {emailSent && !tokenUsed && (
        <Button
          variant="outline"
          size="sm"
          onClick={onResend}
          disabled={busy}
          title="Generiert einen neuen Link und sendet erneut"
        >
          <Send className="h-3.5 w-3.5" />
          Erneut senden
        </Button>
      )}
      {tokenUsed && (
        <Button
          variant="outline"
          size="sm"
          onClick={onResend}
          disabled={busy}
          title="Neuer Link, falls Teilnehmer nochmal teilnehmen soll"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Neuen Link
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={onEdit} disabled={busy}>
        <Pencil className="h-3.5 w-3.5" />
        Bearbeiten
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={busy}
        className="text-fg-muted hover:bg-pain-soft hover:text-pain"
        aria-label={`${p.email} löschen`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </>
  );
}

function ParticipantStatus({ p }: { p: Participant }) {
  switch (p.latest_interview_status) {
    case "COMPLETED":
    case "PROCESSING":
    case "PROCESSED":
      return (
        <Badge className="bg-success-soft text-success border-transparent">
          Abgeschlossen
        </Badge>
      );
    case "IN_PROGRESS":
      return <Badge variant="secondary">Läuft</Badge>;
    case "ABANDONED":
      return (
        <Badge className="bg-pain-soft text-pain border-transparent">
          Abgebrochen
        </Badge>
      );
    case "FAILED":
      return <Badge variant="destructive">Fehler</Badge>;
  }
  if (p.email_sent) {
    return (
      <Badge className="bg-accent-soft text-accent-strong border-accent-muted">
        Eingeladen
      </Badge>
    );
  }
  return <Badge variant="outline">Nicht eingeladen</Badge>;
}

function payloadFrom(d: DraftRow) {
  return {
    email: d.email.trim(),
    name: d.name.trim() || null,
    department: d.department.trim() || null,
    role: d.role.trim() || null,
  };
}

