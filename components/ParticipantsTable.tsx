"use client";

import { useState } from "react";
import { Pencil, Send, Trash2, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function ParticipantsTable({ campaignId, initial }: Props) {
  const [rows, setRows] = useState<Participant[]>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRow>(EMPTY_DRAFT);
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<DraftRow>(EMPTY_DRAFT);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ type: "ok" | "err"; message: string } | null>(null);

  function flashOk(msg: string) {
    setFlash({ type: "ok", message: msg });
    setTimeout(() => setFlash(null), 4000);
  }
  function flashErr(msg: string) {
    setFlash({ type: "err", message: msg });
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
    <>
      {flash && (
        <div
          className={`flash ${flash.type === "ok" ? "flash--ok" : "flash--err"} mb-4`}
        >
          {flash.message}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-fg-muted">
          {rows.length} {rows.length === 1 ? "Teilnehmer" : "Teilnehmer"}
        </span>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <UserPlus className="h-4 w-4" />
            Teilnehmer hinzufügen
          </Button>
        )}
      </div>

      <div className="card card--flush overflow-hidden">
        <div className="-webkit-overflow-scrolling-touch w-full overflow-x-auto">
          <table className="table" style={{ minWidth: 880 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 120 }}>Anon-ID</th>
                <th style={{ minWidth: 200 }}>E-Mail</th>
                <th style={{ minWidth: 140 }}>Name</th>
                <th style={{ minWidth: 140 }}>Abteilung</th>
                <th style={{ minWidth: 140 }}>Rolle</th>
                <th style={{ minWidth: 140 }}>Status</th>
                <th className="table__actions" style={{ minWidth: 240 }}>
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody>
              {adding && (
                <tr style={{ background: "var(--color-surface)" }}>
                  <td className="text-fg-subtle">—</td>
                  <td>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      className="h-9"
                      value={newDraft.email}
                      onChange={(e) =>
                        setNewDraft((d) => ({ ...d, email: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <Input
                      placeholder="Name"
                      className="h-9"
                      value={newDraft.name}
                      onChange={(e) =>
                        setNewDraft((d) => ({ ...d, name: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <Input
                      placeholder="Abteilung"
                      className="h-9"
                      value={newDraft.department}
                      onChange={(e) =>
                        setNewDraft((d) => ({ ...d, department: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <Input
                      placeholder="Rolle"
                      className="h-9"
                      value={newDraft.role}
                      onChange={(e) =>
                        setNewDraft((d) => ({ ...d, role: e.target.value }))
                      }
                    />
                  </td>
                  <td className="text-fg-subtle">—</td>
                  <td className="table__actions">
                    <Button
                      variant="outline"
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
                      Speichern
                    </Button>
                  </td>
                </tr>
              )}

              {rows.length === 0 && !adding && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <p className="empty-state__title">
                        Noch keine Teilnehmer in diesem Audit.
                      </p>
                      <p>
                        Füge welche per Knopfdruck hinzu — oder per CSV-Upload beim
                        Erstellen.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {rows.map((p) => {
                const isEditing = editing === p.id;
                return (
                  <tr key={p.id}>
                    <td>
                      <span className="mono font-medium text-fg">{p.anon_id}</span>
                    </td>
                    <td>
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
                        <span className="mono text-fg-muted">{p.email}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <Input
                          className="h-9"
                          value={draft.name}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, name: e.target.value }))
                          }
                        />
                      ) : (
                        p.name ?? "—"
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <Input
                          className="h-9"
                          value={draft.department}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, department: e.target.value }))
                          }
                        />
                      ) : (
                        p.department ?? "—"
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <Input
                          className="h-9"
                          value={draft.role}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, role: e.target.value }))
                          }
                        />
                      ) : (
                        p.role ?? "—"
                      )}
                    </td>
                    <td>
                      <ParticipantStatus p={p} />
                    </td>
                    <td className="table__actions">
                      {isEditing ? (
                        <>
                          <Button
                            variant="outline"
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
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
          <Send className="h-3.5 w-3.5" />
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
          <Send className="h-3.5 w-3.5" />
          Neuen Link
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onEdit} disabled={busy}>
        <Pencil className="h-3.5 w-3.5" />
        Bearbeiten
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={busy}
        className="hover:bg-pain-soft hover:text-pain"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span className="sr-only">Löschen</span>
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
