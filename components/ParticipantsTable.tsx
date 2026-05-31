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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatBand } from "@/components/ui/stat-band";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";
import { EmptyState as EmptyStateCard } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusDisc, toStatusState } from "@/components/ui/status-disc";
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
    <div className="space-y-6">
      {/* Metric band — the white-modernist readout. */}
      <StatBand
        cells={[
          { label: "Teilnehmer", value: counts.total },
          { label: "Eingeladen", value: counts.invited },
          { label: "Abgeschlossen", value: counts.completed },
        ]}
      />

      {/* Section heading + add action */}
      <SectionHeading
        title="Teilnehmer"
        count={counts.total}
        action={
          !adding ? (
            <Button size="sm" onClick={() => setAdding(true)}>
              <UserPlus className="h-4 w-4" />
              Teilnehmer hinzufügen
            </Button>
          ) : undefined
        }
      />

      {/* Flash banner */}
      {flash && <FlashBanner type={flash.type} message={flash.message} />}

      {/* Inline create form — its own card so the inputs have room to breathe */}
      {adding && (
        <Card className="gap-0 p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Button size="sm" onClick={addRow} disabled={busy === "__new__"}>
              <UserPlus className="h-4 w-4" />
              Speichern
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      {rows.length === 0 && !adding ? (
        <EmptyStateCard
          icon={UserPlus}
          title="Noch keine Teilnehmer in dieser Kampagne"
          hint="Lege jemanden manuell an oder lade per CSV-Upload beim Erstellen mehrere Personen auf einmal hoch."
          action={
            <Button size="sm" onClick={() => setAdding(true)}>
              <UserPlus className="h-4 w-4" />
              Teilnehmer hinzufügen
            </Button>
          }
        />
      ) : (
        <Card variant="ledger" className="overflow-hidden">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[28px]" aria-label="Status" />
                <TableHead className="min-w-[220px]">E-Mail</TableHead>
                <TableHead className="min-w-[160px]">Name</TableHead>
                <TableHead className="min-w-[160px]">Abteilung</TableHead>
                <TableHead className="min-w-[160px]">Rolle</TableHead>
                <TableHead className="w-[150px]">Status</TableHead>
                <TableHead className="w-[280px] text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const isEditing = editing === p.id;
                const discState = participantDiscState(p);
                return (
                  <TableRow
                    key={p.id}
                    className={cn(
                      "border-line-subtle",
                      isEditing && "bg-surface-2",
                    )}
                  >
                    <TableCell className="py-4">
                      <StatusDisc
                        state={discState}
                        pulse={discState === "live"}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell mono={!isEditing} className="py-4">
                      {isEditing ? (
                        <Input
                          type="email"
                          className="h-8 text-[length:var(--text-body-sm)]"
                          value={draft.email}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, email: e.target.value }))
                          }
                        />
                      ) : (
                        <span className="text-fg-muted">{p.email}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      {isEditing ? (
                        <Input
                          className="h-8 text-[length:var(--text-body-sm)]"
                          value={draft.name}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, name: e.target.value }))
                          }
                        />
                      ) : (
                        <CellText value={p.name} />
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      {isEditing ? (
                        <Input
                          className="h-8 text-[length:var(--text-body-sm)]"
                          value={draft.department}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              department: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        <CellText value={p.department} />
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      {isEditing ? (
                        <Input
                          className="h-8 text-[length:var(--text-body-sm)]"
                          value={draft.role}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, role: e.target.value }))
                          }
                        />
                      ) : (
                        <CellText value={p.role} />
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <ParticipantStatus p={p} />
                    </TableCell>
                    <TableCell className="py-4 text-right">
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
      )}
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
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-muted"
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
      />
    </div>
  );
}

function CellText({ value }: { value?: string | null }) {
  if (!value) return <span className="text-fg-subtle">—</span>;
  return <span className="text-fg">{value}</span>;
}

/** Map a participant's lifecycle to the canonical status-disc spine state. */
function participantDiscState(p: Participant): ReturnType<typeof toStatusState> {
  if (p.latest_interview_status) {
    return toStatusState(p.latest_interview_status);
  }
  return p.email_sent ? "pending" : "idle";
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
        "flex items-start gap-2.5 rounded-ui border px-3.5 py-2.5 text-sm",
        type === "ok"
          ? "border-success/30 bg-success-soft text-success"
          : "border-pain-muted bg-pain-soft text-pain",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-snug">{message}</p>
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
      return <span className="badge badge--success">Abgeschlossen</span>;
    case "IN_PROGRESS":
      return (
        <span className="badge badge--live">
          <span
            aria-hidden="true"
            className="status-disc status-disc--sm status-disc--live status-disc--pulse"
          />
          Läuft
        </span>
      );
    case "ABANDONED":
      return <span className="badge badge--warning">Abgebrochen</span>;
    case "FAILED":
      return <span className="badge badge--danger">Fehler</span>;
  }
  if (p.email_sent) {
    return <span className="badge badge--opportunity">Eingeladen</span>;
  }
  return <span className="badge badge--knowledge">Nicht eingeladen</span>;
}

function payloadFrom(d: DraftRow) {
  return {
    email: d.email.trim(),
    name: d.name.trim() || null,
    department: d.department.trim() || null,
    role: d.role.trim() || null,
  };
}
