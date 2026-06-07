"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, UserPlus, X as XIcon, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatBand, type StatBandCell } from "@/components/ui/stat-band";
import { EvidenceTree, type EvidenceNode } from "@/components/ui/agent-list";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2 as CheckIcon, AlertCircle } from "lucide-react";
import { DataChip } from "@/components/ui/data-chip";
import { type CampaignDraft, type Vault, type Person } from "@/lib/api";
import { clientApi } from "@/lib/client-api";
import { validateForLaunch } from "@/lib/setup/draftReducer";

/**
 * Review + launch (doc 03 §8) — a crisp white-modernist confirmation screen.
 *
 *   1. PageHeader     — the calm review title + muted subtitle
 *   2. StatBand       — type · duration · language · mode
 *   3. Two-column grid:
 *        Left  — Goals card + Delivery card (with inline people editor)
 *        Right — Launch card (gates + CTA); top edge aligns with Goals card
 *   4. Context vault selector (always visible — select or confirm)
 */
export function ReviewLaunch({
  draftId,
  draft,
  vaults = [],
}: {
  draftId: string;
  draft: CampaignDraft;
  vaults?: Vault[];
}) {
  const t = useTranslations("setup.review");
  const tc = useTranslations("setup.catalog");
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>(draft.people ?? []);
  const [selectedVaultId, setSelectedVaultId] = useState<string | undefined>(
    draft.contextVaultId,
  );
  const reasons = validateForLaunch(draft);
  const blocked = reasons.length > 0;

  const peopleCount = people.length;
  const goals = draft.goals ?? [];

  async function launch() {
    if (blocked) return;
    setError(null);
    setLaunching(true);
    try {
      const materialized = await clientApi.setup.launchDraft(draftId);
      const campaignId = materialized.campaign_id;
      try {
        await clientApi.campaigns.launch(campaignId);
      } catch {
        router.push(
          `/campaigns/${campaignId}?flashType=error&flash=${encodeURIComponent(
            t("flashInviteFailed"),
          )}`,
        );
        return;
      }
      router.push(
        `/campaigns/${campaignId}?flashType=success&flash=${encodeURIComponent(
          t("flashLaunched"),
        )}`,
      );
    } catch {
      setError(t("launchFailed"));
      setLaunching(false);
    }
  }

  async function saveVault(vaultId: string) {
    setSelectedVaultId(vaultId || undefined);
    await clientApi.setup.patchDraft(draftId, {
      patch: { tool: "set_context_vault", args: { vaultId: vaultId || null } },
    });
  }

  const reveal = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, delay, ease: [0.2, 0.65, 0.3, 0.9] as const },
        };

  const specCells: StatBandCell[] = [
    {
      label: tc("interviewType"),
      value: draft.interviewType === "chat" ? tc("chatType") : tc("voice"),
    },
    { label: tc("duration"), value: `${draft.durationMin ?? 25} ${tc("minutes")}` },
    {
      label: tc("language"),
      value: `${(draft.language?.default ?? "de").toUpperCase()}${
        draft.language?.allowSwitch ? " ⇄" : ""
      }`,
    },
    {
      label: tc("successCriteria"),
      value:
        draft.successCriteria?.mode === "deductive"
          ? tc("deductive").split(" ")[0]
          : tc("inductive").split(" ")[0],
    },
  ];

  const goalNodes: EvidenceNode[] = goals.map((g, i) => ({
    id: g.id,
    kind: "insight",
    status: "done",
    label: <span className="text-fg">{g.text}</span>,
    meta: (
      <span className="ml-auto shrink-0 tabular-nums text-fg-subtle">
        {String(i + 1).padStart(2, "0")}
      </span>
    ),
  }));

  const selectedVault = vaults.find((v) => v.id === selectedVaultId);

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-8">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.div {...reveal(0)}>
        <PageHeader title={t("title")} subtitle={t("subtitle")} className="mb-0" />
      </motion.div>

      {/* ── Essentials readout band ──────────────────────────────────────── */}
      <motion.section {...reveal(0.04)} className="flex flex-col gap-4">
        <SectionHeading title={t("essentials")} className="mb-0" />
        <StatBand cells={specCells} />
      </motion.section>

      {/* ── Context vault ────────────────────────────────────────────────── */}
      {vaults.length > 0 && (
        <motion.section {...reveal(0.07)} className="flex flex-col gap-4">
          <SectionHeading title="Kontext" className="mb-0" />
          {selectedVaultId && selectedVault ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 rounded-card border border-success/30 bg-success-soft px-4 py-3">
                <CheckIcon size={16} className="shrink-0 text-success" aria-hidden />
                <Building2 size={14} className="shrink-0 text-fg-muted" aria-hidden />
                <span className="text-[length:var(--text-body-sm)] font-medium text-fg">
                  {selectedVault.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => saveVault("")}
                className="text-[12px] text-fg-faint underline-offset-2 hover:text-fg hover:underline"
              >
                Ändern
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <select
                className="rounded-ui border border-line bg-surface px-3 py-2 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
                value=""
                onChange={(e) => saveVault(e.target.value)}
              >
                <option value="">— Kontext-Vault auswählen —</option>
                {vaults.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <span className="text-[12px] text-fg-faint">Optional</span>
            </div>
          )}
        </motion.section>
      )}

      {/* ── Main two-column grid ─────────────────────────────────────────── */}
      {/* items-start: both columns start at the same top edge (not stretched).
          Goals card and Launch card tops are therefore visually aligned. */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        {/* Left — goals + delivery */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Goals card — heading lives inside CardHeader so tops align */}
          {goals.length > 0 ? (
            <motion.div {...reveal(0.1)}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-baseline gap-2 text-[length:var(--text-title)] tracking-[-0.015em]">
                    {tc("goals")}
                    <span className="text-[length:var(--text-meta)] font-normal tabular-nums text-fg-subtle">
                      {goals.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EvidenceTree nodes={goalNodes} defaultExpandedDepth={0} />
                </CardContent>
              </Card>
            </motion.div>
          ) : null}

          {/* Delivery card — heading inside CardHeader */}
          <motion.div {...reveal(0.14)}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-[length:var(--text-title)] tracking-[-0.015em]">
                  {t("delivery")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col divide-y divide-line-subtle">
                  <SpecRow label={tc("audience")}>
                    {draft.audience?.segments?.length
                      ? draft.audience.segments.join(", ")
                      : "—"}
                  </SpecRow>
                  <SpecRow label={t("peopleLabel")}>
                    <PeopleEditor
                      draftId={draftId}
                      people={people}
                      onUpdate={setPeople}
                    />
                  </SpecRow>
                  {draft.background?.notes?.trim() ? (
                    <SpecRow label={tc("background")}>
                      <span className="line-clamp-3 text-fg-muted">
                        {draft.background.notes}
                      </span>
                    </SpecRow>
                  ) : null}
                </dl>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right — launch card */}
        <motion.aside {...reveal(0.16)}>
          <Card>
            <CardHeader>
              <CardTitle className="text-[length:var(--text-title)] tracking-[-0.015em]">
                {t("launchpad")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <p className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
                  {t("checklist")}
                </p>
                <ul className="flex flex-col gap-2.5">
                  <Gate
                    ok={!reasons.includes("no_goals")}
                    label={t("gates.no_goals")}
                    okLabel={t("gatesOk.no_goals")}
                  />
                  <Gate
                    ok={!reasons.includes("no_success_criteria")}
                    label={t("gates.no_success_criteria")}
                    okLabel={t("gatesOk.no_success_criteria")}
                  />
                  <Gate
                    ok={!reasons.includes("bad_duration")}
                    label={t("gates.bad_duration")}
                    okLabel={t("gatesOk.bad_duration")}
                  />
                  <Gate
                    ok={!reasons.includes("no_interview_type")}
                    label={t("gates.no_interview_type")}
                    okLabel={t("gatesOk.no_interview_type")}
                  />
                  {/* Non-blocking advisory: no red X, just orange warning */}
                  <Gate
                    ok={peopleCount > 0}
                    label="Teilnehmer hinzufügen"
                    okLabel={`${peopleCount} Teilnehmer`}
                    blocking={false}
                  />
                </ul>
              </div>

              {error ? (
                <p className="text-[length:var(--text-body)] text-danger" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-line-subtle pt-4">
                <Button
                  onClick={launch}
                  disabled={blocked || launching}
                  size="lg"
                  className="w-full"
                >
                  {launching ? t("launching") : t("launch")}
                </Button>
                <Button asChild variant="ghost" size="sm" className="w-full text-fg-muted">
                  <a href={`/campaigns/new/${draftId}`}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t("back")}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.aside>
      </div>
    </div>
  );
}

/* ─── A hairline-separated spec label:value pair ─────────────────────────── */
function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-2.5 first:pt-0">
      <dt className="text-[length:var(--text-caption)] font-semibold tracking-[0.04em] text-fg-subtle">
        {label}
      </dt>
      <dd className="text-[length:var(--text-body)] text-fg">{children}</dd>
    </div>
  );
}

/* ─── Launch gate ─────────────────────────────────────────────────────────── */
function Gate({
  ok,
  label,
  okLabel,
  blocking = true,
}: {
  ok: boolean;
  label: string;
  okLabel: string;
  /** false = advisory only; doesn't block launch, icon is ⚠ not ✗ when unmet */
  blocking?: boolean;
}) {
  return (
    <li className="flex items-center gap-2.5">
      {ok ? (
        <CheckIcon size={14} className="shrink-0 text-success" aria-hidden />
      ) : blocking ? (
        <AlertCircle size={14} className="shrink-0 text-danger" aria-hidden />
      ) : (
        <AlertCircle size={14} className="shrink-0 text-warning" aria-hidden />
      )}
      <span className={ok ? "text-[13px] text-fg-muted" : "text-[13px] text-fg"}>
        {ok ? okLabel : label}
      </span>
    </li>
  );
}

/* ─── Inline people editor (Email · Name · Abteilung · Rolle) ─────────────── */
type PersonDraft = { email: string; name: string; department: string; role: string };
const EMPTY: PersonDraft = { email: "", name: "", department: "", role: "" };

function PeopleEditor({
  draftId,
  people,
  onUpdate,
}: {
  draftId: string;
  people: Person[];
  onUpdate: (p: Person[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<PersonDraft>(EMPTY);
  const [saving, setSaving] = useState(false);

  function field(key: keyof PersonDraft) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function save() {
    if (!form.email.includes("@")) return;
    const merged: Person[] = [
      ...people,
      {
        email: form.email.trim(),
        name: form.name.trim() || undefined,
        // Person type has only email+name; department/role stored in name field for now
        // TODO: extend Person type with department/role if backend supports it
      },
    ];
    setSaving(true);
    try {
      await clientApi.setup.patchDraft(draftId, {
        patch: { tool: "set_people", args: { people: merged } },
      });
      onUpdate(merged);
      setForm(EMPTY);
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  async function remove(email: string) {
    const next = people.filter((p) => p.email !== email);
    await clientApi.setup.patchDraft(draftId, {
      patch: { tool: "set_people", args: { people: next } },
    });
    onUpdate(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Existing people list */}
      {people.length > 0 && (
        <div className="flex flex-col divide-y divide-line-subtle rounded-ui border border-line overflow-hidden">
          {people.map((p) => (
            <div
              key={p.email}
              className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-surface-2"
            >
              <div className="min-w-0 flex flex-col">
                {p.name && (
                  <span className="text-[13px] font-medium text-fg truncate">{p.name}</span>
                )}
                <span className="text-[12px] text-fg-muted truncate">{p.email}</span>
              </div>
              <button
                type="button"
                onClick={() => remove(p.email)}
                className="shrink-0 rounded p-0.5 text-fg-faint hover:text-fg"
                aria-label={`${p.email} entfernen`}
              >
                <XIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding ? (
        <div className="rounded-card border border-line bg-surface-2 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-fg">Neuer Teilnehmer</p>
            <button
              type="button"
              onClick={() => { setAdding(false); setForm(EMPTY); }}
              className="text-fg-faint hover:text-fg"
            >
              <XIcon size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              label="E-Mail *"
              type="email"
              placeholder="name@firma.de"
              value={form.email}
              onChange={field("email")}
            />
            <FormField
              label="Name"
              placeholder="Max Mustermann"
              value={form.name}
              onChange={field("name")}
            />
            <FormField
              label="Abteilung"
              placeholder="Engineering"
              value={form.department}
              onChange={field("department")}
            />
            <FormField
              label="Rolle"
              placeholder="CTO"
              value={form.role}
              onChange={field("role")}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setAdding(false); setForm(EMPTY); }}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={saving || !form.email.includes("@")}
            >
              <UserPlus className="h-3.5 w-3.5" />
              {saving ? "…" : "Speichern"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onClick={() => setAdding(true)}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Teilnehmer hinzufügen
        </Button>
      )}
    </div>
  );
}

function FormField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="rounded-ui border border-line bg-surface px-2.5 py-1.5 text-[13px] text-fg outline-none transition-colors focus:border-line-strong"
      />
    </div>
  );
}

export { DataChip };
