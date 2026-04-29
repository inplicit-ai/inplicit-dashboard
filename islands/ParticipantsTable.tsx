import { useState } from "preact/hooks";
import type { Participant } from "../lib/api.ts";

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

export default function ParticipantsTable({ campaignId, initial }: Props) {
  const [rows, setRows] = useState<Participant[]>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRow>(EMPTY_DRAFT);
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<DraftRow>(EMPTY_DRAFT);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<
    { type: "ok" | "err"; message: string } | null
  >(null);

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
        const j = await res.json();
        detail = j.error ?? JSON.stringify(j);
      } catch {
        detail = await res.text();
      }
      throw new Error(detail || `HTTP ${res.status}`);
    }
    return await res.json();
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
        flashOk(`Resend nicht konfiguriert. Dev-Link in der Konsole geloggt für ${p.email}.`);
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
          class={`flash ${flash.type === "ok" ? "flash--ok" : "flash--err"} pt-flash`}
        >
          {flash.message}
        </div>
      )}

      <div class="pt-toolbar">
        <span class="meta">
          {rows.length} {rows.length === 1 ? "Teilnehmer" : "Teilnehmer"}
        </span>
        {!adding && (
          <button
            type="button"
            class="btn btn--primary btn--sm"
            onClick={() => setAdding(true)}
          >
            Teilnehmer hinzufügen
          </button>
        )}
      </div>

      <div class="card card--flush pt-card">
        <div class="pt-scroll">
          <table class="table pt-table">
            <thead>
              <tr>
                <th class="pt-th-anon">Anon-ID</th>
                <th class="pt-th-email">E-Mail</th>
                <th class="pt-th-name">Name</th>
                <th class="pt-th-dept">Abteilung</th>
                <th class="pt-th-role">Rolle</th>
                <th class="pt-th-status">Status</th>
                <th class="table__actions pt-th-actions">Aktionen</th>
              </tr>
            </thead>
          <tbody>
            {adding && (
              <tr class="pt-row pt-row--draft">
                <td class="text-tertiary">—</td>
                <td>
                  <input
                    class="input input--inline"
                    type="email"
                    placeholder="email@example.com"
                    value={newDraft.email}
                    onInput={(e) =>
                      setNewDraft((d) => ({ ...d, email: (e.target as HTMLInputElement).value }))}
                  />
                </td>
                <td>
                  <input
                    class="input input--inline"
                    placeholder="Name"
                    value={newDraft.name}
                    onInput={(e) =>
                      setNewDraft((d) => ({ ...d, name: (e.target as HTMLInputElement).value }))}
                  />
                </td>
                <td>
                  <input
                    class="input input--inline"
                    placeholder="Abteilung"
                    value={newDraft.department}
                    onInput={(e) =>
                      setNewDraft((d) => ({ ...d, department: (e.target as HTMLInputElement).value }))}
                  />
                </td>
                <td>
                  <input
                    class="input input--inline"
                    placeholder="Rolle"
                    value={newDraft.role}
                    onInput={(e) =>
                      setNewDraft((d) => ({ ...d, role: (e.target as HTMLInputElement).value }))}
                  />
                </td>
                <td class="text-tertiary">—</td>
                <td class="table__actions">
                  <button
                    type="button"
                    class="btn btn--ghost btn--sm"
                    onClick={() => { setAdding(false); setNewDraft(EMPTY_DRAFT); }}
                    disabled={busy === "__new__"}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    class="btn btn--primary btn--sm"
                    onClick={addRow}
                    disabled={busy === "__new__"}
                  >
                    Speichern
                  </button>
                </td>
              </tr>
            )}

            {rows.length === 0 && !adding && (
              <tr>
                <td colSpan={7}>
                  <div class="empty-state">
                    <p class="empty-state__title">Noch keine Teilnehmer in dieser Kampagne.</p>
                    <p>Füge welche per Knopfdruck hinzu — oder per CSV-Upload beim Erstellen.</p>
                  </div>
                </td>
              </tr>
            )}

            {rows.map((p) => {
              const isEditing = editing === p.id;
              return (
                <tr key={p.id}>
                  <td class="pt-anon">
                    <span class="mono">{p.anon_id}</span>
                  </td>
                  <td>
                    {isEditing
                      ? (
                        <input
                          class="input input--inline"
                          type="email"
                          value={draft.email}
                          onInput={(e) =>
                            setDraft((d) => ({ ...d, email: (e.target as HTMLInputElement).value }))}
                        />
                      )
                      : <span class="mono text-secondary">{p.email}</span>}
                  </td>
                  <td>
                    {isEditing
                      ? (
                        <input
                          class="input input--inline"
                          value={draft.name}
                          onInput={(e) =>
                            setDraft((d) => ({ ...d, name: (e.target as HTMLInputElement).value }))}
                        />
                      )
                      : (p.name ?? "—")}
                  </td>
                  <td>
                    {isEditing
                      ? (
                        <input
                          class="input input--inline"
                          value={draft.department}
                          onInput={(e) =>
                            setDraft((d) => ({ ...d, department: (e.target as HTMLInputElement).value }))}
                        />
                      )
                      : (p.department ?? "—")}
                  </td>
                  <td>
                    {isEditing
                      ? (
                        <input
                          class="input input--inline"
                          value={draft.role}
                          onInput={(e) =>
                            setDraft((d) => ({ ...d, role: (e.target as HTMLInputElement).value }))}
                        />
                      )
                      : (p.role ?? "—")}
                  </td>
                  <td><ParticipantStatus p={p} /></td>
                  <td class="table__actions">
                    {isEditing
                      ? (
                        <>
                          <button
                            type="button"
                            class="btn btn--ghost btn--sm"
                            onClick={cancelEdit}
                            disabled={busy === p.id}
                          >
                            Abbrechen
                          </button>
                          <button
                            type="button"
                            class="btn btn--primary btn--sm"
                            onClick={() => saveEdit(p.id)}
                            disabled={busy === p.id}
                          >
                            Speichern
                          </button>
                        </>
                      )
                      : (
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

      <style>{`
        .pt-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-4);
        }
        .pt-flash { margin-bottom: var(--space-4); }
        .pt-row--draft td { background: var(--color-surface); }

        /* Container holds the rounded edges; inner wrapper handles overflow. */
        .pt-card { overflow: hidden; }
        .pt-scroll {
          width: 100%;
          overflow-x: auto;
          /* Smoother momentum scroll on iOS */
          -webkit-overflow-scrolling: touch;
        }

        /* Forces the table to keep its full width — the wrapper scrolls,
           the cells don't squish. Means anon-id and role stay readable. */
        .pt-table { min-width: 880px; }

        .pt-anon .mono {
          color: var(--color-text-primary);
          font-weight: 500;
        }

        /* Soft column-width hints so common content doesn't get clipped. */
        .pt-th-anon    { min-width: 120px; }
        .pt-th-email   { min-width: 200px; }
        .pt-th-name    { min-width: 140px; }
        .pt-th-dept    { min-width: 140px; }
        .pt-th-role    { min-width: 140px; }
        .pt-th-status  { min-width: 140px; }
        .pt-th-actions { min-width: 220px; }
      `}</style>
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
        <button
          type="button"
          class="btn btn--primary btn--sm"
          onClick={onInvite}
          disabled={busy}
        >
          Einladen
        </button>
      )}
      {emailSent && !tokenUsed && (
        <button
          type="button"
          class="btn btn--ghost btn--sm"
          onClick={onResend}
          disabled={busy}
          title="Generiert einen neuen Link und sendet erneut"
        >
          Erneut senden
        </button>
      )}
      {tokenUsed && (
        <button
          type="button"
          class="btn btn--ghost btn--sm"
          onClick={onResend}
          disabled={busy}
          title="Neuer Link, falls Teilnehmer nochmal teilnehmen soll"
        >
          Neuen Link senden
        </button>
      )}
      <button
        type="button"
        class="btn btn--ghost btn--sm"
        onClick={onEdit}
        disabled={busy}
      >
        Bearbeiten
      </button>
      <button
        type="button"
        class="btn btn--danger btn--sm"
        onClick={onDelete}
        disabled={busy}
      >
        Löschen
      </button>
    </>
  );
}

function ParticipantStatus({ p }: { p: Participant }) {
  if (p.token_used) return <span class="badge badge--knowledge">Interview gestartet</span>;
  if (p.email_sent) return <span class="badge badge--opportunity">Eingeladen</span>;
  return <span class="badge">Nicht eingeladen</span>;
}

function payloadFrom(d: DraftRow) {
  return {
    email: d.email.trim(),
    name: d.name.trim() || null,
    department: d.department.trim() || null,
    role: d.role.trim() || null,
  };
}
